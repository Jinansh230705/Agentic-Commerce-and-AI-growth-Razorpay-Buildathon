import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

test.describe('Failure Scenarios', () => {
  let productId: string

  test.beforeAll(async () => {
    const product = await prisma.product.findFirst({
      where: { availability: 'in_stock' }
    })
    if (product) productId = product.productId
  })

  test('Payment failure webhook', async ({ request }) => {
    // 1. Setup an order in the database manually for testing
    const checkoutId = `chk_fail_${Date.now()}`
    const rzpOrderId = `order_fail_${Date.now()}`

    await prisma.checkoutSession.create({
      data: {
        checkoutId,
        merchantId: 'mrc_aster_gear',
        amount: 4999,
        currency: 'INR',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: 'PAYMENT_PENDING'
      }
    })

    const order = await prisma.order.create({
      data: {
        orderId: `ord_fail_${Date.now()}`,
        checkoutSessionId: checkoutId,
        merchantId: 'mrc_aster_gear',
        totalAmount: 4999,
        currency: 'INR',
        status: 'ORDER_PENDING',
        paymentStatus: 'PAYMENT_PENDING',
        razorpayOrderId: rzpOrderId
      }
    })

    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: rzpOrderId,
            amount: 4999,
            currency: 'INR',
            error_description: 'Payment failed'
          }
        }
      }
    }

    const payloadStr = JSON.stringify(payload)
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret'
    const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex')

    const res = await request.post('/api/webhooks/razorpay', {
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `evt_fail_${Date.now()}`,
        'Content-Type': 'application/json'
      },
      data: payloadStr
    })

    expect(res.ok()).toBeTruthy()

    // 3. Verify Order updated in DB
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } })
    expect(updatedOrder?.status).toBe('ORDER_FAILED')
    expect(updatedOrder?.paymentStatus).toBe('PAYMENT_FAILED')
  })

  test('Duplicate checkout completion', async ({ request }) => {
    // 1. Create Checkout
    const createRes = await request.post('/api/checkout', {
      data: { merchantId: 'mrc_aster_gear', items: [{ productId, quantity: 1 }] }
    })
    const checkout = await createRes.json()
    const checkoutId = checkout.checkoutId

    // 2. Complete Checkout (Triggers Razorpay Order creation)
    const completeRes1 = await request.post(`/api/checkout/${checkoutId}/complete`)
    expect(completeRes1.ok()).toBeTruthy()
    const order1 = await completeRes1.json()

    // 3. Complete Checkout again
    const completeRes2 = await request.post(`/api/checkout/${checkoutId}/complete`)
    expect(completeRes2.ok()).toBeTruthy() // Should be idempotent
    const order2 = await completeRes2.json()

    // Expect idempotent result
    expect(order1.orderId).toBe(order2.orderId)
    expect(order1.razorpayOrderId).toBe(order2.razorpayOrderId)
  })

  test('Merchant checkout failure (invalid product)', async ({ request }) => {
    const createRes = await request.post('/api/checkout', {
      data: { merchantId: 'mrc_aster_gear', items: [{ productId: 'invalid_product_id', quantity: 1 }] }
    })
    // Expect 400 or 404 because product doesn't exist
    expect(createRes.status()).toBeGreaterThanOrEqual(400)
  })

  test('Product becomes unavailable before checkout creation', async ({ request }) => {
    // Manually mark a product out of stock
    const oosProduct = await prisma.product.findFirst({
      where: { availability: 'out_of_stock' }
    })
    
    if (oosProduct) {
      const createRes = await request.post('/api/checkout', {
        data: { merchantId: 'mrc_aster_gear', items: [{ productId: oosProduct.productId, quantity: 1 }] }
      })
      expect(createRes.status()).toBe(400)
      const data = await createRes.json()
      expect(data.error).toBe('Some products are unavailable')
    }
  })
})
