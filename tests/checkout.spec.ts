import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

test.describe('UCP Checkout API', () => {
  let productId: string

  test.beforeAll(async () => {
    // Ensure we have a product
    const product = await prisma.product.findFirst({
      where: { availability: 'in_stock' }
    })
    if (product) productId = product.productId
  })

  test('should create, update, and complete a checkout session', async ({ request }) => {
    // 1. Create Checkout
    const createRes = await request.post('/api/checkout', {
      data: {
        merchantId: 'mrc_aster_gear',
        items: [{ productId, quantity: 1 }]
      }
    })
    
    expect(createRes.ok()).toBeTruthy()
    const checkout = await createRes.json()
    expect(checkout.status).toBe('CHECKOUT_CREATED')
    expect(checkout.checkoutId).toBeDefined()
    expect(checkout.amount).toBeGreaterThan(0)
    
    const checkoutId = checkout.checkoutId

    // 2. Get Checkout
    const getRes = await request.get(`/api/checkout/${checkoutId}`)
    expect(getRes.ok()).toBeTruthy()
    const fetchedCheckout = await getRes.json()
    expect(fetchedCheckout.checkoutId).toBe(checkoutId)

    // 3. Update Checkout
    const updateRes = await request.patch(`/api/checkout/${checkoutId}`, {
      data: { shippingAddress: { country: 'India', city: 'Mumbai' } }
    })
    expect(updateRes.ok()).toBeTruthy()
    const updatedCheckout = await updateRes.json()
    expect(updatedCheckout.status).toBe('CHECKOUT_UPDATED')
    expect(updatedCheckout.shippingAddress.city).toBe('Mumbai')

    // 4. Complete Checkout
    const completeRes = await request.post(`/api/checkout/${checkoutId}/complete`)
    expect(completeRes.ok()).toBeTruthy()
    const order = await completeRes.json()
    expect(order.status).toBe('ORDER_PENDING')
    expect(order.orderId).toBeDefined()

    // 5. Check Idempotency
    const retryRes = await request.post(`/api/checkout/${checkoutId}/complete`)
    expect(retryRes.ok()).toBeTruthy()
    const retryOrder = await retryRes.json()
    expect(retryOrder.orderId).toBe(order.orderId) // Returns same order

    // 6. Cannot update completed checkout
    const badUpdateRes = await request.patch(`/api/checkout/${checkoutId}`, {
      data: { shippingAddress: { city: 'Delhi' } }
    })
    expect(badUpdateRes.status()).toBe(400) // Bad request
  })
})
