import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { AccountStatus, LogType } from '@prisma/client'
import { scrapeXProfile } from '@/services/monitor/scraper'

// Prevent API timeout in Next.js
export const maxDuration = 120 // 2 minutes

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  console.log(`Add session requested by user ${userId}`)

  // Try parsing request body for manual input
  let body: any = null
  try {
    body = await request.json()
  } catch (e) {
    // No body or invalid JSON, will fall back to headed browser
  }

  // Handle Manual Cookie Import (auth_token and ct0)
  if (body && body.username && body.authToken) {
    const username = body.username.trim().replace(/^@/, '')
    const authToken = body.authToken.trim()
    const ct0 = body.ct0?.trim() || 'csrf_default_ct0_value'

    console.log(`Manual cookie import requested for @${username}`)

    try {
      // 1. Construct storageState object
      const storageState = {
        cookies: [
          {
            name: 'auth_token',
            value: authToken,
            domain: '.x.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
            httpOnly: true,
            secure: true,
            sameSite: 'None',
          },
          {
            name: 'ct0',
            value: ct0,
            domain: '.x.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
            httpOnly: false,
            secure: true,
            sameSite: 'None',
          },
        ],
        origins: [
          {
            origin: 'https://x.com',
            localStorage: [],
          },
        ],
      }

      const storageStateString = JSON.stringify(storageState)
      const encryptedState = encrypt(storageStateString)
      const storageStatePath = path.join('storage-states', `${username}.json`)

      // Test the session validity by calling the scraper immediately
      console.log(`Verifying cookie credentials for @${username}...`)
      let scraped
      try {
        scraped = await scrapeXProfile(username, encryptedState)
      } catch (scrapeErr: any) {
        // Scrape failed! Create/update the account with ERROR status so we have a record
        const account = await prisma.account.upsert({
          where: {
            userId_username: {
              userId,
              username,
            },
          },
          update: {
            status: AccountStatus.ERROR,
            storageStateData: encryptedState,
          },
          create: {
            userId,
            username,
            displayName: username,
            status: AccountStatus.ERROR,
            storageStatePath,
            storageStateData: encryptedState,
          },
        })

        // Log the failure to the DB with the screenshot/details!
        await prisma.monitorLog.create({
          data: {
            accountId: account.id,
            type: LogType.ERROR,
            message: `Failed to import account @${username}. Error: ${scrapeErr?.message || 'Unknown error'}`,
            details: scrapeErr?.screenshot || scrapeErr?.stack || String(scrapeErr),
          },
        })

        throw scrapeErr
      }
      
      // If we got here, it succeeded! Save to file
      const statesDir = path.join(process.cwd(), 'storage-states')
      if (!fs.existsSync(statesDir)) {
        fs.mkdirSync(statesDir, { recursive: true })
      }
      fs.writeFileSync(path.join(process.cwd(), storageStatePath), encryptedState, 'utf8')

      // Create or update Account record in DB
      const account = await prisma.account.upsert({
        where: {
          userId_username: {
            userId,
            username,
          },
        },
        update: {
          displayName: scraped.displayName || username,
          profileImage: scraped.profileImage,
          bio: scraped.bio,
          verified: scraped.verified,
          storageStatePath,
          storageStateData: encryptedState,
          status: AccountStatus.ACTIVE,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          username,
          displayName: scraped.displayName || username,
          profileImage: scraped.profileImage,
          bio: scraped.bio,
          verified: scraped.verified,
          storageStatePath,
          storageStateData: encryptedState,
          status: AccountStatus.ACTIVE,
          lastSyncAt: new Date(),
        },
      })

      // Create initial snapshot
      await prisma.accountSnapshot.create({
        data: {
          accountId: account.id,
          followers: scraped.followers,
          following: scraped.following,
          posts: scraped.posts,
          likes: 0,
          capturedAt: new Date(),
        },
      })

      // Log the account addition
      await prisma.monitorLog.create({
        data: {
          accountId: account.id,
          type: LogType.INFO,
          message: `Account @${username} was added manually via Cookie Import.`,
        },
      })

      return NextResponse.json({ success: true, account })
    } catch (err: any) {
      console.error('Manual cookie validation failed:', err)
      return NextResponse.json(
        { error: err?.message || 'Failed to validate Twitter cookies. Please check your auth_token.' },
        { status: 400 }
      )
    }
  }

  // Fallback: Launch a headed chromium browser so the user can interactively login
  let browser: any = null
  try {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--window-size=600,800'
      ],
    })

    const context = await browser.newContext({
      viewport: { width: 500, height: 700 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()
    
    // Navigate to X login
    await page.goto('https://x.com/i/flow/login')

    console.log('Opened X login page, waiting for user to authenticate...')

    // Poll URL and login state for up to 90 seconds
    const maxPollTime = 90000 // 90 seconds
    const interval = 1500 // check every 1.5s
    let elapsed = 0
    let authenticated = false
    let username = ''

    while (elapsed < maxPollTime) {
      if (page.isClosed()) {
        throw new Error('BROWSER_CLOSED: Login window was closed before completion.')
      }

      const currentUrl = page.url()
      
      // If URL changes to /home or has logged in indicators
      if (currentUrl.includes('x.com/home') || currentUrl.includes('twitter.com/home')) {
        console.log('Login redirect detected! Extracting username...')
        
        // Wait a moment for cookies to fully settle
        await page.waitForTimeout(3000)

        // Find the profile link which has the username: e.g. a[data-testid="AppTabBar_Profile_Link"]
        try {
          await page.waitForSelector('a[data-testid="AppTabBar_Profile_Link"]', { timeout: 10000 })
          const href = await page.locator('a[data-testid="AppTabBar_Profile_Link"]').getAttribute('href')
          // href should be /username
          if (href && href.startsWith('/')) {
            username = href.replace('/', '')
            authenticated = true
            break
          }
        } catch (e) {
          console.warn('Profile selector not found yet, trying alternative cookies check...')
        }
      }

      await page.waitForTimeout(interval)
      elapsed += interval
    }

    if (!authenticated || !username) {
      throw new Error('TIMEOUT: Login process timed out or username could not be determined.')
    }

    console.log(`Successfully authenticated account: @${username}`)

    // Save storageState
    const rawStorageState = await context.storageState()
    const storageStateString = JSON.stringify(rawStorageState)
    
    // Encrypt the storageState
    const encryptedState = encrypt(storageStateString)

    // Save to file
    const statesDir = path.join(process.cwd(), 'storage-states')
    if (!fs.existsSync(statesDir)) {
      fs.mkdirSync(statesDir, { recursive: true })
    }
    const storageStatePath = path.join('storage-states', `${username}.json`)
    fs.writeFileSync(path.join(process.cwd(), storageStatePath), encryptedState, 'utf8')

    // Retrieve display name and profile image from the page
    let displayName = username
    let profileImage = null

    try {
      // Navigate to user profile to scrape basic info immediately
      await page.goto(`https://x.com/${username}`)
      await page.waitForSelector('div[data-testid="UserName"]', { timeout: 10000 })
      
      displayName = await page.locator('div[data-testid="UserName"] span').first().innerText()
      
      const avatarLocator = page.locator('div[data-testid="primaryColumn"] img[src*="profile_images"]')
      profileImage = await avatarLocator.first().getAttribute('src')
    } catch (err) {
      console.warn('Could not scrape additional profile details during add-session', err)
    }

    // Create or update Account record in DB
    const account = await prisma.account.upsert({
      where: {
        userId_username: {
          userId,
          username,
        },
      },
      update: {
        displayName,
        profileImage,
        storageStatePath,
        storageStateData: encryptedState,
        status: AccountStatus.ACTIVE,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        username,
        displayName,
        profileImage,
        storageStatePath,
        storageStateData: encryptedState,
        status: AccountStatus.ACTIVE,
        lastSyncAt: new Date(),
      },
    })

    // Create an initial snapshot with 0s (will be synced shortly)
    await prisma.accountSnapshot.create({
      data: {
        accountId: account.id,
        followers: 0,
        following: 0,
        posts: 0,
        likes: 0,
        capturedAt: new Date(),
      },
    })

    // Log the account addition
    await prisma.monitorLog.create({
      data: {
        accountId: account.id,
        type: LogType.INFO,
        message: `Account @${username} was added to dashboard.`,
      },
    })

    return NextResponse.json({ success: true, account })
  } catch (error: any) {
    console.error('Add session failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to authenticate account.' },
      { status: 500 }
    )
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        // ignore
      }
    }
  }
}
