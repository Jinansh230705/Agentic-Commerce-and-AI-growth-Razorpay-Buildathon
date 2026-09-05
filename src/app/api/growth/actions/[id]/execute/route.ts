import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: any) {
  try {
    const { id } = await params
    
    // Server-side boundary enforcement
    const action = await prisma.growthAction.findUnique({
      where: { id },
      include: { opportunity: true }
    })

    if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

    if (action.status !== 'APPROVED') {
      return NextResponse.json({ error: `ACTION BLOCKED: Cannot execute action in status ${action.status}` }, { status: 403 })
    }

    if (action.expiresAt && action.expiresAt < new Date()) {
       await prisma.growthAction.update({ where: { id }, data: { status: 'REJECTED' } })
       return NextResponse.json({ error: 'ACTION BLOCKED: Action expired' }, { status: 403 })
    }

    const proposedValues = JSON.parse(action.proposedValues)
    const constraints = JSON.parse(action.constraints)
    const affectedProducts = JSON.parse(action.opportunity.affectedProducts)

    // Execute based on Action Type
    if (action.actionType === 'CREATE_DISCOUNT') {
      const productId = affectedProducts[0]
      const product = await prisma.product.findUnique({ where: { productId } })
      
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

      // Double-check constraints
      const targetPrice = proposedValues.targetPrice
      if (targetPrice < constraints.minAllowedPrice) {
        return NextResponse.json({ error: 'ACTION BLOCKED: Price violates constraints during execution' }, { status: 403 })
      }

      // Execute Atomically
      const tx = await prisma.$transaction([
        prisma.product.update({
          where: { productId },
          data: { priceAmount: targetPrice }
        }),
        prisma.growthAction.updateMany({
          where: { id, status: 'APPROVED' },
          data: { status: 'EXECUTED', baselineMetric: product.priceAmount }
        }),
        prisma.auditLog.create({
          data: {
            agentId: 'system',
            action: 'GROWTH_ACTION_EXECUTED',
            merchantId: action.merchantId,
            details: JSON.stringify({ actionId: action.id, actionType: action.actionType, newPrice: targetPrice }),
            result: 'SUCCESS'
          }
        })
      ])

      // If updateMany returns count 0, the status was not APPROVED
      if (tx[1].count === 0) {
        throw new Error('Concurrency Error: Action was not in APPROVED state at the moment of execution.')
      }

    } else if (action.actionType === 'UPDATE_COMPLEMENTARY') {
      const productId = affectedProducts[0]
      const product = await prisma.product.findUnique({ where: { productId } })
      
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

      const newComps = proposedValues.complementaryProductIds
      // Merge with existing
      let currentComps: string[] = []
      if (product.complementaryProducts) {
        try { currentComps = JSON.parse(product.complementaryProducts) } catch(e) {}
      }
      
      const mergedComps = Array.from(new Set([...currentComps, ...newComps]))

      const tx = await prisma.$transaction([
        prisma.product.update({
          where: { productId },
          data: { complementaryProducts: JSON.stringify(mergedComps) }
        }),
        prisma.growthAction.updateMany({
          where: { id, status: 'APPROVED' },
          data: { status: 'EXECUTED' }
        }),
        prisma.auditLog.create({
          data: {
            agentId: 'system',
            action: 'GROWTH_ACTION_EXECUTED',
            merchantId: action.merchantId,
            details: JSON.stringify({ actionId: action.id, actionType: action.actionType, newComps: mergedComps }),
            result: 'SUCCESS'
          }
        })
      ])

      if (tx[1].count === 0) {
        throw new Error('Concurrency Error: Action was not in APPROVED state at the moment of execution.')
      }

    } else {
      return NextResponse.json({ error: 'Unknown action type' }, { status: 400 })
    }

    const updated = await prisma.growthAction.findUnique({ where: { id } })
    return NextResponse.json(updated)

  } catch (error) {
    console.error('Execute action error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
