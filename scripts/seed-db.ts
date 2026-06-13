import { PrismaClient, AccountStatus, LogType, SyncStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Clean existing data
  await prisma.syncJob.deleteMany()
  await prisma.monitorLog.deleteMany()
  await prisma.accountSnapshot.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log('Cleared existing data.')

  // 2. Create default user
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'admin@dashboardx.com',
      name: 'Admin Dashboard-X',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  console.log(`Created default user: ${user.email} (password: password123)`)

  // 3. Create mock accounts
  const mockAccountsData = [
    {
      username: 'akun_a',
      displayName: 'Brand Marketing Pro',
      label: 'Corporate',
      bio: 'Digital marketing tips, brand growth hacks, and startup insights.',
      profileImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
      verified: true,
      followersBase: 12500,
      followersGrowth: 15, // average followers gained per day
      postsBase: 1230,
      postsGrowth: 2,
      following: 432,
    },
    {
      username: 'akun_b',
      displayName: 'SaaS Builder',
      label: 'Personal Brand',
      bio: 'Building in public. Sharing my journey to $10K MRR. Next.js & TS developer.',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      verified: false,
      followersBase: 3420,
      followersGrowth: 8,
      postsBase: 840,
      postsGrowth: 3,
      following: 280,
    },
    {
      username: 'akun_c',
      displayName: 'Crypto Alpha',
      label: 'Crypto/Web3',
      bio: 'Daily updates on crypto trends, web3 development, and macro economics.',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      verified: false,
      followersBase: 42100,
      followersGrowth: -5, // slight decline
      postsBase: 4120,
      postsGrowth: 5,
      following: 1105,
    },
  ]

  for (const acc of mockAccountsData) {
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        username: acc.username,
        displayName: acc.displayName,
        label: acc.label,
        bio: acc.bio,
        profileImage: acc.profileImage,
        verified: acc.verified,
        profileUrl: `https://x.com/${acc.username}`,
        storageStatePath: `./storage-states/${acc.username}.json`,
        status: AccountStatus.ACTIVE,
        lastSyncAt: new Date(),
      },
    })

    console.log(`Created mock account: @${account.username}`)

    // 4. Create 30 days of historical snapshots for this account
    const snapshots = []
    const now = new Date()

    for (let i = 29; i >= 0; i--) {
      const capturedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      
      // Calculate growth progression
      const daysPassed = 29 - i
      const followers = Math.max(0, acc.followersBase + daysPassed * acc.followersGrowth + Math.round((Math.random() - 0.5) * 10))
      const posts = acc.postsBase + daysPassed * acc.postsGrowth
      const following = acc.following + Math.round((Math.random() - 0.5) * 3)

      snapshots.push({
        accountId: account.id,
        followers,
        following,
        posts,
        likes: 0,
        capturedAt,
      })
    }

    await prisma.accountSnapshot.createMany({
      data: snapshots,
    })

    console.log(`Generated 30 days of snapshots for @${account.username}`)

    // 5. Create some logs
    await prisma.monitorLog.create({
      data: {
        accountId: account.id,
        type: LogType.SYNC_COMPLETE,
        message: `Initial synchronization completed. Verified status: ${account.verified ? 'Yes' : 'No'}.`,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    })

    await prisma.monitorLog.create({
      data: {
        accountId: account.id,
        type: LogType.INFO,
        message: `Account connected to Dashboard-X.`,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    })

    // Create sync jobs
    await prisma.syncJob.create({
      data: {
        accountId: account.id,
        status: SyncStatus.COMPLETED,
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 - 15000),
      },
    })
  }

  console.log('Database seeding finished successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
