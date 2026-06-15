import { chromium, BrowserContext, Page } from 'playwright'
import fs from 'fs'
import path from 'path'
import { decrypt } from '@/lib/encryption'

export class ScraperError extends Error {
  screenshot?: string // base64 string
  constructor(message: string, screenshot?: string) {
    super(message)
    this.name = 'ScraperError'
    this.screenshot = screenshot
  }
}

export interface ScrapedData {
  username: string
  displayName: string | null
  profileImage: string | null
  bio: string | null
  verified: boolean
  followers: number
  following: number
  posts: number
  joinDate: Date | null
  profileUrl: string
}

/**
 * Normalizes number strings from X (e.g. "12.5K" -> 12500, "1.2M" -> 1200000, "3,500" -> 3500)
 */
export function parseXNumber(text: string): number {
  const clean = text.replace(/,/g, '').trim().toUpperCase()
  if (clean.includes('M')) {
    return Math.round(parseFloat(clean.replace('M', '')) * 1_000_000)
  }
  if (clean.includes('K')) {
    return Math.round(parseFloat(clean.replace('K', '')) * 1_000)
  }
  const parsed = parseInt(clean, 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Scrapes X.com profile data for a specific username using the provided storageState JSON string.
 */
export async function scrapeXProfile(
  username: string,
  encryptedStorageState: string | null
): Promise<ScrapedData> {
  const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false'
  
  // Set up temporary directory for decrypted storage state if available
  let tempStatePath: string | null = null
  if (encryptedStorageState) {
    const decryptedState = decrypt(encryptedStorageState)
    const tempDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    tempStatePath = path.join(tempDir, `state-${username}-${Date.now()}.json`)
    fs.writeFileSync(tempStatePath, decryptedState, 'utf8')
  }

  // Launch browser
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
    ],
  })

  let context: BrowserContext
  
  try {
    if (tempStatePath) {
      context = await browser.newContext({
        storageState: tempStatePath,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      })
    } else {
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      })
    }

    const page = await context.newPage()
    
    // Set timeout to 30 seconds
    page.setDefaultTimeout(30000)

    try {
      const profileUrl = `https://x.com/${username}`
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded' })
      
      // Wait for the main profile page content to load
      // Test for data-testid="UserName" which indicates the page loaded
      try {
        await page.waitForSelector('div[data-testid="UserName"]', { timeout: 15000 })
    } catch (e) {
      // If UserName testid is not present, check if we're redirected to login page (auth expired)
      const currentUrl = page.url()
      if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
        throw new Error('SESSION_EXPIRED: Redirected to login page. Session cookies are no longer valid.')
      }
      throw new Error(`PAGE_LOAD_FAILED: Failed to load profile page of @${username}. URL: ${currentUrl}`)
    }

    // Give a short delay for dynamic content
    await page.waitForTimeout(2000)

    // 1. Scraping Display Name
    let displayName: string | null = null
    try {
      displayName = await page.locator('div[data-testid="UserName"] span').first().innerText()
    } catch (e) {
      console.warn(`Failed to scrape Display Name for @${username}`)
    }

    // 2. Scraping Bio
    let bio: string | null = null
    try {
      bio = await page.locator('div[data-testid="UserDescription"]').innerText()
    } catch (e) {
      // Bio is optional on X, might not be set
    }

    // 3. Scraping Profile Image
    let profileImage: string | null = null
    try {
      const avatarLocator = page.locator('div[data-testid="primaryColumn"] img[src*="profile_images"]')
      profileImage = await avatarLocator.first().getAttribute('src')
    } catch (e) {
      console.warn(`Failed to scrape Profile Image for @${username}`)
    }

    // 4. Scraping Verified Status
    let verified = false
    try {
      // Look for Blue Badge / Verified Icon
      const verifiedBadge = page.locator('div[data-testid="UserName"] svg[aria-label="Verified account"]')
      verified = (await verifiedBadge.count()) > 0
    } catch (e) {
      // Not verified or element not found
    }

    // 5. Scraping Join Date
    let joinDate: Date | null = null
    try {
      const joinDateText = await page.locator('span[data-testid="UserJoinDate"]').innerText()
      // e.g. "Joined June 2012"
      if (joinDateText && joinDateText.includes('Joined')) {
        const dateStr = joinDateText.replace('Joined', '').trim() // e.g. "June 2012"
        // Convert "June 2012" to Date object (first day of month)
        const parsedDate = new Date(dateStr)
        if (!isNaN(parsedDate.getTime())) {
          joinDate = parsedDate
        }
      }
    } catch (e) {
      // Join date not found
    }

    // 6. Scraping Followers and Following
    let followers = 0
    let following = 0
    
    try {
      // Find following link: e.g. a[href$="/following"]
      const followingLocator = page.locator(`a[href$="/following"]`)
      if (await followingLocator.count() > 0) {
        const text = await followingLocator.innerText()
        // Format is: "100 Following"
        const parts = text.split(/\s+/)
        following = parseXNumber(parts[0])
      }
    } catch (e) {
      console.warn(`Failed to scrape Following count for @${username}`)
    }

    try {
      // Find followers link: e.g. a[href$="/verified_followers"] or a[href$="/followers"]
      const followersLocator = page.locator(`a[href$="/verified_followers"], a[href$="/followers"]`)
      if (await followersLocator.count() > 0) {
        const text = await followersLocator.first().innerText()
        // Format is: "10.5K Followers"
        const parts = text.split(/\s+/)
        followers = parseXNumber(parts[0])
      }
    } catch (e) {
      console.warn(`Failed to scrape Followers count for @${username}`)
    }

    // 7. Scraping Posts Count
    let posts = 0
    try {
      // Header has posts count: e.g. "1.5K posts" or "10 posts"
      // Selector: div[data-testid="primaryColumn"] header div:last-child (usually contains the subtitle with post count)
      // Or looking for text ending in "posts" in the profile header
      const headerTextLocator = page.locator('div[data-testid="primaryColumn"] h2 + div')
      const count = await headerTextLocator.count()
      for (let i = 0; i < count; i++) {
        const text = await headerTextLocator.nth(i).innerText()
        if (text && (text.toLowerCase().includes('posts') || text.toLowerCase().includes('postingan'))) {
          // Format is: "1.2K posts" or "1.2K postingan" (in Indonesian)
          const cleanText = text.replace(/posts|postingan/gi, '').trim()
          posts = parseXNumber(cleanText)
          break
        }
      }
    } catch (e) {
      console.warn(`Failed to scrape Posts count for @${username}`)
    }

    return {
      username,
      displayName,
      profileImage,
      bio,
      verified,
      followers,
      following,
      posts,
      joinDate,
      profileUrl,
    }
    } catch (innerErr: any) {
      console.error(`Error during scraping of @${username}:`, innerErr)
      let screenshotBase64: string | undefined
      try {
        const screenshotBuf = await page.screenshot({ type: 'png', timeout: 7000 })
        screenshotBase64 = `data:image/png;base64,${screenshotBuf.toString('base64')}`
        
        // Save to public dir for redundancy/direct web access
        const publicDir = path.join(process.cwd(), 'public')
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }
        fs.writeFileSync(path.join(publicDir, 'debug-screenshot.png'), screenshotBuf)
        fs.writeFileSync(path.join(publicDir, 'debug-page.html'), await page.content(), 'utf8')
        console.log('Saved debug-screenshot.png and debug-page.html to public folder.')
      } catch (debugErr) {
        console.error('Failed to capture debug assets:', debugErr)
      }
      throw new ScraperError(innerErr?.message || String(innerErr), screenshotBase64)
    }
  } finally {
    await browser.close()
    
    // Clean up temporary files
    if (tempStatePath && fs.existsSync(tempStatePath)) {
      try {
        fs.unlinkSync(tempStatePath)
      } catch (err) {
        console.error('Failed to delete temporary decrypted storageState file', err)
      }
    }
  }
}
