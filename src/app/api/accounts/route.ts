import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 2, // Take latest 2 snapshots to calculate today's growth!
        },
      },
      orderBy: { username: 'asc' },
    })

    // Format account output and compute growth
    const formattedAccounts = accounts.map((account) => {
      const latestSnapshot = account.snapshots[0] || null
      const previousSnapshot = account.snapshots[1] || null

      let followerGrowth = 0
      let postGrowth = 0

      if (latestSnapshot && previousSnapshot) {
        followerGrowth = latestSnapshot.followers - previousSnapshot.followers
        postGrowth = latestSnapshot.posts - previousSnapshot.posts
      }

      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        label: account.label,
        profileImage: account.profileImage,
        bio: account.bio,
        verified: account.verified,
        profileUrl: account.profileUrl,
        status: account.status,
        lastSyncAt: account.lastSyncAt,
        createdAt: account.createdAt,
        metrics: latestSnapshot
          ? {
              followers: latestSnapshot.followers,
              following: latestSnapshot.following,
              posts: latestSnapshot.posts,
              likes: latestSnapshot.likes,
            }
          : {
              followers: 0,
              following: 0,
              posts: 0,
              likes: 0,
            },
        growth: {
          followers: followerGrowth,
          posts: postGrowth,
        },
      }
    })

    return NextResponse.json(formattedAccounts)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
