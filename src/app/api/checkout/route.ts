import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let { items, merchantId } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid items' }, { status: 400 })
    }

    if (!merchantId) {
      const firstProduct = await prisma.product.findFirst({
        where: { 
          OR: [
            { productId: items[0].productId },
            { id: items[0].productId }
          ]
        }
      })
      if (firstProduct) {
        merchantId = firstProduct.merchantId
      } else {
        return NextResponse.json({ error: 'Missing merchantId and could not infer from items' }, { status: 400 })
      }
    }

    // Retrieve products to calculate totals
    let totalAmount = 0
    let currency = 'INR' // Assuming default INR for Aster Gear

    const lineItemsData = []

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { 
          OR: [
            { productId: item.productId },
            { id: item.productId }
          ]
        }
      })

      if (!product || product.availability !== 'in_stock' || product.inventory < item.quantity) {
        return NextResponse.json({ error: `Product ${item.productId} is unavailable or out of stock` }, { status: 400 })
      }

      if (product.merchantId !== merchantId) {
        return NextResponse.json({ error: `Product ${item.productId} does not belong to merchant ${merchantId}` }, { status: 400 })
      }

      const itemPrice = product.priceAmount
      totalAmount += itemPrice * item.quantity

      lineItemsData.push({
        productId: product.productId,
        quantity: item.quantity,
        priceAmount: itemPrice,
        currency: product.currency
      })
    }

    const checkoutId = `chk_${crypto.randomBytes(8).toString('hex')}`
    
    // Create Checkout Session
    const checkout = await prisma.checkoutSession.create({
      data: {
        checkoutId,
        merchantId: merchantId,
        amount: totalAmount,
        currency,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
        status: 'CHECKOUT_CREATED',
        lineItems: {
          create: lineItemsData
        }
      },
      include: {
        lineItems: true
      }
    })

    const responsePayload: any = {
      checkoutId: checkout.checkoutId,
      status: checkout.status,
      amount: checkout.amount,
      currency: checkout.currency,
      expiresAt: checkout.expiresAt,
      lineItems: checkout.lineItems,
      _meta: {
        ui: {
          resourceUri: `/checkout/${checkout.checkoutId}`
        }
      }
    }

    const { capabilities } = body
    if (capabilities && Array.isArray(capabilities) && capabilities.includes('ap2')) {
      // @ts-ignore
      const canonicalize = (await import('canonicalize')).default
      // Simulate merchant key pair for demonstrator
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
      
      const header = {
        alg: 'EdDSA',
        kid: 'merchant_key_simulated'
      }
      const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
      
      const canonicalPayload = canonicalize(responsePayload)
      const b64Payload = Buffer.from(canonicalPayload as string).toString('base64url')
      
      const signInput = `${b64Header}.${b64Payload}`
      const signature = crypto.sign(null, Buffer.from(signInput), privateKey).toString('base64url')
      
      // Detached JWS
      responsePayload['ap2.merchant_authorization'] = `${b64Header}..${signature}`
      // For verification later if needed by tests, we normally wouldn't include the public key in the response payload directly like this in prod,
      // but for demonstration we can expose it via headers or assume the buyer has it.
      // We will not expose it here to stick to the spec.
    }

    return NextResponse.json(responsePayload, { status: 201 })

  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
