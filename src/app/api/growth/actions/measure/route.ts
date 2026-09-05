import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchantId } = body

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId required' }, { status: 400 })
    }

    // Find all executed actions
    const executedActions = await prisma.growthAction.findMany({
      where: {
        merchantId,
        status: 'EXECUTED'
      },
      include: {
        opportunity: true
      }
    })

    const measuredActions = []

    for (const action of executedActions) {
      // In a real system, we'd wait for measurementWindow. For demo, we measure immediately.
      const affectedProducts = JSON.parse(action.opportunity.affectedProducts)
      const targetProductId = affectedProducts[0]

      // Count orders containing this product since action was executed
      const recentOrders = await prisma.checkoutLineItem.findMany({
        where: {
          productId: targetProductId,
          checkoutSession: {
            merchantId,
            status: 'COMPLETED',
            updatedAt: { gte: action.updatedAt }
          }
        }
      })

      const postActionMetric = recentOrders.reduce((sum, item) => sum + item.quantity, 0)

      // Outcome Logic
      let outcome = 'INSUFFICIENT_DATA'
      if (postActionMetric > 2) {
        outcome = 'SUCCESS'
      } else if (postActionMetric === 0) {
        // We'll consider 0 a NEGATIVE result if enough time has passed. 
        outcome = 'NEGATIVE'
      } else {
        outcome = 'NEUTRAL'
      }

      const updated = await prisma.growthAction.update({
        where: { id: action.id },
        data: {
          status: 'MEASURED',
          postActionMetric,
          outcome
        }
      })
      measuredActions.push(updated)
    }

    return NextResponse.json({ measured: measuredActions.length, actions: measuredActions })
  } catch (error) {
    console.error('Measure error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
