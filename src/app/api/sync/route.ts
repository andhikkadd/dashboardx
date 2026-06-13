import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncAccount } from '@/services/monitor/worker'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        username: true,
      },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ message: 'No accounts to sync', succeeded: 0, failed: 0 })
    }

    let succeeded = 0
    let failed = 0
    const results = []

    for (const account of accounts) {
      console.log(`Starting bulk-sync for @${account.username}...`)
      const success = await syncAccount(account.id)
      if (success) succeeded++
      else failed++
      results.push({ username: account.username, success })
    }

    return NextResponse.json({
      message: 'Sync completed',
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('Bulk sync failed:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
