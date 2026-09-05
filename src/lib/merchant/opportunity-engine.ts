import { prisma } from '../prisma'
import { getMerchantMetrics, getTopCrossSellPairs } from './analytics'

export async function detectGrowthOpportunities(merchantId: string) {
  const metrics = await getMerchantMetrics(merchantId)
  const crossSellPairs = await getTopCrossSellPairs(merchantId, 2) // At least 2 co-occurrences

  const newOpportunities = []

  // Calculate feedback adjustment based on past MEASURED actions
  const measuredActions = await prisma.growthAction.findMany({
    where: { merchantId, status: 'MEASURED' },
    include: { opportunity: true }
  })
  
  let crossSellAdj = 0
  let discountAdj = 0
  
  for (const action of measuredActions) {
    if (action.opportunity.type === 'CROSS_SELL') {
      if (action.outcome === 'SUCCESS') crossSellAdj += 10
      if (action.outcome === 'NEGATIVE') crossSellAdj -= 10
    }
    if (action.opportunity.type === 'LOW_PERFORMER') {
      if (action.outcome === 'SUCCESS') discountAdj += 10
      if (action.outcome === 'NEGATIVE') discountAdj -= 10
    }
  }
  
  // Cap adjustments between -30 and +30
  crossSellAdj = Math.max(-30, Math.min(30, crossSellAdj))
  discountAdj = Math.max(-30, Math.min(30, discountAdj))

  // 1. Cross-Sell Opportunities
  // If products are frequently bought together (> 20% frequency), we recommend explicit cross-selling
  for (const pair of crossSellPairs) {
    if (pair.frequency > 20) {
      // Check if this opportunity already exists
      const existing = await prisma.growthOpportunity.findFirst({
        where: {
          merchantId,
          type: 'CROSS_SELL',
          affectedProducts: { contains: pair.productIdA } // Rough check, we can refine this
        }
      })
      
      // Also check if they are already complementary
      const productA = await prisma.product.findUnique({ where: { productId: pair.productIdA } })
      let alreadyCrossSelling = false
      if (productA?.complementaryProducts) {
        try {
          const comps = JSON.parse(productA.complementaryProducts)
          if (comps.includes(pair.productIdB)) alreadyCrossSelling = true
        } catch (e) {}
      }

      if (!existing && !alreadyCrossSelling) {
        // Estimate impact: AOV increase. 
        // Example: If 10% of total buyers of A adopt the cross-sell B.
        const productB = await prisma.product.findUnique({ where: { productId: pair.productIdB } })
        const priceB = productB?.priceAmount || 0
        const estimatedImpact = Math.round(priceB * (metrics.orderCount * 0.1))
        
        let baseConf = 85
        let finalConf = Math.max(0, Math.min(100, baseConf + crossSellAdj))

        const opp = await prisma.growthOpportunity.create({
          data: {
            merchantId,
            type: 'CROSS_SELL',
            title: `Cross-sell ${pair.productNameB} with ${pair.productNameA}`,
            explanation: `Customers purchasing ${pair.productNameA} also purchase ${pair.productNameB} in ${pair.frequency}% of observed orders. Explicitly linking them as complementary products will increase visibility during checkout. Past outcome feedback applied: ${crossSellAdj > 0 ? '+' : ''}${crossSellAdj}.`,
            evidence: JSON.stringify(pair),
            affectedProducts: JSON.stringify([pair.productIdA, pair.productIdB]),
            estimatedImpact,
            confidence: finalConf,
            priority: pair.frequency > 40 ? 'HIGH' : 'MEDIUM'
          }
        })
        newOpportunities.push(opp)
      }
    }
  }

  // 2. Low Performer Opportunities (Discounts/Campaigns)
  for (const product of metrics.lowPerformers) {
    if (product.inventory > 10 && product.quantity < 2) {
      const existing = await prisma.growthOpportunity.findFirst({
        where: {
          merchantId,
          type: 'LOW_PERFORMER',
          affectedProducts: { contains: product.productId }
        }
      })

      if (!existing) {
        const fullProduct = await prisma.product.findUnique({ where: { productId: product.productId } })
        const price = fullProduct?.priceAmount || 0
        // Estimate impact: selling 5 more items at a 15% discount
        const estimatedImpact = Math.round(5 * (price * 0.85))

        let baseConf = 70
        let finalConf = Math.max(0, Math.min(100, baseConf + discountAdj))

        const opp = await prisma.growthOpportunity.create({
          data: {
            merchantId,
            type: 'LOW_PERFORMER',
            title: `Discount slow-moving inventory: ${product.name}`,
            explanation: `${product.name} has ${product.inventory} units in stock but only ${product.quantity} recent sales. Proposing a targeted 15% discount to accelerate inventory velocity. Past outcome feedback applied: ${discountAdj > 0 ? '+' : ''}${discountAdj}.`,
            evidence: JSON.stringify({ inventory: product.inventory, sales: product.quantity }),
            affectedProducts: JSON.stringify([product.productId]),
            estimatedImpact,
            confidence: finalConf,
            priority: product.inventory > 50 ? 'HIGH' : 'LOW'
          }
        })
        newOpportunities.push(opp)
      }
    }
  }

  return newOpportunities
}
