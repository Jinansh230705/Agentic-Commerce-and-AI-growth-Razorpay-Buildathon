import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const actions = await prisma.growthAction.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  const seenProducts = new Set<string>()
  const deleted = []

  for (const action of actions) {
    if (action.status === 'REVIEW_REQUIRED') {
      // Find the opportunity to know the product
      const opp = await prisma.growthOpportunity.findUnique({ where: { id: action.opportunityId }})
      if (opp) {
        const pids = JSON.parse(opp.affectedProducts)
        const pid = pids[0]
        if (seenProducts.has(pid)) {
          // It's a duplicate REVIEW_REQUIRED action for this product!
          await prisma.growthAction.delete({ where: { id: action.id } })
          deleted.push(action.id)
        } else {
          seenProducts.add(pid)
        }
      }
    } else {
      // If it's EXECUTED or APPROVED, mark it as seen so we delete older REVIEW_REQUIRED
      const opp = await prisma.growthOpportunity.findUnique({ where: { id: action.opportunityId }})
      if (opp) {
        const pids = JSON.parse(opp.affectedProducts)
        const pid = pids[0]
        seenProducts.add(pid)
      }
    }
  }

  return NextResponse.json({ deletedCount: deleted.length, deleted })
}
