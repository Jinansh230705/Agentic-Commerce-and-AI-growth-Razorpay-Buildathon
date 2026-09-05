import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const merchantId = body.merchantId || 'mrc_aster_gear'

    // 1. Analyze Real Orders
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'PAYMENT_VERIFIED', merchantId },
      include: {
        checkoutSession: {
          include: { lineItems: true }
        }
      }
    })

    if (orders.length === 0) {
      return NextResponse.json({
        status: 'INSUFFICIENT_DATA',
        message: 'Not enough real orders to identify growth opportunities.'
      })
    }

    // 2. Count sales per product
    const salesCount: Record<string, number> = {}
    for (const order of orders) {
      for (const item of order.checkoutSession.lineItems) {
        salesCount[item.productId] = (salesCount[item.productId] || 0) + item.quantity
      }
    }

    // 3. Get all products to find a low performer
    const allProducts = await prisma.product.findMany({
      where: { merchantId }
    })
    let lowPerformer = null

    // Get products with recent actions
    const recentActions = await prisma.growthAction.findMany({
      where: {
        merchantId,
        status: { in: ['REVIEW_REQUIRED', 'APPROVED', 'EXECUTED'] }
      },
      include: { opportunity: true }
    })
    
    const recentlyActedProductIds = new Set<string>()
    for (const action of recentActions) {
       try {
         const ids = JSON.parse(action.opportunity.affectedProducts)
         ids.forEach((id: string) => recentlyActedProductIds.add(id))
       } catch(e) {}
    }

    for (const product of allProducts) {
      if (!salesCount[product.productId] && !recentlyActedProductIds.has(product.productId)) {
        lowPerformer = product
        break
      }
    }

    if (!lowPerformer) {
      // If all products are selling well or have actions, find the lowest seller without an action
      const availableProducts = allProducts.filter(p => !recentlyActedProductIds.has(p.productId))
      if (availableProducts.length > 0) {
        lowPerformer = availableProducts.sort((a, b) => (salesCount[a.productId] || 0) - (salesCount[b.productId] || 0))[0]
      }
    }

    if (!lowPerformer) {
      return NextResponse.json({
        status: 'INSUFFICIENT_DATA',
        message: 'No active products available for analysis.'
      })
    }

    // 4. Create Opportunity
    const newPrice = Math.floor(lowPerformer.priceAmount * 0.9) // 10% discount

    const opportunity = await (prisma as any).growthOpportunity.create({
      data: {
        merchantId: merchantId,
        type: 'LOW_PERFORMER',
        title: `Boost Sales for ${lowPerformer.name}`,
        explanation: `${lowPerformer.name} is underperforming relative to catalog averages. A 10% price reduction is recommended to stimulate demand.`,
        evidence: `0 units sold in the recent verified orders.`,
        affectedProducts: JSON.stringify([lowPerformer.productId]),
        estimatedImpact: 50000, // estimated 50,000 INR
        confidence: 85,
        priority: 'MEDIUM',
        status: 'ACTION_PROPOSED'
      }
    })

    // 5. Create Action
    const action = await (prisma as any).growthAction.create({
      data: {
        opportunityId: opportunity.id,
        merchantId: merchantId,
        actionType: 'CREATE_DISCOUNT',
        proposedValues: JSON.stringify({ targetPrice: newPrice }),
        constraints: JSON.stringify({ minAllowedPrice: Math.floor(lowPerformer.priceAmount * 0.8) }),
        status: 'REVIEW_REQUIRED',
        baselineMetric: salesCount[lowPerformer.productId] || 0,
        measurementWindow: 7
      }
    })

    return NextResponse.json({
      status: 'SUCCESS',
      opportunity,
      action
    })

  } catch (error: any) {
    console.error('Failed to analyze growth:', error)
    return NextResponse.json({ error: 'Failed to analyze growth' }, { status: 500 })
  }
}
