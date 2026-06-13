import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncAccount } from '@/services/monitor/worker'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const account = await prisma.account.findUnique({
      where: { id },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Trigger sync in background or wait for it.
    // Since it's a manual trigger, we can await it so that the user gets immediate feedback.
    // Set a timeout of 40s to be safe
    const success = await syncAccount(id)

    if (success) {
      return NextResponse.json({ success: true, message: 'Sync completed successfully' })
    } else {
      return NextResponse.json(
        { error: 'Sync failed. Check logs for details.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Manual sync failed:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
