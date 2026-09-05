import { prisma } from '../prisma'

export interface MerchantMetrics {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  salesByProduct: Record<string, { quantity: number, revenue: number, name: string }>
  salesByCategory: Record<string, { quantity: number, revenue: number }>
  lowPerformers: Array<{ productId: string, name: string, quantity: number, inventory: number }>
  topPerformers: Array<{ productId: string, name: string, quantity: number, revenue: number }>
}

export interface CrossSellPair {
  productIdA: string
  productIdB: string
  productNameA: string
  productNameB: string
  coOccurrenceCount: number
  frequency: number // percentage of orders containing A that also contain B
}

export async function getMerchantMetrics(merchantId: string): Promise<MerchantMetrics> {
  const orders = await prisma.order.findMany({
    where: {
      merchantId,
      status: { in: ['ORDER_PENDING', 'ORDER_CREATED', 'PAYMENT_CAPTURED'] } // In a real system, filter by successful payment. For demonstrator, we might count all active orders. Let's stick to all for now as Test Mode doesn't always transition to CAPTURED.
    },
    include: {
      checkoutSession: {
        include: {
          lineItems: true
        }
      }
    }
  })

  let totalRevenue = 0
  const orderCount = orders.length
  
  const salesByProduct: Record<string, { quantity: number, revenue: number, name: string }> = {}
  const salesByCategory: Record<string, { quantity: number, revenue: number }> = {}

  // We need product details for names and categories
  const products = await prisma.product.findMany()
  const productMap = new Map(products.map(p => [p.productId, p]))

  for (const order of orders) {
    totalRevenue += order.totalAmount
    
    for (const item of order.checkoutSession.lineItems) {
      const p = productMap.get(item.productId)
      const name = p?.name || item.productId
      const category = p?.category || 'Uncategorized'
      
      const itemRevenue = item.priceAmount * item.quantity

      if (!salesByProduct[item.productId]) {
        salesByProduct[item.productId] = { quantity: 0, revenue: 0, name }
      }
      salesByProduct[item.productId].quantity += item.quantity
      salesByProduct[item.productId].revenue += itemRevenue

      if (!salesByCategory[category]) {
        salesByCategory[category] = { quantity: 0, revenue: 0 }
      }
      salesByCategory[category].quantity += item.quantity
      salesByCategory[category].revenue += itemRevenue
    }
  }

  const averageOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0

  const productPerformance = Object.entries(salesByProduct).map(([productId, data]) => ({
    productId,
    ...data
  })).sort((a, b) => b.revenue - a.revenue)

  const topPerformers = productPerformance.slice(0, 5)
  
  // Find low performers (products with high inventory but low sales)
  const lowPerformers = products
    .filter(p => p.inventory > 0)
    .map(p => {
      const sales = salesByProduct[p.productId]?.quantity || 0
      return {
        productId: p.productId,
        name: p.name,
        quantity: sales,
        inventory: p.inventory
      }
    })
    .sort((a, b) => {
      if (a.quantity !== b.quantity) return a.quantity - b.quantity;
      return b.inventory - a.inventory; // Highest inventory first if tied
    })

  return {
    totalRevenue,
    orderCount,
    averageOrderValue,
    salesByProduct,
    salesByCategory,
    topPerformers,
    lowPerformers
  }
}

export async function getTopCrossSellPairs(merchantId: string, minOccurrences: number = 2): Promise<CrossSellPair[]> {
  const orders = await prisma.order.findMany({
    where: { merchantId },
    include: { checkoutSession: { include: { lineItems: true } } }
  })

  const products = await prisma.product.findMany()
  const productMap = new Map(products.map(p => [p.productId, p]))

  const productPresenceInOrders: Record<string, Set<string>> = {} // productId -> Set of orderIds
  
  for (const order of orders) {
    const itemIds = order.checkoutSession.lineItems.map(i => i.productId)
    for (const id of itemIds) {
      if (!productPresenceInOrders[id]) productPresenceInOrders[id] = new Set()
      productPresenceInOrders[id].add(order.orderId)
    }
  }

  const productIds = Object.keys(productPresenceInOrders)
  const pairs: CrossSellPair[] = []

  for (let i = 0; i < productIds.length; i++) {
    for (let j = i + 1; j < productIds.length; j++) {
      const idA = productIds[i]
      const idB = productIds[j]
      
      const ordersWithA = productPresenceInOrders[idA]
      const ordersWithB = productPresenceInOrders[idB]
      
      let coOccurrenceCount = 0
      for (const orderId of ordersWithA) {
        if (ordersWithB.has(orderId)) coOccurrenceCount++
      }

      if (coOccurrenceCount >= minOccurrences) {
        const freqA = coOccurrenceCount / ordersWithA.size
        const freqB = coOccurrenceCount / ordersWithB.size
        
        const nameA = productMap.get(idA)?.name || idA
        const nameB = productMap.get(idB)?.name || idB

        // We register the pair in the direction of the highest frequency base
        // e.g., if 80% of people who buy Socks buy Shoes, but only 20% of Shoes buy Socks.
        if (freqA >= freqB) {
          pairs.push({
            productIdA: idA,
            productIdB: idB,
            productNameA: nameA,
            productNameB: nameB,
            coOccurrenceCount,
            frequency: Math.round(freqA * 100)
          })
        } else {
          pairs.push({
            productIdA: idB,
            productIdB: idA,
            productNameA: nameB,
            productNameB: nameA,
            coOccurrenceCount,
            frequency: Math.round(freqB * 100)
          })
        }
      }
    }
  }

  return pairs.sort((a, b) => b.frequency - a.frequency)
}
