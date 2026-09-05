import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: any) {
  try {
    const { id } = await params;

    const checkout = await prisma.checkoutSession.findUnique({
      where: { checkoutId: id },
      include: { lineItems: true }
    })

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    return NextResponse.json({
      checkoutId: checkout.checkoutId,
      status: checkout.status,
      amount: checkout.amount,
      currency: checkout.currency,
      expiresAt: checkout.expiresAt,
      shippingAddress: checkout.shippingAddress ? JSON.parse(checkout.shippingAddress) : null,
      buyerInfo: checkout.buyerInfo ? JSON.parse(checkout.buyerInfo) : null,
      lineItems: checkout.lineItems
    })

  } catch (error) {
    console.error('Get checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { shippingAddress, buyerInfo } = body

    const checkout = await prisma.checkoutSession.findUnique({
      where: { checkoutId: id }
    })

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.status !== 'CHECKOUT_CREATED' && checkout.status !== 'CHECKOUT_UPDATED') {
      return NextResponse.json({ error: 'Checkout cannot be updated in its current state' }, { status: 400 })
    }

    const updatedCheckout = await prisma.checkoutSession.update({
      where: { checkoutId: id },
      data: {
        status: 'CHECKOUT_UPDATED',
        ...(shippingAddress && { shippingAddress: JSON.stringify(shippingAddress) }),
        ...(buyerInfo && { buyerInfo: JSON.stringify(buyerInfo) })
      },
      include: { lineItems: true }
    })

    return NextResponse.json({
      checkoutId: updatedCheckout.checkoutId,
      status: updatedCheckout.status,
      amount: updatedCheckout.amount,
      currency: updatedCheckout.currency,
      expiresAt: updatedCheckout.expiresAt,
      shippingAddress: updatedCheckout.shippingAddress ? JSON.parse(updatedCheckout.shippingAddress) : null,
      buyerInfo: updatedCheckout.buyerInfo ? JSON.parse(updatedCheckout.buyerInfo) : null,
      lineItems: updatedCheckout.lineItems
    })

  } catch (error) {
    console.error('Update checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
