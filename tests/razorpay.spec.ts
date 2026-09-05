import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

test.describe('Razorpay Order Creation', () => {
  let productId: string
  let checkoutId: string

  test.beforeAll(async () => {
    const product = await prisma.product.findFirst({
      where: { availability: 'in_stock' }
    })
    if (product) productId = product.productId
  })

  test('Completing checkout should create Razorpay Order and transition state', async ({ request }) => {
    // 1. Create Checkout
    const createRes = await request.post('/api/checkout', {
      data: { merchantId: 'mrc_aster_gear', items: [{ productId, quantity: 1 }] }
    })
    const checkout = await createRes.json()
    checkoutId = checkout.checkoutId

    // 2. Complete Checkout (Triggers Razorpay Order creation)
    const completeRes = await request.post(`/api/checkout/${checkoutId}/complete`)
    expect(completeRes.ok()).toBeTruthy()
    const order = await completeRes.json()

    // 3. Assertions
    expect(order.status).toBe('ORDER_PENDING')
    expect(order.paymentStatus).toBe('PAYMENT_PENDING')
    expect(order.razorpayOrderId).toBeDefined()
    expect(order.orderId).toBeDefined()
    
    // Validate the backend persisted it correctly
    const dbOrder = await prisma.order.findUnique({
      where: { orderId: order.orderId }
    })
    expect(dbOrder?.razorpayOrderId).toBe(order.razorpayOrderId)
  })
})
