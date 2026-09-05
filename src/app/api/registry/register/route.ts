import { NextRequest, NextResponse } from 'next/server'
import { registryPrisma, probeMerchant } from '@/lib/registry/prober'

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Try to normalize the domain
    let normalizedDomain: string
    try {
      const url = new URL(domain)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return NextResponse.json({ error: 'Unsupported protocol scheme' }, { status: 400 })
      }
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development' && process.env.PLAYWRIGHT_TEST !== '1') {
           return NextResponse.json({ error: 'Localhost not permitted in production' }, { status: 400 })
        }
      }
      normalizedDomain = `${url.protocol}//${url.host}`
    } catch (e) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    // Upsert merchant record as PENDING
    const merchant = await registryPrisma.registeredMerchant.upsert({
      where: { domain: normalizedDomain },
      update: {
        status: 'PENDING',
      },
      create: {
        domain: normalizedDomain,
        status: 'PENDING',
      }
    })

    // Trigger async probing without awaiting it
    // In a real system, this would be a message queue (SQS, BullMQ, etc.)
    probeMerchant(merchant.id, merchant.domain)

    return NextResponse.json({
      message: 'Registration received. Verification in progress.',
      merchantId: merchant.id,
      domain: merchant.domain,
      status: merchant.status
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
