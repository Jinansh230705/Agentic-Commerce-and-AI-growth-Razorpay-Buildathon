import { prisma } from '../prisma'
import { getMerchantMetrics, getTopCrossSellPairs } from './analytics'
import { detectGrowthOpportunities } from './opportunity-engine'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function getMerchantAnalytics(merchantId: string) {
  try {
    const metrics = await getMerchantMetrics(merchantId)
    return metrics
  } catch (err) {
    console.error(err)
    return { error: 'Failed to fetch analytics' }
  }
}

export async function fetchGrowthOpportunities(merchantId: string) {
  try {
    // Detect new ones
    await detectGrowthOpportunities(merchantId)
    
    // Fetch all OPEN or ACTION_PROPOSED
    const opportunities = await prisma.growthOpportunity.findMany({
      where: {
        merchantId,
        status: { in: ['OPEN', 'ACTION_PROPOSED'] }
      },
      orderBy: { estimatedImpact: 'desc' }
    })
    return opportunities
  } catch (err) {
    console.error(err)
    return { error: 'Failed to fetch opportunities' }
  }
}

export async function proposeGrowthAction(opportunityId: string, merchantId: string, actionType: string, proposedValues: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/growth/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId,
        merchantId,
        actionType,
        proposedValues: JSON.stringify(proposedValues)
      })
    })
    const data = await res.json()
    if (!res.ok) {
       return { error: data.error || 'Failed to propose action', details: data.constraints }
    }
    return data
  } catch (err) {
    console.error(err)
    return { error: 'Failed to propose action due to network error' }
  }
}

// Note: The AI cannot call approveGrowthAction or executeGrowthAction.
// Those require explicit merchant UI interaction and session validation.
