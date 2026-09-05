import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

test.describe.serial('Phase 4 AP2 Authorization Security', () => {
  let checkoutId: string
  let mandateId: string
  
  let merchantId: string
  let productId: string

  test.beforeEach(async ({ request }) => {
    merchantId = `mrc_${crypto.randomUUID()}`
    productId = `prod_${crypto.randomUUID()}`

    // Create merchant & product
    const merchant = await prisma.merchant.create({
      data: {
        merchantId: merchantId,
        name: 'Test Merchant',
        domain: '127.0.0.1:3000',
        description: 'Test',
        categories: '[]',
        supportedRegions: '[]',
        policies: '{}',
        capabilities: '[]'
      }
    })

    const product = await prisma.product.create({
      data: {
        productId: productId,
        slug: `prod-test-${crypto.randomUUID()}`,
        name: 'Test Product',
        description: 'Test',
        brand: 'Test',
        category: 'Test',
        priceAmount: 1000,
        inventory: 10,
        images: '[]',
        attributes: '{}',
        shipping: '{}',
        returns: '{}',
        merchant: { connect: { merchantId } }
      }
    })

    // Create checkout
    const checkoutRes = await request.post('/api/checkout', {
      data: {
        merchantId: merchant.merchantId,
        items: [{ productId: product.productId, quantity: 2 }],
        capabilities: ['ap2']
      }
    })
    const data = await checkoutRes.json()
    if (!checkoutRes.ok()) console.log('Checkout create error:', data)
    checkoutId = data.checkoutId
    
    // Test that merchant authorization is generated
    expect(data['ap2.merchant_authorization']).toBeDefined()
    expect(data['ap2.merchant_authorization'].split('.').length).toBe(3) // Valid detached JWS format (header..signature)
  })

  test('Happy Path: Generates mandate and consumes it successfully', async ({ request }) => {
    // 1. Authorize
    const authRes = await request.post('/api/buyer/authorize', {
      data: { checkoutId }
    })
    const authData = await authRes.json()
    if (!authRes.ok()) console.log('Auth error:', authData)
    expect(authRes.ok()).toBeTruthy()
    expect(authData.mandateId).toBeDefined()
    expect(authData.status).toBe('AUTHORIZED')

    mandateId = authData.mandateId

    // 2. Complete order with mandate
    const completeRes = await request.post(`/api/checkout/${checkoutId}/complete`, {
      data: { 'ap2.checkout_mandate': mandateId }
    })
    const completeData = await completeRes.json()
    expect(completeRes.ok()).toBeTruthy()
    expect(completeData.status).toBe('ORDER_PENDING')

    // 3. Verify mandate consumed
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { mandateId }
    })
    expect(mandate?.status).toBe('CONSUMED')
  })

  test('Replay Protection: Prevents consuming the same mandate twice', async ({ request }) => {
    // 1. Authorize
    const authRes = await request.post('/api/buyer/authorize', { data: { checkoutId } })
    const authData = await authRes.json()
    mandateId = authData.mandateId

    // 2. Consume first time
    await request.post(`/api/checkout/${checkoutId}/complete`, { data: { 'ap2.checkout_mandate': mandateId } })

    // 3. To test mandate replay specifically, we bypass checkout idempotency by deleting the existing order
    // and resetting the checkout status
    await prisma.order.deleteMany({ where: { checkoutSessionId: checkoutId } })
    await prisma.checkoutSession.update({
      where: { checkoutId },
      data: { status: 'PENDING' }
    })

    const replayRes = await request.post(`/api/checkout/${checkoutId}/complete`, { data: { 'ap2.checkout_mandate': mandateId } })
    expect(replayRes.ok()).toBeFalsy()
    // If we create a new checkout and try to use the same mandate, it will fail because mandate checkoutId mismatch.
    // If we delete the order to simulate failure and retry, mandate is CONSUMED.
  })

  test('Checkout Mutation Protection: Fails if checkout amount changes after authorization', async ({ request }) => {
    // 1. Authorize
    const authRes = await request.post('/api/buyer/authorize', { data: { checkoutId } })
    const authData = await authRes.json()
    mandateId = authData.mandateId

    // 2. Mutate checkout amount directly in DB (simulating an unauthorized backend change or cart update)
    await prisma.checkoutSession.update({
      where: { checkoutId },
      data: { amount: 9999 } // changed amount
    })

    // 3. Attempt to complete with the original mandate
    const completeRes = await request.post(`/api/checkout/${checkoutId}/complete`, { data: { 'ap2.checkout_mandate': mandateId } })
    expect(completeRes.status()).toBe(400)
    const completeData = await completeRes.json()
    expect(completeData.error).toContain('Checkout mutated after authorization')

    // 4. Verify mandate revoked
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { mandateId }
    })
    expect(mandate?.status).toBe('REVOKED')
  })
})
