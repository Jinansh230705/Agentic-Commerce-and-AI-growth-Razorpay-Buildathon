import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder } from '../../../../../lib/payment/razorpay'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: any) {
  try {
    const { id } = await params;
    
    const checkout = await prisma.checkoutSession.findUnique({
      where: { checkoutId: id }
    })

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    // Idempotency: if already completed or has a razorpay order, return it
    const existingOrder = await prisma.order.findUnique({
      where: { checkoutSessionId: id }
    })

    if (existingOrder) {
      return NextResponse.json({
        status: existingOrder.status,
        paymentStatus: existingOrder.paymentStatus,
        orderId: existingOrder.orderId,
        razorpayOrderId: existingOrder.razorpayOrderId,
        amount: existingOrder.totalAmount,
        currency: existingOrder.currency
      })
    }

    if (checkout.status !== 'CHECKOUT_CREATED' && checkout.status !== 'CHECKOUT_UPDATED') {
      return NextResponse.json({ error: 'Checkout cannot be completed in its current state' }, { status: 400 })
    }

    if (new Date() > checkout.expiresAt) {
      await prisma.checkoutSession.update({
        where: { checkoutId: id },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json({ error: 'Checkout expired' }, { status: 400 })
    }

    const payload = await req.json().catch(() => ({}))
    const mandateId = payload['ap2.checkout_mandate']

    const mandateCount = await prisma.authorizationMandate.count({
      where: { checkoutSessionId: id }
    })

    if (mandateCount > 0 || mandateId) {
      if (!mandateId) {
        return NextResponse.json({ error: 'ap2.checkout_mandate is required for authorization' }, { status: 400 })
      }

      // AP2 MANDATE VERIFICATION
      const mandate = await prisma.authorizationMandate.findUnique({
        where: { mandateId }
      })

      if (!mandate || mandate.checkoutSessionId !== checkout.checkoutId) {
        return NextResponse.json({ error: 'Invalid mandate for this checkout' }, { status: 400 })
      }

      if (mandate.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Mandate is no longer active (already consumed, revoked, or expired)' }, { status: 400 })
      }

      if (new Date() > mandate.expiresAt) {
        return NextResponse.json({ error: 'Mandate has expired' }, { status: 400 })
      }

      // Verify cryptographic signature
      const mandatePayload = {
        mandateId: mandate.mandateId,
        checkoutId: mandate.checkoutSessionId,
        merchantId: mandate.merchantId,
        amount: mandate.amount,
        currency: mandate.currency,
        expiresAt: mandate.expiresAt.toISOString()
      }
      const payloadString = JSON.stringify(mandatePayload)
      
      try {
        const isValidSignature = crypto.verify(
          null,
          Buffer.from(payloadString),
          mandate.publicKey,
          Buffer.from(mandate.signature, 'base64')
        )
        if (!isValidSignature) {
          throw new Error('Invalid signature')
        }
      } catch (err) {
        return NextResponse.json({ error: 'Mandate signature verification failed' }, { status: 400 })
      }

      // Verify against checkout mutation
      if (checkout.amount !== mandate.amount || checkout.currency !== mandate.currency || checkout.merchantId !== mandate.merchantId) {
        await prisma.authorizationMandate.update({
          where: { mandateId: mandate.mandateId },
          data: { status: 'REVOKED' }
        })
        return NextResponse.json({ error: 'Checkout mutated after authorization. Mandate revoked.' }, { status: 400 })
      }

      // Atomically consume mandate
      const updateResult = await prisma.authorizationMandate.updateMany({
        where: { mandateId: mandate.mandateId, status: 'ACTIVE' },
        data: { status: 'CONSUMED', consumedAt: new Date() }
      })

      if (updateResult.count === 0) {
        return NextResponse.json({ error: 'Mandate was consumed concurrently' }, { status: 409 })
      }
    }

    // Generate internal order ID
    const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`

    // Create Razorpay Order
    // Note: The amount in our database is in base INR (e.g., 4999 implies ₹4999).
    // Razorpay expects the amount in the smallest currency unit (paise).
    // Therefore, we must multiply the amount by 100 before passing it.
    let razorpayOrderId: string | null = null;
    try {
      const amountInPaise = checkout.amount * 100;
      const rzpOrder = await createRazorpayOrder(amountInPaise, checkout.currency, orderId)
      razorpayOrderId = rzpOrder.id
    } catch (err: any) {
      console.error('Razorpay order creation failed:', err.message)
      return NextResponse.json({ error: 'Failed to create payment order with processor' }, { status: 500 })
    }

    // Create order locally
    const [updatedCheckout, order] = await prisma.$transaction([
      prisma.checkoutSession.update({
        where: { checkoutId: id },
        data: { status: 'PAYMENT_PENDING' }
      }),
      prisma.order.create({
        data: {
          orderId,
          checkoutSessionId: id,
          merchantId: checkout.merchantId,
          totalAmount: checkout.amount,
          currency: checkout.currency,
          status: 'ORDER_PENDING',
          paymentStatus: 'PAYMENT_PENDING',
          razorpayOrderId: razorpayOrderId
        }
      })
    ])

    return NextResponse.json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.totalAmount,
      currency: order.currency
    }, { status: 200 })

  } catch (error) {
    console.error('Complete checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
