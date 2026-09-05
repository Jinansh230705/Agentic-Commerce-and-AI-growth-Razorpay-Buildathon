import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { merchantId: 'mrc_aster_gear' }
    })

    if (!merchant) {
      return NextResponse.json(
        { error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' } },
        { status: 404 }
      )
    }

    // Parse JSON fields
    return NextResponse.json({
      ...merchant,
      categories: JSON.parse(merchant.categories),
      supportedRegions: JSON.parse(merchant.supportedRegions),
      policies: JSON.parse(merchant.policies),
      capabilities: JSON.parse(merchant.capabilities)
    })
  } catch (error) {
    console.error('Error fetching merchant:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
