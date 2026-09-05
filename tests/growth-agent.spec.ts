import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

test.describe.serial('Phase 5 Merchant Growth Agent', () => {
  let merchantId: string
  let productAId: string
  let productBId: string
  let productCId: string

  test.beforeAll(async () => {
    merchantId = `mrc_${crypto.randomUUID()}`
    
    await prisma.merchant.create({
      data: {
        merchantId, name: 'Growth Test Merchant', domain: '127.0.0.1:3000',
        description: 'Test', categories: '[]', supportedRegions: '[]', policies: '{}', capabilities: '[]'
      }
    })

    const pA = await prisma.product.create({
      data: {
        productId: `prod_A_${crypto.randomUUID()}`, slug: `slug_A_${crypto.randomUUID()}`, name: 'Product A',
        description: 'A', brand: 'B', category: 'C', priceAmount: 1000, inventory: 100,
        images: '[]', attributes: '{}', shipping: '{}', returns: '{}'
      }
    })
    productAId = pA.productId

    const pB = await prisma.product.create({
      data: {
        productId: `prod_B_${crypto.randomUUID()}`, slug: `slug_B_${crypto.randomUUID()}`, name: 'Product B',
        description: 'B', brand: 'B', category: 'C', priceAmount: 500, inventory: 100,
        images: '[]', attributes: '{}', shipping: '{}', returns: '{}'
      }
    })
    productBId = pB.productId
    
    const pC = await prisma.product.create({
      data: {
        productId: `prod_C_${crypto.randomUUID()}`, slug: `slug_C_${crypto.randomUUID()}`, name: 'Product C - Slow Mover',
        description: 'C', brand: 'B', category: 'C', priceAmount: 2000, inventory: 999999, // Massively high inventory so it sorts to top
        images: '[]', attributes: '{}', shipping: '{}', returns: '{}'
      }
    })
    productCId = pC.productId

    // Simulate 5 orders. 4 of them have A + B (Cross-sell 80%)
    for (let i = 0; i < 5; i++) {
      const checkout = await prisma.checkoutSession.create({
        data: {
          checkoutId: `chk_${crypto.randomUUID()}`,
          merchantId, amount: 1500, currency: 'INR', status: 'COMPLETED', expiresAt: new Date(),
          lineItems: {
            create: [
              { productId: productAId, quantity: 1, priceAmount: 1000, currency: 'INR' },
              ...(i < 4 ? [{ productId: productBId, quantity: 1, priceAmount: 500, currency: 'INR' }] : [])
            ]
          }
        }
      })
      await prisma.order.create({
        data: {
          orderId: `ord_${crypto.randomUUID()}`, checkoutSessionId: checkout.checkoutId,
          merchantId, totalAmount: i < 4 ? 1500 : 1000, currency: 'INR', status: 'PAYMENT_CAPTURED'
        }
      })
    }
  })

  test('Analytics correctly identifies cross-sell and low performers', async () => {
    const { getMerchantMetrics, getTopCrossSellPairs } = await import('../src/lib/merchant/analytics')
    
    const metrics = await getMerchantMetrics(merchantId)
    expect(metrics.orderCount).toBe(5)
    expect(metrics.totalRevenue).toBe(4 * 1500 + 1000)
    
    // C has 0 sales, 200 inventory
    const lowPerf = metrics.lowPerformers.find(p => p.productId === productCId)
    expect(lowPerf).toBeDefined()
    expect(lowPerf?.quantity).toBe(0)

    const crossSells = await getTopCrossSellPairs(merchantId, 2)
    const pairAB = crossSells.find(p => (p.productIdA === productAId && p.productIdB === productBId) || (p.productIdA === productBId && p.productIdB === productAId))
    expect(pairAB).toBeDefined()
    expect(pairAB?.frequency).toBe(100) // 4 out of 4 for product B is 100%
  })

  test('AI cannot directly execute an action; requires boundary transition', async ({ request }) => {
    const { detectGrowthOpportunities } = await import('../src/lib/merchant/opportunity-engine')
    const opps = await detectGrowthOpportunities(merchantId)
    const discountOpp = opps.find(o => o.type === 'LOW_PERFORMER' && o.affectedProducts.includes(productCId))
    expect(discountOpp).toBeDefined()

    // 1. Propose action via AI tool boundary
    const proposeRes = await request.post('/api/growth/actions', {
      data: {
        opportunityId: discountOpp!.id,
        merchantId,
        actionType: 'CREATE_DISCOUNT',
        proposedValues: JSON.stringify({ targetPrice: 1800 }) // 10% discount on 2000
      }
    })
    const action = await proposeRes.json()
    expect(action.status).toBe('REVIEW_REQUIRED')

    // 2. Attempt execution without approval
    const executeResFail = await request.post(`/api/growth/actions/${action.id}/execute`)
    expect(executeResFail.status()).toBe(403)
    const failData = await executeResFail.json()
    expect(failData.error).toContain('Cannot execute action in status REVIEW_REQUIRED')

    // 3. Approve via UI endpoint
    const approveRes = await request.post(`/api/growth/actions/${action.id}/approve`)
    expect(approveRes.ok()).toBeTruthy()

    // 4. Execute
    const executeRes = await request.post(`/api/growth/actions/${action.id}/execute`)
    expect(executeRes.ok()).toBeTruthy()
    const executedAction = await executeRes.json()
    expect(executedAction.status).toBe('EXECUTED')
    expect(executedAction.baselineMetric).toBe(2000)

    // Verify product price updated
    const updatedProduct = await prisma.product.findUnique({ where: { productId: productCId } })
    expect(updatedProduct?.priceAmount).toBe(1800)
  })

  test('Server strictly enforces discount constraints (blocking 50% discount)', async ({ request }) => {
    const opp = await prisma.growthOpportunity.findFirst({
      where: {
        merchantId,
        type: 'LOW_PERFORMER',
        affectedProducts: { contains: productCId }
      }
    })
    expect(opp).toBeDefined()

    // Propose an illegal action (50% discount)
    // Server limits max to 20% off 2000 = 1600 minimum. 1000 is illegal. (Or if previous test ran, 20% off 1800)
    const proposeRes = await request.post('/api/growth/actions', {
      data: {
        opportunityId: opp!.id,
        merchantId,
        actionType: 'CREATE_DISCOUNT',
        proposedValues: JSON.stringify({ targetPrice: 1000 })
      }
    })
    
    expect(proposeRes.status()).toBe(403)
    const data = await proposeRes.json()
    expect(data.error).toContain('ACTION BLOCKED')
    expect(data.constraints).toContain('Maximum allowed discount is 20%')
  })

  test('Concurrency: Atomic execution prevents multiple executions', async ({ request }) => {
    const opp = await prisma.growthOpportunity.findFirst({
      where: { merchantId, type: 'LOW_PERFORMER', affectedProducts: { contains: productCId } }
    })
    // 1. Propose action
    const proposeRes = await request.post('/api/growth/actions', {
      data: {
        opportunityId: opp!.id,
        merchantId,
        actionType: 'CREATE_DISCOUNT',
        proposedValues: JSON.stringify({ targetPrice: 1750 })
      }
    })
    const action = await proposeRes.json()
    await request.post(`/api/growth/actions/${action.id}/approve`)

    // 2. Execute simultaneously
    const res1Promise = request.post(`/api/growth/actions/${action.id}/execute`)
    const res2Promise = request.post(`/api/growth/actions/${action.id}/execute`)
    
    const [res1, res2] = await Promise.all([res1Promise, res2Promise])
    
    // Exactly one should succeed, the other should fail with 403 or 500 containing Concurrency Error
    const successes = [res1.ok(), res2.ok()].filter(Boolean).length
    expect(successes).toBe(1)
  })

  test('Measurement Loop: Evaluates EXECUTED actions', async ({ request }) => {
    // 1. Create a fake EXECUTED action
    const opp = await prisma.growthOpportunity.findFirst({
      where: { merchantId, type: 'LOW_PERFORMER', affectedProducts: { contains: productCId } }
    })
    const action = await prisma.growthAction.create({
      data: {
        merchantId,
        opportunityId: opp!.id,
        actionType: 'CREATE_DISCOUNT',
        proposedValues: '{}',
        constraints: '{}',
        status: 'EXECUTED',
        baselineMetric: 2000
      }
    })

    // Create 3 orders for productC to guarantee SUCCESS
    for (let i = 0; i < 3; i++) {
      await prisma.checkoutSession.create({
        data: {
          checkoutId: `chk_msr_${crypto.randomUUID()}`,
          merchantId, amount: 1800, currency: 'INR', status: 'COMPLETED', expiresAt: new Date(),
          updatedAt: new Date(Date.now() + 1000), // Ensure it is after action.updatedAt
          lineItems: {
            create: [{ productId: productCId, quantity: 1, priceAmount: 1800, currency: 'INR' }]
          }
        }
      })
    }

    // 2. Call Measure API
    const measureRes = await request.post('/api/growth/actions/measure', {
      data: { merchantId }
    })
    expect(measureRes.ok()).toBeTruthy()
    const measureData = await measureRes.json()

    // 3. Verify it was measured as SUCCESS
    const measuredAction = measureData.actions.find((a: any) => a.id === action.id)
    expect(measuredAction).toBeDefined()
    expect(measuredAction.status).toBe('MEASURED')
    expect(measuredAction.outcome).toBe('SUCCESS')
    expect(measuredAction.postActionMetric).toBe(3)
  })
})
