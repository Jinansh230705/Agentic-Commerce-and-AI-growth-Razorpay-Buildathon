'use client'

import { useCartStore } from '@/lib/cart-store'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function CartIcon() {
  const [mounted, setMounted] = useState(false)
  const items = useCartStore((state) => state.items)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <Link href="/cart" className="text-gray-500 hover:text-gray-900 relative">
      <span className="sr-only">Cart</span>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      {mounted && itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
