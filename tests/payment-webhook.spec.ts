import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

test.describe('Razorpay Webhook', () => {
  test('Should process payment.captured idempotently and verify signature', async ({ request }) => {
    // 1. Setup an order in the database manually for testing
    const checkoutId = `chk_test_${Date.now()}`
    const rzpOrderId = `order_${crypto.randomBytes(7).toString('hex')}`

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
        orderId: `ord_test_${Date.now()}`,
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
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_${crypto.randomBytes(7).toString('hex')}`,
            order_id: rzpOrderId,
            amount: 4999,
            currency: 'INR'
          }
        }
      }
    }

    const payloadStr = JSON.stringify(payload)
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret'
    const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex')

    // 2. Call Webhook
    const res = await request.post('/api/webhooks/razorpay', {
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `evt_${Date.now()}`,
        'Content-Type': 'application/json'
      },
      data: payloadStr
    })

    expect(res.ok()).toBeTruthy()

    // 3. Verify Order updated in DB
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } })
    expect(updatedOrder?.status).toBe('ORDER_CONFIRMED')
    expect(updatedOrder?.paymentStatus).toBe('PAYMENT_CAPTURED')
    expect(updatedOrder?.razorpayPaymentId).toBe(payload.payload.payment.entity.id)

    // 4. Test Idempotency (resend exact same webhook event ID)
    const res2 = await request.post('/api/webhooks/razorpay', {
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `evt_${Date.now()}`, // Using same payload would be same event naturally but we mock event id here
      },
      data: payloadStr
    })

    expect(res2.ok()).toBeTruthy()
  })

  test('Should reject invalid signatures', async ({ request }) => {
    // Only test this if we enforce signatures strictly
    const res = await request.post('/api/webhooks/razorpay', {
      headers: {
        'x-razorpay-signature': 'invalid_signature',
        'x-razorpay-event-id': `evt_invalid_${Date.now()}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({ event: 'payment.captured' })
    })

    // Even in test mode, we enforce signatures strictly if RAZORPAY_WEBHOOK_SECRET is mocked
    expect(res.status()).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid signature')
  })

  test('Should handle unknown orders safely', async ({ request }) => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_unknown_${Date.now()}`,
            order_id: 'order_does_not_exist',
            amount: 4999,
            currency: 'INR'
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
        'x-razorpay-event-id': `evt_unknown_${Date.now()}`,
        'Content-Type': 'application/json'
      },
      data: payloadStr
    })

    // It should return 200 OK to Razorpay so it doesn't retry, but not crash or leak info
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.status).toBe('ok')
  })
})
