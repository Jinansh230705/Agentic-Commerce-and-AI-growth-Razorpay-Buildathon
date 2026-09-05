import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Propose a new growth action based on an opportunity
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { opportunityId, merchantId, actionType, proposedValues } = body

    if (!opportunityId || !merchantId || !actionType || !proposedValues) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const opportunity = await prisma.growthOpportunity.findUnique({
      where: { id: opportunityId }
    })

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Server-side constraint enforcement checks before proposing
    let constraints = {}
    if (actionType === 'CREATE_DISCOUNT') {
      const { targetPrice } = JSON.parse(proposedValues)
      const products = JSON.parse(opportunity.affectedProducts)
      
      const product = await prisma.product.findUnique({ where: { productId: products[0] } })
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      
      const maxDiscountPct = 20
      const minAllowedPrice = Math.floor(product.priceAmount * (1 - (maxDiscountPct / 100)))

      if (targetPrice < minAllowedPrice) {
        // AI TRUST BOUNDARY: Rejection
        return NextResponse.json({ 
          error: 'ACTION BLOCKED: Proposed price violates maximum discount limit.',
          constraints: `Maximum allowed discount is ${maxDiscountPct}%. Minimum price is ${minAllowedPrice}.`
        }, { status: 403 })
      }

      constraints = {
        maxDiscountPct,
        minAllowedPrice,
        originalPrice: product.priceAmount
      }
    } else if (actionType === 'UPDATE_COMPLEMENTARY') {
      const { complementaryProductIds } = JSON.parse(proposedValues)
      // Check if products exist
      for (const pid of complementaryProductIds) {
         const p = await prisma.product.findUnique({ where: { productId: pid } })
         if (!p) {
           return NextResponse.json({ error: `ACTION BLOCKED: Complementary product ${pid} not found.` }, { status: 403 })
         }
      }
      constraints = { validProductIds: complementaryProductIds }
    } else {
      return NextResponse.json({ error: 'Unsupported action type' }, { status: 400 })
    }

    const action = await prisma.growthAction.create({
      data: {
        opportunityId,
        merchantId,
        actionType,
        proposedValues, // e.g. '{"targetPrice": 800}' or '{"complementaryProductIds": ["prod_B"]}'
        constraints: JSON.stringify(constraints),
        status: 'REVIEW_REQUIRED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to review
      }
    })

    await prisma.auditLog.create({
      data: {
        agentId: 'system',
        action: 'GROWTH_ACTION_PROPOSED',
        merchantId,
        details: JSON.stringify({ actionId: action.id, actionType }),
        result: 'SUCCESS'
      }
    })

    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    console.error('Propose action error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchantId = searchParams.get('merchantId')
  
  if (!merchantId) return NextResponse.json({ error: 'merchantId required' }, { status: 400 })

  const actions = await prisma.growthAction.findMany({
    where: { merchantId },
    include: { opportunity: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ items: actions })
}
