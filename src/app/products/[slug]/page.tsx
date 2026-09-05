import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AddToCartButton } from '@/components/AddToCartButton'
import Image from 'next/image'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: true }
  })

  if (!product) {
    notFound()
  }

  const images = JSON.parse(product.images)
  const imageSrc = images[0] || '/images/aster-run-pro.jpg'
  const attributes = JSON.parse(product.attributes)

  return (
    <div className="bg-[var(--color-porcelain-canvas)] min-h-screen">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: images,
            description: product.description,
            sku: product.productId,
            brand: {
              '@type': 'Brand',
              name: product.brand
            },
            offers: {
              '@type': 'Offer',
              url: `https://astergear.test/products/${product.slug}`,
              priceCurrency: product.currency,
              price: product.priceAmount,
              itemCondition: 'https://schema.org/NewCondition',
              availability: product.availability === 'in_stock' 
                ? 'https://schema.org/InStock' 
                : 'https://schema.org/OutOfStock'
            }
          })
        }}
      />

      <div className="max-w-[var(--page-max-width)] mx-auto py-[80px] px-4 sm:px-[25px]">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-[120px] lg:items-center">
          {/* Image gallery */}
          <div className="flex flex-col-reverse">
            <div className="w-full aspect-square bg-[var(--color-porcelain-canvas)] relative flex justify-center items-center">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-contain object-center p-8"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Product info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <nav aria-label="Breadcrumb" className="mb-[24px]">
              <ol className="flex items-center space-x-2 text-[12px] text-[var(--color-graphite)] uppercase tracking-[0.143em]">
                <li><Link href="/products" className="hover:text-[var(--color-obsidian)] transition-colors">Products</Link></li>
                <li><span className="mx-2">/</span></li>
                <li><Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-[var(--color-obsidian)] transition-colors">{product.category}</Link></li>
              </ol>
            </nav>

            <h1 className="text-[36px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-obsidian)] uppercase leading-[var(--leading-heading)]">{product.name}</h1>
            
            <div className="mt-[16px]">
              <h2 className="sr-only">Product information</h2>
              <p className="text-[24px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-subheading)]">₹{product.priceAmount}</p>
            </div>

            <div className="mt-[40px]">
              <h3 className="sr-only">Description</h3>
              <div className="text-[16px] text-[var(--color-graphite)] leading-[var(--leading-body)]">
                <p>{product.description}</p>
              </div>
            </div>

            <div className="mt-[60px]">
              <AddToCartButton product={product} variants={product.variants} />
            </div>

            <section aria-labelledby="details-heading" className="mt-[80px] border-t border-[var(--color-mist)] pt-[40px]">
              <h2 id="details-heading" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[32px]">Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-[24px] gap-x-[16px]">
                <div className="flex flex-col border-b border-[var(--color-mist)] pb-[16px]">
                  <dt className="text-[9px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[4px]">Brand</dt>
                  <dd className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase">{product.brand}</dd>
                </div>
                <div className="flex flex-col border-b border-[var(--color-mist)] pb-[16px]">
                  <dt className="text-[9px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[4px]">Category</dt>
                  <dd className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase">{product.category}</dd>
                </div>
                {Object.entries(attributes).map(([k, v]) => (
                  <div key={k} className="flex flex-col border-b border-[var(--color-mist)] pb-[16px]">
                    <dt className="text-[9px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[4px]">{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
                    <dd className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase capitalize">{Array.isArray(v) ? v.join(', ').replace(/_/g, ' ') : String(v).replace(/_/g, ' ')}</dd>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
