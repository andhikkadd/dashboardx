import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  
  try {
    const logs = await prisma.monitorLog.findMany({
      where: {
        account: {
          userId: session.user.id,
        },
        ...(accountId ? { accountId } : {}),
      },
      include: {
        account: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 logs
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Failed to fetch monitor logs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
