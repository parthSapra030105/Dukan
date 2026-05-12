'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface StatusTabsProps {
  /** Counts per status. Keys: status names; values: counts. */
  counts: Record<string, number>
  /** Status keys in display order. */
  statuses: Array<{ key: string; label: string }>
  /** Total count to show on "All". */
  totalCount: number
}

export function StatusTabs({ counts, statuses, totalCount }: StatusTabsProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const current = searchParams.get('status') ?? ''

  const buildHref = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1 mb-6 border-b border-stone-200">
      <Tab href={buildHref('')} label="All" count={totalCount} active={current === ''} />
      {statuses.map(s => (
        <Tab
          key={s.key}
          href={buildHref(s.key)}
          label={s.label}
          count={counts[s.key] ?? 0}
          active={current === s.key}
        />
      ))}
    </div>
  )
}

function Tab({
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
        'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap',
        '-mb-px border-b-2 transition-colors',
        active
          ? 'border-rose-600 text-stone-900'
          : 'border-transparent text-stone-500 hover:text-stone-900',
      )}
    >
      {label}
      {count > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded text-[10px] font-medium',
            active ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-600',
          )}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
