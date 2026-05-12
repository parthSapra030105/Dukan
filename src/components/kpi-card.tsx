import { cn } from '@/lib/cn'

interface KpiCardProps {
  label: string
  value: string | number
  subtext?: string
  className?: string
}

export function KpiCard({ label, value, subtext, className }: KpiCardProps) {
  return (
    <div className={cn('bg-white border border-stone-200 rounded-xl p-5', className)}>
      <p className="text-xs uppercase tracking-wider font-medium text-stone-500 mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-semibold text-stone-900 tabular-nums">{value}</p>
      {subtext && <p className="text-xs text-stone-500 mt-1">{subtext}</p>}
    </div>
  )
}
