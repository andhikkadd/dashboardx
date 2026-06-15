import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { scrapeXProfile } from './scraper'
import { AccountStatus, LogType, SyncStatus } from '@prisma/client'

/**
 * Syncs a single X account by launching Playwright, extracting latest profile stats,
 * and saving a new snapshot to the database.
 */
export async function syncAccount(accountId: string): Promise<boolean> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    console.error(`Sync failed: Account ${accountId} not found.`)
    return false
  }

  // 1. Create a SyncJob
  const job = await prisma.syncJob.create({
    data: {
      accountId,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    },
  })

  // Log sync start
  await prisma.monitorLog.create({
    data: {
      accountId,
      type: LogType.SYNC_START,
      message: `Starting profile synchronization for @${account.username}.`,
    },
  })

  try {
    // 2. Read the encrypted storage state (try database first, fall back to file)
    let encryptedStorageState: string | null = account.storageStateData

    if (!encryptedStorageState) {
      console.log(`Session state not found in database for @${account.username}. Trying file fallback...`);
      const absolutePath = path.isAbsolute(account.storageStatePath)
        ? account.storageStatePath
        : path.join(process.cwd(), account.storageStatePath)

      if (fs.existsSync(absolutePath)) {
        encryptedStorageState = fs.readFileSync(absolutePath, 'utf8')
      } else {
        throw new Error(`STORAGE_STATE_NOT_FOUND: Session state not found in database or file at ${account.storageStatePath}`)
      }
    }

    // 3. Execute Scraper
    const scraped = await scrapeXProfile(account.username, encryptedStorageState)

    // 4. Update Database in a transaction
    await prisma.$transaction(async (tx) => {
      // Create snapshot
      await tx.accountSnapshot.create({
        data: {
          accountId,
          followers: scraped.followers,
          following: scraped.following,
          posts: scraped.posts,
          likes: 0, // Likes count is no longer visible on public X profiles by default
          capturedAt: new Date(),
        },
      })

      // Update account details
      await tx.account.update({
        where: { id: accountId },
        data: {
          displayName: scraped.displayName,
          profileImage: scraped.profileImage,
          bio: scraped.bio,
          verified: scraped.verified,
          joinDate: scraped.joinDate,
          profileUrl: scraped.profileUrl,
          status: AccountStatus.ACTIVE,
          lastSyncAt: new Date(),
        },
      })

      // Complete job
      await tx.syncJob.update({
        where: { id: job.id },
        data: {
          status: SyncStatus.COMPLETED,
          finishedAt: new Date(),
        },
      })

      // Log success
      await tx.monitorLog.create({
        data: {
          accountId,
          type: LogType.SYNC_COMPLETE,
          message: `Successfully synchronized @${account.username}. Followers: ${scraped.followers}, Posts: ${scraped.posts}.`,
        },
      })
    })

    return true
  } catch (error: any) {
    console.error(`Error syncing account @${account.username}:`, error)

    const errorMessage = error?.message || 'Unknown error'
    const isSessionExpired = errorMessage.includes('SESSION_EXPIRED')

    // Determine new status
    const newStatus = isSessionExpired
      ? AccountStatus.SESSION_EXPIRED
      : AccountStatus.ERROR

    const logType = isSessionExpired
      ? LogType.SESSION_EXPIRED
      : LogType.SYNC_FAILED

    // Update job and account in database
    await prisma.$transaction(async (tx) => {
      // Fail job
      await tx.syncJob.update({
        where: { id: job.id },
        data: {
          status: SyncStatus.FAILED,
          finishedAt: new Date(),
          error: errorMessage,
        },
      })

      // Update account status
      await tx.account.update({
        where: { id: accountId },
        data: {
          status: newStatus,
        },
      })

      // Log failure
      await tx.monitorLog.create({
        data: {
          accountId,
          type: logType,
          message: `Synchronization failed for @${account.username}: ${errorMessage}`,
          details: { error: errorMessage },
        },
      })
    })

    return false
  }
}

/**
 * Syncs all active accounts.
 */
export async function syncAllAccounts(): Promise<{ succeeded: number; failed: number }> {
  // Sync accounts one by one to prevent rate limits or high CPU usage from concurrent browsers
  const accounts = await prisma.account.findMany({
    where: {
      status: {
        not: AccountStatus.INACTIVE,
      },
    },
  })

  let succeeded = 0
  let failed = 0

  for (const account of accounts) {
    const success = await syncAccount(account.id)
    if (success) succeeded++
    else failed++
  }

  return { succeeded, failed }
}
