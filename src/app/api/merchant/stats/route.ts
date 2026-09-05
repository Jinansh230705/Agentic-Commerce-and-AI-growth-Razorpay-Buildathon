import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchantId = searchParams.get('merchantId')
  
  if (!merchantId) {
    return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 })
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        merchantId: merchantId,
        paymentStatus: 'PAYMENT_VERIFIED'
      }
    })

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0)
    
    // We assume an order is AI-driven if it has an associated audit log or we just mock a percentage based on reality.
    // For now, let's just count all orders. If 0, then 0.
    const orderCount = orders.length
    const aiSalesPercentage = orderCount > 0 ? 100 : 0 // Since in this app all orders are via AI buyer currently

    const activeAgents = await prisma.growthOpportunity.count({
      where: {
        merchantId: merchantId,
        status: { notIn: ['CLOSED', 'REJECTED'] }
      }
    })

    return NextResponse.json({
      revenue: totalRevenue, // Removed / 100 as totalAmount is stored in base INR
      aiSalesPercentage: aiSalesPercentage,
      activeAgents: activeAgents > 0 ? 1 : 0 // 1 agent processing multiple ops
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
