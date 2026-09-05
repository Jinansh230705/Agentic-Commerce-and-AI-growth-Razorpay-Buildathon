import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    
    const skip = (page - 1) * limit
    
    const whereClause = category ? { category } : {}

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { variants: true }
      }),
      prisma.product.count({ where: whereClause })
    ])

    const formattedProducts = products.map((product: any) => ({
      ...product,
      images: JSON.parse(product.images),
      attributes: JSON.parse(product.attributes),
      shipping: JSON.parse(product.shipping),
      returns: JSON.parse(product.returns),
      warranty: product.warranty ? JSON.parse(product.warranty) : null,
      variants: product.variants.map((v: any) => ({
        ...v,
        attributes: JSON.parse(v.attributes)
      }))
    }))

    return NextResponse.json({
      items: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        has_next: skip + products.length < total
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
