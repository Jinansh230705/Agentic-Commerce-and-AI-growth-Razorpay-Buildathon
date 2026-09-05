'use client'

import { useCartStore } from '@/lib/cart-store'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const { items, updateQuantity, removeItem } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--color-porcelain-canvas)] p-8 flex justify-center items-center">
        <h1 className="sr-only">Your Cart</h1>
        <div className="w-8 h-8 border-4 border-[var(--color-obsidian)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const handleStandardCheckout = async () => {
    try {
      setIsCheckingOut(true)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: i.quantity })) })
      })
      if (!res.ok) throw new Error('Failed to create checkout session')
      const data = await res.json()
      if (data.checkoutId) {
        router.push(`/checkout/${data.checkoutId}`)
      }
    } catch (e) {
      console.error(e)
      alert('Failed to initiate checkout. Please try again.')
      setIsCheckingOut(false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="bg-[var(--color-porcelain-canvas)] min-h-screen">
      <div className="max-w-[var(--page-max-width)] mx-auto py-[80px] px-4 sm:px-[25px]">
        <h1 className="text-[36px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-obsidian)] uppercase mb-[60px] border-b border-[var(--color-mist)] pb-[40px]">
          Your Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[60px]">
          <section aria-labelledby="cart-heading" className="lg:col-span-2">
            <h2 id="cart-heading" className="sr-only">Items in your shopping cart</h2>
            
            {items.length === 0 ? (
              <div className="py-[80px] flex flex-col items-start justify-center">
                <h3 className="text-[24px] font-medium text-[var(--color-obsidian)] mb-[16px] uppercase tracking-[var(--tracking-subheading)]">Your cart is empty</h3>
                <p className="text-[16px] text-[var(--color-graphite)] max-w-sm mb-[40px] leading-[var(--leading-body)]">Looks like you haven't added anything to your cart yet. Discover our latest gear.</p>
                <Link href="/products" className="inline-flex items-center justify-center h-[40px] px-[28px] border border-[var(--color-obsidian)] rounded-[40px] text-[14px] font-medium text-[var(--color-obsidian)] hover:bg-[var(--color-obsidian)] hover:text-white transition-colors uppercase">
                  Shop Gear
                </Link>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-[var(--color-mist)]">
                {items.map((item) => (
                  <li key={item.id} className="flex py-[32px]">
                    <div className="flex-shrink-0 w-[120px] h-[120px] bg-[var(--color-porcelain-canvas)] relative border border-[var(--color-mist)]">
                      <Image 
                        src={item.image || '/images/aster-run-pro.jpg'} 
                        alt={item.name} 
                        fill
                        className="object-contain object-center p-4"
                      />
                    </div>

                    <div className="ml-[24px] flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-[16px] font-medium uppercase text-[var(--color-obsidian)]">
                            <Link href={`/products/${item.productId}`} className="hover:text-[var(--color-graphite)] transition-colors">
                              {item.name}
                            </Link>
                          </h4>
                          <p className="ml-4 text-[16px] font-medium text-[var(--color-obsidian)]">₹{item.price}</p>
                        </div>
                        <p className="mt-[8px] text-[12px] uppercase tracking-[0.143em] text-[var(--color-graphite)]">{item.variantLabel.replace(/_/g, ' ')}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-[var(--color-mist)] rounded-[40px] h-[32px]">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-[var(--color-graphite)] hover:text-[var(--color-obsidian)] px-[12px] h-full flex items-center transition-colors">
                            -
                          </button>
                          <span className="text-[12px] font-medium text-[var(--color-obsidian)] w-[24px] text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-[var(--color-graphite)] hover:text-[var(--color-obsidian)] px-[12px] h-full flex items-center transition-colors">
                            +
                          </button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-[9px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] hover:text-red-500 transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {items.length > 0 && (
            <section aria-labelledby="summary-heading" className="bg-[var(--color-bone)] p-[40px] h-fit">
              <h2 id="summary-heading" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[32px]">Order summary</h2>
              
              <dl className="space-y-[16px] mb-[32px]">
                <div className="flex items-center justify-between border-b border-[var(--color-mist)] pb-[16px]">
                  <dt className="text-[14px] font-medium uppercase text-[var(--color-obsidian)]">Subtotal</dt>
                  <dd className="text-[16px] font-medium text-[var(--color-obsidian)]">₹{subtotal}</dd>
                </div>
              </dl>
              
              <p className="text-[12px] text-[var(--color-graphite)] mb-[40px] leading-[var(--leading-caption)]">Shipping and taxes will be calculated at checkout.</p>

              <div className="grid gap-[16px]">
                <Link href="/buyer" className="flex items-center justify-center w-full h-[48px] rounded-[40px] bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] text-[14px] font-medium uppercase transition-colors hover:bg-[var(--color-graphite)]">
                  Checkout with AI Buyer
                </Link>
                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={handleStandardCheckout}
                  className="flex items-center justify-center w-full h-[48px] rounded-[40px] border border-[var(--color-obsidian)] text-[var(--color-obsidian)] text-[14px] font-medium uppercase hover:bg-[var(--color-obsidian)] hover:text-[var(--color-porcelain-canvas)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? 'Loading...' : 'Standard Checkout'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
