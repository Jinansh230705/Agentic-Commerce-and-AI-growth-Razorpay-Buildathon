import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { merchantId: 'mrc_aster_gear' },
      select: { categories: true }
    })

    if (!merchant) {
      return NextResponse.json(
        { error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      categories: JSON.parse(merchant.categories)
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
