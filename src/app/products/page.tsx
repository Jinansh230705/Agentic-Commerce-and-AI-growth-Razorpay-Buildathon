import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SortSelect } from '@/components/SortSelect'
import Image from 'next/image'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined
  const sort = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined

  let whereClause: any = {}
  
  if (category) {
    whereClause.category = category
  }
  
  if (q) {
    whereClause.OR = [
      { name: { contains: q } },
      { description: { contains: q } }
    ]
  }

  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'price-asc') {
    orderBy = { priceAmount: 'asc' }
  } else if (sort === 'price-desc') {
    orderBy = { priceAmount: 'desc' }
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: orderBy
  })

  return (
    <div className="bg-[var(--color-porcelain-canvas)] min-h-screen">
      <div className="max-w-[var(--page-max-width)] mx-auto py-[80px] px-4 sm:px-[25px]">
        <div className="flex flex-col md:flex-row items-baseline justify-between border-b border-[var(--color-mist)] pb-[40px] mb-[60px]">
          <h1 className="text-[36px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-obsidian)] uppercase">
            {q ? `Search Results for "${q}"` : category ? category : 'All Products'}
          </h1>
          <div className="flex items-center gap-[24px] mt-6 md:mt-0">
            {(q || category) && (
              <Link href="/products" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] hover:text-[var(--color-obsidian)] transition-colors">
                Clear all filters
              </Link>
            )}
            <SortSelect />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-[25px] gap-y-[60px]">
          {products.length === 0 ? (
            <div className="col-span-full py-[120px] flex flex-col items-center justify-center text-center">
              <svg className="w-12 h-12 text-[var(--color-mist)] mb-[24px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-[24px] font-medium text-[var(--color-obsidian)] mb-[8px] uppercase tracking-[var(--tracking-subheading)]">No products found</h3>
              <p className="text-[16px] text-[var(--color-graphite)] max-w-sm mb-[32px]">We couldn't find anything matching your search. Try adjusting your filters or search term.</p>
              <Link href="/products" className="inline-flex items-center justify-center h-[40px] px-[28px] border border-[var(--color-obsidian)] rounded-[40px] text-[14px] font-medium text-[var(--color-obsidian)] hover:bg-[var(--color-obsidian)] hover:text-white transition-colors uppercase">
                Clear all filters
              </Link>
            </div>
          ) : (
            products.map((product: any) => {
              const images = JSON.parse(product.images)
              const imageSrc = images[0] || '/images/aster-run-pro.jpg'
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group relative flex flex-col bg-[var(--color-porcelain-canvas)]">
                  <div className="w-full aspect-square bg-[var(--color-porcelain-canvas)] overflow-hidden mb-[16px] relative flex justify-center items-center px-[25px]">
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      className="object-contain object-center group-hover:scale-105 transition-transform duration-700 ease-out p-6"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <h3 className="text-[16px] font-medium text-[var(--color-obsidian)] uppercase tracking-normal">
                    {product.name}
                  </h3>
                  <p className="mt-[4px] text-[12px] uppercase tracking-[0.143em] text-[var(--color-graphite)]">{product.category}</p>
                  <p className="mt-[8px] text-[14px] font-normal text-[var(--color-obsidian)]">₹{product.priceAmount}</p>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
