import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: any
) {
  const { id: checkoutId } = await params
  
  try {
    const body = await req.json()
    const { requestedDiscountPercent } = body

    if (typeof requestedDiscountPercent !== 'number') {
      return NextResponse.json({ error: 'Invalid discount percentage' }, { status: 400 })
    }

    const checkout = await prisma.checkoutSession.findUnique({
      where: { checkoutId },
      include: { lineItems: true }
    })

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { merchantId: checkout.merchantId }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const capabilities = JSON.parse(merchant.capabilities || '[]')
    if (!capabilities.includes('negotiation')) {
      return NextResponse.json({ error: 'Merchant does not support negotiation' }, { status: 403 })
    }

    const policies = JSON.parse(merchant.policies || '{}')
    const maxDiscount = policies.maxDiscountPercent || 0

    if (requestedDiscountPercent > maxDiscount) {
      return NextResponse.json({ 
        error: `Requested discount (${requestedDiscountPercent}%) exceeds merchant maximum allowed policy (${maxDiscount}%).` 
      }, { status: 403 })
    }

    if (checkout.status !== 'CHECKOUT_CREATED' && checkout.status !== 'CHECKOUT_UPDATED') {
      return NextResponse.json({ error: 'Checkout is not in a modifiable state' }, { status: 400 })
    }

    // Re-calculate the base amount from line items
    let baseAmount = 0
    for (const item of checkout.lineItems) {
      baseAmount += (item.priceAmount * item.quantity)
    }

    // Apply the discount
    const discountAmount = Math.floor(baseAmount * (requestedDiscountPercent / 100))
    const newAmount = baseAmount - discountAmount

    // Add shipping fee if there is a shipping address
    // We assume a flat fee of 50 INR for this demo as defined in seed policies
    let finalAmount = newAmount
    if (checkout.shippingAddress) {
      finalAmount += 50
    }

    // Update the checkout
    const updatedCheckout = await prisma.checkoutSession.update({
      where: { checkoutId },
      data: {
        amount: finalAmount,
        status: 'CHECKOUT_UPDATED'
      },
      include: { lineItems: true }
    })

    return NextResponse.json(updatedCheckout)

  } catch (error: any) {
    console.error('Error negotiating checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
