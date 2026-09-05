import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { redirect } from 'next/navigation'

export default async function Home() {
  const featuredProducts = await prisma.product.findMany({
    take: 8,
    orderBy: { priceAmount: 'desc' }
  })

  // Server action to redirect to /buyer with query
  async function startShopping(formData: FormData) {
    'use server'
    const query = formData.get('q')
    if (query) {
      redirect(`/buyer?q=${encodeURIComponent(query.toString())}`)
    }
  }

  return (
    <div className="bg-white min-h-screen">
      {/* AI Hero section */}
      <div className="relative w-full min-h-[90vh] md:min-h-[800px] flex flex-col items-center justify-center overflow-hidden bg-white">
        {/* Background Artwork - assumes hero-illustration.png has the full artwork */}
        <div 
          className="absolute inset-0 z-0 bg-[url('/hero-illustration.png')] bg-cover bg-center bg-no-repeat w-full h-full"
          aria-hidden="true"
        />
        
        {/* Centered UI Content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 flex flex-col items-center text-center mt-[-10vh]">
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#111111] leading-[1.1] mb-4">
            Your next run<br />starts here
          </h1>
          
          <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-10 font-medium">
            Tell us what you're looking for. Our AI Buyer will negotiate, find the best gear, and handle checkout for you securely.
          </p>
          
          <form action={startShopping} className="w-full flex flex-col items-center max-w-2xl mx-auto">
            <div className="w-full relative rounded-[32px] bg-[#f8f8f8] border border-transparent flex items-center px-4 py-3 transition-all focus-within:bg-white focus-within:border-gray-300 focus-within:shadow-sm">
              <input 
                type="text" 
                name="q" 
                placeholder="Find me road running shoes under ₹5,000 in size 9..." 
                required
                className="flex-1 px-4 text-base text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-400"
              />
              
              <button 
                type="submit" 
                aria-label="Send"
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#111111] text-white hover:bg-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            
            {/* Suggestion Chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {['Road running shoes', 'Trail running gear', 'Hydration essentials', 'Running apparel'].map(chip => (
                <button 
                  type="submit"
                  key={chip}
                  name="q"
                  value={chip}
                  className="px-4 py-2 rounded-[24px] bg-[#f8f8f8] text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-[var(--page-max-width)] mx-auto px-4 sm:px-[25px] py-[var(--section-gap)]">
        {/* Featured Products */}
        <section aria-labelledby="featured-heading">
          <div className="flex items-center justify-between pb-[60px]">
            <h2 id="featured-heading" className="text-[24px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-obsidian)] uppercase">
              Network Catalog
            </h2>
            <Link href="/products" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-obsidian)] hover:text-[var(--color-graphite)] flex items-center gap-[4px]">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-[25px] gap-y-[60px]">
            {featuredProducts.map((product: any) => {
              const images = JSON.parse(product.images)
              const imageSrc = images[0] || '/images/aster-run-pro.jpg'
              const merchantName = product.merchantId === 'mrc_aster_gear' ? 'Aster Gear' : 'Omega Sports'
              
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group relative flex flex-col bg-[var(--color-porcelain-canvas)]">
                  <div className="w-full aspect-square bg-[var(--color-porcelain-canvas)] overflow-hidden mb-[16px] relative flex justify-center items-center px-[25px]">
                    <div className="absolute top-4 left-4 z-10 px-[8px] py-[2px] bg-transparent text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] border border-[var(--color-mist)] rounded-[2px]">
                      {merchantName}
                    </div>
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      className="object-contain object-center group-hover:scale-105 transition-transform duration-700 ease-out p-6"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <h3 className="text-[16px] font-medium text-[var(--color-obsidian)] uppercase tracking-normal leading-[1.2] mb-[8px]">
                    {product.name}
                  </h3>
                  <p className="mt-[8px] text-[14px] font-normal text-[var(--color-graphite)]">
                    ₹{product.priceAmount.toLocaleString()}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
        
        {/* Editorial Section */}
        <section className="mt-[var(--section-gap)] bg-[var(--color-ultramarine-velvet)] w-full py-[80px] px-4 sm:px-[120px] -mx-4 sm:-mx-[25px] sm:w-[calc(100%+50px)] max-w-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[40px] lg:gap-[120px] items-center max-w-[var(--page-max-width)] mx-auto">
            <div>
              <h2 className="text-[36px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-porcelain-canvas)] uppercase mb-[24px]">
                Autonomous Negotiation.
              </h2>
              <p className="text-[16px] font-normal leading-[var(--leading-body)] text-[var(--color-bone)] max-w-lg mb-[40px] opacity-90">
                Buyers negotiate directly with Merchant Growth Agents. Dynamic pricing is bounded by strict margin policies enforced at the infrastructure level. Every checkout is secured cryptographically using Agent Protocol 2.
              </p>
              <Link href="/buyer" className="inline-flex items-center justify-center h-[40px] px-[28px] border border-[var(--color-porcelain-canvas)] rounded-[40px] text-[14px] font-medium text-[var(--color-porcelain-canvas)] hover:bg-[var(--color-porcelain-canvas)] hover:text-[var(--color-ultramarine-velvet)] transition-colors uppercase">
                Explore AI Buyer
              </Link>
            </div>
            <div className="relative aspect-square bg-[var(--color-ultramarine-velvet)] flex items-center justify-center">
               <Image
                src="/images/aster-distance-shorts.jpg"
                alt="Aster Distance Shorts Material"
                fill
                className="object-contain object-center p-12 mix-blend-luminosity opacity-80"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
