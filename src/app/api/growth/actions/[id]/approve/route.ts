import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: any) {
  try {
    const { id } = await params
    
    // In a real system, verify the caller is the authorized merchant via session token.
    // For demonstrator, we assume the dashboard calls this directly.

    const action = await prisma.growthAction.findUnique({
      where: { id }
    })

    if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

    if (action.status !== 'REVIEW_REQUIRED' && action.status !== 'PROPOSED') {
      return NextResponse.json({ error: `Cannot approve action in status ${action.status}` }, { status: 400 })
    }

    if (action.expiresAt && action.expiresAt < new Date()) {
       await prisma.growthAction.update({ where: { id }, data: { status: 'REJECTED' } })
       return NextResponse.json({ error: 'Action expired' }, { status: 400 })
    }

    const updated = await prisma.growthAction.update({
      where: { id },
      data: { status: 'APPROVED' }
    })

    await prisma.auditLog.create({
      data: {
        agentId: 'merchant',
        action: 'GROWTH_ACTION_APPROVED',
        merchantId: action.merchantId,
        details: JSON.stringify({ actionId: action.id }),
        result: 'SUCCESS'
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Approve action error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
