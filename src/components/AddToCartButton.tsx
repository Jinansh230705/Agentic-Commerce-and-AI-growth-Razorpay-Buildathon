'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'

interface AddToCartButtonProps {
  product: any
  variants: any[]
}

export function AddToCartButton({ product, variants }: AddToCartButtonProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || '')
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  
  const selectedVariant = variants.find(v => v.id === selectedVariantId)
  
  const handleAddToCart = () => {
    const images = JSON.parse(product.images)
    let variantLabel = ''
    if (selectedVariant) {
        const attrs = JSON.parse(selectedVariant.attributes)
        variantLabel = [attrs.size, attrs.color].filter(Boolean).join(' - ')
    }

    addItem({
      id: `${product.id}-${selectedVariantId}`,
      productId: product.productId,
      variantId: selectedVariantId,
      name: product.name,
      price: selectedVariant?.price || product.priceAmount,
      currency: product.currency,
      image: images[0] || '',
      quantity: 1,
      variantLabel,
    })
    
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mt-0">
      {variants.length > 0 && (
        <div className="mb-[40px]">
          <h3 className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[16px]">Select Variant</h3>
          <div className="flex flex-wrap gap-[12px]">
            {variants.map((v: any) => {
              const attrs = JSON.parse(v.attributes)
              const label = [attrs.size, attrs.color].filter(Boolean).join(' - ')
              const isSelected = v.id === selectedVariantId
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.inventory === 0}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`h-[40px] px-[24px] border rounded-[40px] text-[12px] uppercase font-medium transition-colors ${
                    isSelected 
                      ? 'border-[var(--color-obsidian)] bg-[var(--color-obsidian)] text-white' 
                      : 'border-[var(--color-mist)] bg-transparent text-[var(--color-obsidian)] hover:border-[var(--color-graphite)]'
                  } ${v.inventory === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {label} {v.inventory === 0 ? '(Out of stock)' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex w-full">
        <button
          type="button"
          disabled={added}
          onClick={handleAddToCart}
          className={`flex-1 h-[48px] px-[32px] rounded-[40px] flex items-center justify-center text-[14px] uppercase font-medium transition-all ${
            added 
              ? 'bg-[var(--color-ultramarine-velvet)] text-white border border-[var(--color-ultramarine-velvet)]' 
              : 'bg-[var(--color-pure-ink)] text-[var(--color-porcelain-canvas)] border border-[var(--color-pure-ink)] hover:bg-[var(--color-porcelain-canvas)] hover:text-[var(--color-pure-ink)]'
          }`}
        >
          {added ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
