'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function CatalogSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get('q') ?? ''
  const [value, setValue] = useState(initial)

  // Sync local state if URL changes externally (e.g. clicking a chip)
  useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  // Debounced URL push
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      const qs = params.toString()
      const target = qs ? `${pathname}?${qs}` : pathname
      // Only push if it actually changes — avoid extra navigations
      const currentQs = searchParams.toString()
      if (qs !== currentQs) {
        router.replace(target, { scroll: false })
      }
    }, 220)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Search SKU, name, or alias…"
        className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-stone-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400
                   placeholder:text-stone-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
