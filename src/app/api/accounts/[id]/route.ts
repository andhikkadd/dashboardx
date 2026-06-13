import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(
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
      where: {
        id,
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 100, // Get last 100 snapshots for charts (supports 90d view)
        },
      },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Failed to fetch account detail:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // 1. Delete the physical storageState file
    const absolutePath = path.isAbsolute(account.storageStatePath)
      ? account.storageStatePath
      : path.join(process.cwd(), account.storageStatePath)

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath)
        console.log(`Deleted session file: ${absolutePath}`)
      } catch (err) {
        console.error(`Failed to delete session file at ${absolutePath}:`, err)
      }
    }

    // 2. Cascade delete from DB (Prisma relation cascade will handle snapshots, logs, and syncJobs if specified, or we delete them explicitly)
    // In our Prisma schema, we specified `onDelete: Cascade` for relations. So deleting Account deletes relations!
    await prisma.account.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
