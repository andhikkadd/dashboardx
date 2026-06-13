import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '7d'

  let cutoffDays = 7
  if (period === '1d') cutoffDays = 2
  if (period === '30d') cutoffDays = 30
  if (period === '90d') cutoffDays = 90

  const userId = session.user.id

  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 100, // Support 90d analytics view
        },
      },
    })

    if (accounts.length === 0) {
      return NextResponse.json({
        history: [],
        usernames: [],
      })
    }

    const activeUsernames = accounts.map((a) => a.username)
    const now = new Date()
    const historyArray: any[] = []

    if (period === '1d') {
      // Split the last 24 hours into 2-hour interval buckets (12 data points)
      const buckets: Date[] = []
      for (let i = 11; i >= 0; i--) {
        buckets.push(new Date(now.getTime() - i * 2 * 60 * 60 * 1000))
      }

      for (const bucketTime of buckets) {
        const hours = bucketTime.getHours().toString().padStart(2, '0')
        const minutes = bucketTime.getMinutes().toString().padStart(2, '0')
        const label = `${hours}:${minutes}`

        const dataPoint: any = {
          date: bucketTime.toISOString(),
          label: label,
        }

        for (const account of accounts) {
          // Find the snapshot closest to but before or at the bucket time
          const snapshot = account.snapshots
            .filter((s) => new Date(s.capturedAt) <= bucketTime)
            .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0]

          if (snapshot) {
            dataPoint[`${account.username}_followers`] = snapshot.followers
            dataPoint[`${account.username}_following`] = snapshot.following
            dataPoint[`${account.username}_posts`] = snapshot.posts
          } else {
            dataPoint[`${account.username}_followers`] = 0
            dataPoint[`${account.username}_following`] = 0
            dataPoint[`${account.username}_posts`] = 0
          }
        }
        historyArray.push(dataPoint)
      }
    } else {
      const dailyHistory: { [dateStr: string]: any } = {}
      for (let i = cutoffDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = d.toISOString().split('T')[0]
        dailyHistory[dateStr] = {
          date: d.toISOString(),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }
      }

      for (const account of accounts) {
        const snapshots = account.snapshots
        if (snapshots.length === 0) continue

        for (const dateStr of Object.keys(dailyHistory)) {
          const targetDateEnd = new Date(dateStr + 'T23:59:59')
          const snapshotForDay = snapshots.find((s) => new Date(s.capturedAt) <= targetDateEnd)

          if (snapshotForDay) {
            dailyHistory[dateStr][`${account.username}_followers`] = snapshotForDay.followers
            dailyHistory[dateStr][`${account.username}_following`] = snapshotForDay.following
            dailyHistory[dateStr][`${account.username}_posts`] = snapshotForDay.posts
          } else {
            dailyHistory[dateStr][`${account.username}_followers`] = 0
            dailyHistory[dateStr][`${account.username}_following`] = 0
            dailyHistory[dateStr][`${account.username}_posts`] = 0
          }
        }
      }

      historyArray.push(...Object.values(dailyHistory))
    }

    historyArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      history: historyArray,
      usernames: activeUsernames,
    })
  } catch (error) {
    console.error('Failed to calculate comparison analytics:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
