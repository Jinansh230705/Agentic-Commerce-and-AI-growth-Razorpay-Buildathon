import { NextRequest, NextResponse } from 'next/server'
import { registryPrisma } from '@/lib/registry/prober'

export async function GET(
  req: NextRequest,
  { params }: any
) {
  try {
    const { id } = await params
    const merchant = await registryPrisma.registeredMerchant.findUnique({
      where: { id },
      include: {
        capabilities: true
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found in registry' }, { status: 404 })
    }

    return NextResponse.json({
      id: merchant.id,
      domain: merchant.domain,
      name: merchant.name,
      status: merchant.status,
      description: merchant.description,
      categories: merchant.categories,
      lastVerifiedAt: merchant.lastVerifiedAt,
      capabilities: merchant.capabilities.map((c: any) => ({
        type: c.capabilityType,
        endpoint: c.endpoint,
        status: c.verificationStatus,
        lastVerifiedAt: c.lastVerifiedAt
      }))
    })
  } catch (error) {
    console.error('Merchant retrieval error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
