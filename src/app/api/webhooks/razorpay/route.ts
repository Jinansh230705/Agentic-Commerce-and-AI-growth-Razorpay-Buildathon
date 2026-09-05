import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '../../../../lib/payment/razorpay'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(rawBody)
    
    // Idempotency check
    const eventId = req.headers.get('x-razorpay-event-id') || payload.id || `evt_${Date.now()}`
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId }
    })

    if (existingEvent) {
      return NextResponse.json({ status: 'ok', message: 'Already processed' }, { status: 200 })
    }

    // Process event
    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: payload.event
      }
    })

    if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
      const payment = payload.payload.payment.entity
      const razorpayOrderId = payment.order_id
      const paymentId = payment.id

      if (razorpayOrderId) {
        const order = await prisma.order.findUnique({
          where: { razorpayOrderId }
        })

        if (order) {
          // Verify amount matches
          if (order.totalAmount === payment.amount && order.currency === payment.currency) {
            await prisma.$transaction([
              prisma.order.update({
                where: { id: order.id },
                data: {
                  status: 'ORDER_CONFIRMED',
                  paymentStatus: payload.event === 'payment.captured' ? 'PAYMENT_CAPTURED' : 'PAYMENT_AUTHORIZED',
                  razorpayPaymentId: paymentId
                }
              }),
              prisma.checkoutSession.update({
                where: { checkoutId: order.checkoutSessionId },
                data: { status: 'ORDER_CONFIRMED' }
              })
            ])
          }
        }
      }
    } else if (payload.event === 'payment.failed') {
      const payment = payload.payload.payment.entity
      const razorpayOrderId = payment.order_id

      if (razorpayOrderId) {
        const order = await prisma.order.findUnique({
          where: { razorpayOrderId }
        })

        if (order) {
          await prisma.$transaction([
            prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'ORDER_FAILED',
                paymentStatus: 'PAYMENT_FAILED'
              }
            }),
            prisma.checkoutSession.update({
              where: { checkoutId: order.checkoutSessionId },
              data: { status: 'ORDER_FAILED' }
            })
          ])
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
