import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // 1. Get all accounts for user
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
        },
      },
    })

    if (accounts.length === 0) {
      return NextResponse.json({
        totalAccounts: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        totalPosts: 0,
        growthToday: 0,
        growthThisWeek: 0,
        history: [],
        usernames: [],
      })
    }

    let totalFollowers = 0
    let totalFollowing = 0
    let totalPosts = 0
    let growthToday = 0
    let growthThisWeek = 0

    // Initialize last 7 days keys
    const dailyHistory: { [dateStr: string]: any } = {}
    const now = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      dailyHistory[dateStr] = { date: dateStr, total: 0 }
    }

    const activeUsernames: string[] = []

    for (const account of accounts) {
      const snapshots = account.snapshots
      if (snapshots.length === 0) continue

      const latest = snapshots[0]
      totalFollowers += latest.followers
      totalFollowing += latest.following
      totalPosts += latest.posts

      activeUsernames.push(account.username)

      // Today's growth: compare index 0 (latest) with index 1 (previous day if exists)
      const prevDay = snapshots.find(s => {
        const diffMs = latest.capturedAt.getTime() - s.capturedAt.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        return diffDays >= 0.8 && diffDays <= 1.5
      }) || snapshots[1]

      if (prevDay) {
        growthToday += (latest.followers - prevDay.followers)
      }

      // Week's growth: compare latest with snapshot from ~7 days ago
      const prevWeek = snapshots.find(s => {
        const diffMs = latest.capturedAt.getTime() - s.capturedAt.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        return diffDays >= 6.5 && diffDays <= 7.8
      }) || snapshots[snapshots.length - 1]

      if (prevWeek) {
        growthThisWeek += (latest.followers - prevWeek.followers)
      }

      // Populate history with individual account followers
      for (const dateStr of Object.keys(dailyHistory)) {
        const targetDateEnd = new Date(dateStr + 'T23:59:59')
        const snapshotForDay = snapshots.find(s => new Date(s.capturedAt) <= targetDateEnd)
        
        if (snapshotForDay) {
          dailyHistory[dateStr][account.username] = snapshotForDay.followers
          dailyHistory[dateStr].total += snapshotForDay.followers
        } else {
          dailyHistory[dateStr][account.username] = 0
        }
      }
    }

    const historyArray = Object.values(dailyHistory).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      totalAccounts: accounts.length,
      totalFollowers,
      totalFollowing,
      totalPosts,
      growthToday,
      growthThisWeek,
      history: historyArray,
      usernames: activeUsernames,
    })
  } catch (error) {
    console.error('Failed to calculate analytics overview:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
