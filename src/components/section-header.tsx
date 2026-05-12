import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  count?: number
  right?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, count, right, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-baseline justify-between mb-3', className)}>
      <h2 className="text-xs uppercase tracking-wider font-medium text-stone-500">
        {title}
        {typeof count === 'number' && (
          <span className="ml-2 text-stone-400">{count}</span>
        )}
      </h2>
      {right && <div className="text-xs text-stone-500">{right}</div>}
    </div>
  )
}
