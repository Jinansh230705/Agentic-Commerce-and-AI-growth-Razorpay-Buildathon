import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { logAuditEvent } from '../../../../lib/buyer/tools'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { checkoutId, agentId } = await req.json()

    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId is required' }, { status: 400 })
    }

    const sessionAgentId = agentId || `agent_user`

    // 1. Fetch checkout to verify it exists and get authoritative amounts
    const checkout = await prisma.checkoutSession.findUnique({
      where: { checkoutId }
    })

    if (!checkout) {
      await logAuditEvent(sessionAgentId, 'AUTHORIZATION_REJECTED', { checkoutId, reason: 'Checkout not found' })
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.status !== 'CHECKOUT_CREATED' && checkout.status !== 'CHECKOUT_UPDATED') {
      await logAuditEvent(sessionAgentId, 'AUTHORIZATION_REJECTED', { checkoutId, reason: 'Invalid checkout status' })
      return NextResponse.json({ error: 'Invalid checkout status for authorization' }, { status: 400 })
    }

    await logAuditEvent(sessionAgentId, 'AUTHORIZATION_REQUESTED', { checkoutId, amount: checkout.amount })

    // 2. Generate AP2-compatible cryptographic keypair simulating user wallet
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
    const publicKeyDer = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'pem' })

    // 3. Construct bounded AP2 mandate payload
    const mandateId = `mnd_${crypto.randomBytes(8).toString('hex')}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes validity

    const mandatePayload = {
      mandateId,
      checkoutId: checkout.checkoutId,
      merchantId: checkout.merchantId,
      amount: checkout.amount,
      currency: checkout.currency,
      expiresAt: expiresAt.toISOString()
    }

    // 4. Sign the mandate payload (deterministically stringified)
    const payloadString = JSON.stringify(mandatePayload)
    const signature = crypto.sign(null, Buffer.from(payloadString), privateKeyDer).toString('base64')

    // 5. Store bounded authorization in DB
    const mandate = await prisma.authorizationMandate.create({
      data: {
        mandateId,
        checkoutSessionId: checkout.checkoutId,
        merchantId: checkout.merchantId,
        amount: checkout.amount,
        currency: checkout.currency,
        status: 'ACTIVE',
        signature,
        publicKey: publicKeyDer,
        expiresAt
      }
    })

    await logAuditEvent(sessionAgentId, 'AUTHORIZATION_GRANTED', { mandateId, checkoutId, amount: checkout.amount })

    return NextResponse.json({
      mandateId: mandate.mandateId,
      checkoutId: checkout.checkoutId,
      status: 'AUTHORIZED',
      expiresAt: mandate.expiresAt
    })
  } catch (err: any) {
    console.error('Authorization Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
