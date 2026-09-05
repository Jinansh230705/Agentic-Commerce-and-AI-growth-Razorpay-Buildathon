import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { id } = await params
    
    // allow lookup by productId or slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { productId: id },
          { slug: id }
        ]
      },
      include: { variants: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      )
    }

    const formattedProduct = {
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
    }

    return NextResponse.json(formattedProduct)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
