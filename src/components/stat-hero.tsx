import { cn } from '@/lib/cn'

interface StatHeroProps {
  label: string
  value: string | number
  /** Subtle line under the value: trend, context, etc. */
  subtext?: React.ReactNode
  /** Optional right-aligned content (e.g. live indicator). */
  right?: React.ReactNode
  className?: string
}

export function StatHero({ label, value, subtext, right, className }: StatHeroProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        <p className="text-xs uppercase tracking-wider font-medium text-stone-500 mb-1">
          {label}
        </p>
        <p className="text-4xl font-bold text-stone-900 tabular-nums">
          {value}
        </p>
        {subtext && <p className="text-sm text-stone-600 mt-1">{subtext}</p>}
      </div>
      {right && <div className="pb-1">{right}</div>}
    </div>
  )
}
