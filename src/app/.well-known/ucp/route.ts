import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { merchantId: 'mrc_aster_gear' }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const ucpProfile = {
      ucp_version: '1.0',
      business: {
        id: merchant.merchantId,
        name: merchant.name,
        domain: merchant.domain,
        description: merchant.description
      },
      capabilities: [
        {
          type: 'product_discovery',
          endpoint: '/api/products',
          description: 'Search and retrieve product catalog'
        },
        {
          type: 'checkout',
          endpoint: '/api/checkout',
          description: 'Create and manage UCP checkout sessions'
        }
      ],
      services: [],
      payment_capabilities: [] // Real payments omitted for Phase 1
    }

    return NextResponse.json(ucpProfile)
  } catch (error) {
    console.error('Error serving UCP profile:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
