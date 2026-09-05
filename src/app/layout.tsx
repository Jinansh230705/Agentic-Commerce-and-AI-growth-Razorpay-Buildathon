import Link from 'next/link'
import './globals.css'
import { CartIcon } from '@/components/CartIcon'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata = {
  metadataBase: new URL('https://astergear.test'),
  title: {
    default: 'Agentic Commerce',
    template: '%s | Agentic Commerce'
  },
  description: 'High performance sports gear and equipment.',
  alternates: {
    canonical: '/'
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.className}`}>
      <body className="h-full flex flex-col antialiased selection:bg-[#060daa] selection:text-white bg-[var(--color-porcelain-canvas)] text-[var(--color-obsidian)]">
        <header className="bg-[var(--color-porcelain-canvas)]/80 backdrop-blur-md border-b border-[var(--color-mist)] sticky top-0 z-50 h-[64px] min-h-[64px] flex flex-col justify-center shadow-sm transition-all duration-300">
          <div className="max-w-[var(--page-max-width)] w-full mx-auto px-4 sm:px-[25px]">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center">
                <Link href="/" className="text-[18px] font-bold tracking-tight uppercase hover:text-[var(--color-graphite)] transition-colors flex items-center h-full pt-1">
                  AGENTIC COMMERCE
                </Link>
                <nav className="ml-10 hidden lg:flex space-x-6 items-center">
                  <Link href="/products" className="text-[13px] tracking-wide uppercase font-bold text-[var(--color-obsidian)] hover:text-[var(--color-graphite)] transition-colors">Shop All</Link>
                  <Link href="/products?category=Running+Shoes" className="text-[13px] tracking-wide uppercase font-bold text-gray-500 hover:text-[var(--color-obsidian)] transition-colors">Footwear</Link>
                  <Link href="/products?category=Apparel" className="text-[13px] tracking-wide uppercase font-bold text-gray-500 hover:text-[var(--color-obsidian)] transition-colors">Apparel</Link>
                  <Link href="/products?category=Backpacks" className="text-[13px] tracking-wide uppercase font-bold text-gray-500 hover:text-[var(--color-obsidian)] transition-colors">Gear</Link>
                  <Link href="/buyer" className="text-[13px] tracking-wide uppercase font-bold text-[var(--color-pure-ink)] hover:text-[#060daa] transition-colors ml-4 border border-[var(--color-pure-ink)] px-3 py-1 rounded-sm">AI Buyer</Link>
                </nav>
              </div>
              <div className="flex items-center space-x-6">
                <form action="/products" method="GET" className="hidden lg:block relative group">
                  <input type="text" name="q" placeholder="Search gear..." className="w-56 pl-4 pr-10 py-1.5 bg-[var(--color-bone)] border border-[var(--color-mist)] rounded-sm text-[13px] focus:outline-none focus:border-[var(--color-obsidian)] transition-all" />
                  <button type="submit" aria-label="Search" className="absolute right-3 top-1.5 text-gray-400 group-focus-within:text-[var(--color-obsidian)] transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
                <Link href="/merchant/growth" className="text-[13px] tracking-wide uppercase font-bold text-gray-500 hover:text-[var(--color-obsidian)] transition-colors hidden sm:block">
                  Merchant
                </Link>
                <div className="pl-4 border-l border-[var(--color-mist)] flex items-center h-8">
                  <CartIcon />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-gray-900 text-white mt-auto">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
              <div className="md:col-span-1">
                <Link href="/" className="text-2xl font-extrabold tracking-tighter uppercase text-white">
                  AGENTIC COMMERCE
                </Link>
                <p className="mt-4 text-sm text-gray-400 leading-relaxed">
                  High performance sports gear and equipment built for those who push boundaries. 
                  Direct to consumer. Engineered for excellence.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Shop</h3>
                <ul className="mt-4 space-y-3 text-sm text-gray-400">
                  <li><Link href="/products?category=Running+Shoes" className="hover:text-white transition-colors">Footwear</Link></li>
                  <li><Link href="/products?category=Apparel" className="hover:text-white transition-colors">Apparel</Link></li>
                  <li><Link href="/products?category=Backpacks" className="hover:text-white transition-colors">Gear</Link></li>
                  <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Support</h3>
                <ul className="mt-4 space-y-3 text-sm text-gray-400">
                  <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Policy</Link></li>
                  <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
                  <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">AI Commerce</h3>
                <ul className="mt-4 space-y-3 text-sm text-gray-400">
                  <li><Link href="/buyer" className="hover:text-white transition-colors">Try AI Buyer</Link></li>
                  <li><a href="/agents.md" className="hover:text-white transition-colors flex items-center gap-1">agents.md <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a></li>
                  <li><Link href="/merchant/growth" className="hover:text-white transition-colors">Merchant Dashboard</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-500">
                &copy; 2026 Agentic Commerce. All rights reserved. Demo Project.
              </p>
              <div className="mt-4 md:mt-0 flex space-x-6 text-sm text-gray-500">
                <span>Made for Builders</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
