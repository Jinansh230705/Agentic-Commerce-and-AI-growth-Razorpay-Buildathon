'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function SortSelect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      if (e.target.value) {
        params.set('sort', e.target.value)
      } else {
        params.delete('sort')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, searchParams, pathname]
  )

  return (
    <div className="flex items-center space-x-[16px]">
      <label htmlFor="sort" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)]">Sort by</label>
      <select
        id="sort"
        className="block pl-[16px] pr-[32px] py-[8px] text-[12px] font-medium uppercase tracking-[0.143em] border border-[var(--color-mist)] focus:outline-none focus:border-[var(--color-obsidian)] rounded-[40px] bg-transparent text-[var(--color-obsidian)] transition-colors cursor-pointer appearance-none"
        value={searchParams.get('sort') || ''}
        onChange={handleSortChange}
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '12px'
        }}
      >
        <option value="">Newest</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
    </div>
  )
}
