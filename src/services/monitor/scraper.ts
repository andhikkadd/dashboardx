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

  // Launch browser with memory-optimized flags for Cloud Run
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--no-first-run',
      '--single-process',
      '--js-flags=--max-old-space-size=256',
    ],
  })

  let context: BrowserContext | null = null
  let page: Page | null = null
  
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

    // Add stealth scripts to bypass bot detection checks on X.com
    await context.addInitScript(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
      // Delete the property entirely as a fallback
      delete (navigator as any).__proto__.webdriver

      // Spoof chrome object
      // @ts-ignore
      window.chrome = {
        runtime: {
          onMessage: { addListener: () => {}, removeListener: () => {} },
          sendMessage: () => {},
        },
        loadTimes: () => ({}),
        csi: () => ({}),
        app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, getDetails: () => null, getIsInstalled: () => false, runningState: () => 'cannot_run' },
      }

      // Spoof plugins with realistic PluginArray
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ]
          // @ts-ignore
          arr.item = (i: number) => arr[i] || null
          // @ts-ignore
          arr.namedItem = (name: string) => arr.find(p => p.name === name) || null
          // @ts-ignore
          arr.refresh = () => {}
          return arr
        },
      })
      
      // Spoof mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          const arr = [
            { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          ]
          // @ts-ignore
          arr.item = (i: number) => arr[i] || null
          // @ts-ignore
          arr.namedItem = (name: string) => arr.find(m => m.type === name) || null
          return arr
        },
      })

      // Spoof languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })

      // Spoof hardware concurrency (realistic value)
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      })

      // Spoof device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      })

      // Spoof permissions
      const originalQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions)
      if (originalQuery) {
        window.navigator.permissions.query = (parameters: any) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission } as PermissionStatus)
          }
          return originalQuery(parameters)
        }
      }

      // WebGL vendor and renderer spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
        if (parameter === 37445) return 'Intel Inc.'       // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Intel Iris OpenGL Engine' // UNMASKED_RENDERER_WEBGL
        return getParameter.call(this, parameter)
      }
    })

    // Set extra HTTP headers to match a real browser profile
    await context.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Chromium";v="120", "Not?A_Brand";v="8"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    })

    page = await context.newPage()
    
    // Block images, media, fonts, and large assets to save memory on Cloud Run
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        return route.abort()
      }
      return route.continue()
    })
    
    // Set timeout to 30 seconds
    page.setDefaultTimeout(30000)

    try {
      const profileUrl = `https://x.com/${username}`

      // Navigate to the target profile with retry logic
      const MAX_RETRIES = 3
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[Scraper] Loading profile @${username} (attempt ${attempt}/${MAX_RETRIES})...`)
        
        // Check if browser is still alive before each attempt
        if (!browser.isConnected()) {
          throw new Error(`BROWSER_CRASHED: Chromium process died before attempt ${attempt}. This usually means Cloud Run ran out of memory.`)
        }

        try {
          await page.goto(profileUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          })

          // Wait for SPA content to render (use setTimeout instead of page method for safety)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Check if browser survived navigation
          if (!browser.isConnected()) {
            throw new Error(`BROWSER_CRASHED: Chromium crashed during page load for @${username}.`)
          }

          // Check for the profile UserName element
          await page.waitForSelector('div[data-testid="UserName"]', { timeout: 20000 })
          
          // Success! Break out of the retry loop
          lastError = null
          break
        } catch (attemptErr: any) {
          lastError = attemptErr
          const errMsg = attemptErr?.message || ''
          console.warn(`[Scraper] Attempt ${attempt} failed for @${username}:`, errMsg)

          // If browser crashed, no point retrying
          if (!browser.isConnected() || errMsg.includes('BROWSER_CRASHED') ||
              errMsg.includes('Target page, context or browser has been closed') ||
              errMsg.includes('browser has been closed') ||
              errMsg.includes('Target closed') ||
              errMsg.includes('Connection closed')) {
            throw new Error(`BROWSER_CRASHED: Chromium process crashed while loading @${username}. Cloud Run may not have enough memory. Error: ${errMsg}`)
          }

          // Don't retry if it's clearly a non-transient issue
          const currentUrl = await page.url()
          
          // Check for login redirect (session expired — no retry)
          if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
            throw new Error('SESSION_EXPIRED: Redirected to login page. Session cookies are no longer valid.')
          }

          // Check for account suspension
          const pageContent = await page.textContent('body').catch(() => '') || ''
          if (pageContent.toLowerCase().includes('account is suspended') || 
              pageContent.toLowerCase().includes('account has been suspended')) {
            throw new Error(`ACCOUNT_SUSPENDED: The account @${username} has been suspended by X.`)
          }

          // Check for "This account doesn't exist"
          if (pageContent.toLowerCase().includes("this account doesn't exist") ||
              pageContent.toLowerCase().includes("account doesn\u2019t exist")) {
            throw new Error(`ACCOUNT_NOT_FOUND: The account @${username} does not exist on X.`)
          }

          // If we have more retries, wait with exponential backoff (use safe setTimeout)
          if (attempt < MAX_RETRIES) {
            const backoffMs = attempt * 3000 // 3s, 6s
            console.log(`[Scraper] Waiting ${backoffMs / 1000}s before retry...`)
            await new Promise(resolve => setTimeout(resolve, backoffMs))
          }
        }
      }

      // If all retries failed, collect diagnostic info and throw
      if (lastError) {
        const currentUrl = page.url()
        const pageTitle = await page.title().catch(() => 'N/A')
        const bodyText = await page.textContent('body').catch(() => '') || ''
        const bodyExcerpt = bodyText.replace(/\s+/g, ' ').trim().substring(0, 300)

        console.error(`[Scraper] All ${MAX_RETRIES} attempts failed for @${username}.`)
        console.error(`[Scraper] Final URL: ${currentUrl}`)
        console.error(`[Scraper] Page title: ${pageTitle}`)
        console.error(`[Scraper] Body excerpt: ${bodyExcerpt}`)

        // Categorize the failure
        if (bodyExcerpt.toLowerCase().includes('rate limit') || 
            bodyExcerpt.toLowerCase().includes('too many requests')) {
          throw new Error(`RATE_LIMITED: X.com rate limited the request for @${username}. Page: ${pageTitle}`)
        }
        if (bodyExcerpt.toLowerCase().includes('something went wrong') ||
            bodyExcerpt.toLowerCase().includes('try again')) {
          throw new Error(`X_ERROR_PAGE: X.com returned an error page for @${username}. Title: "${pageTitle}". Content: "${bodyExcerpt}"`)
        }
        if (bodyExcerpt.toLowerCase().includes('challenge') || 
            bodyExcerpt.toLowerCase().includes('verify') ||
            bodyExcerpt.toLowerCase().includes('captcha') ||
            bodyExcerpt.toLowerCase().includes('arkose')) {
          throw new Error(`CHALLENGE_PAGE: X.com served a bot challenge/verification page for @${username}. Title: "${pageTitle}"`)
        }

        throw new Error(`PAGE_LOAD_FAILED: Failed to load profile page of @${username} after ${MAX_RETRIES} attempts. URL: ${currentUrl}. Title: "${pageTitle}". Content: "${bodyExcerpt}"`)
      }

    // Give a short delay for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000))

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
        if (page) {
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
        } else {
          console.warn('Cannot capture screenshot: Playwright page was not initialized.')
        }
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
