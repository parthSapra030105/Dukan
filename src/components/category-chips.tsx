'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface CategoryChipsProps {
  categories: Array<{ key: string; label: string; count: number }>
  totalCount: number
}

export function CategoryChips({ categories, totalCount }: CategoryChipsProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const current = searchParams.get('category') ?? ''

  const buildHref = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat) params.set('category', cat)
    else params.delete('category')
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
      <Chip href={buildHref('')} label="All" count={totalCount} active={current === ''} />
      {categories.map(c => (
        <Chip
          key={c.key}
          href={buildHref(c.key)}
          label={c.label}
          count={c.count}
          active={current === c.key}
        />
      ))}
    </div>
  )
}

function Chip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
        'border transition-colors',
        active
          ? 'bg-stone-900 border-stone-900 text-white'
          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'text-stone-300' : 'text-stone-400',
        )}
      >
        {count}
      </span>
    </Link>
  )
}
