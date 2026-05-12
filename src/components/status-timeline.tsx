import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

const STEPS = [
  { key: 'pending',    label: 'Pending' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered',  label: 'Delivered' },
] as const

interface StatusTimelineProps {
  current: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
}

export function StatusTimeline({ current }: StatusTimelineProps) {
  if (current === 'cancelled') {
    return (
      <div className="bg-stone-100 border border-stone-200 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-stone-700">Cancelled</p>
        <p className="text-xs text-stone-500 mt-0.5">This order was cancelled before delivery.</p>
      </div>
    )
  }

  const currentIdx = STEPS.findIndex(s => s.key === current)

  return (
    <ol className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const reached = idx <= currentIdx
        const active = idx === currentIdx
        const showLine = idx < STEPS.length - 1
        return (
          <li key={step.key} className={cn('flex items-center', showLine && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  reached
                    ? active
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : 'bg-rose-600 text-white'
                    : 'bg-stone-100 text-stone-400 border border-stone-200',
                )}
              >
                {reached ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs">{idx + 1}</span>}
              </div>
              <p
                className={cn(
                  'text-[10px] uppercase tracking-wider font-medium whitespace-nowrap',
                  active ? 'text-stone-900' : reached ? 'text-stone-600' : 'text-stone-400',
                )}
              >
                {step.label}
              </p>
            </div>
            {showLine && (
              <div
                className={cn(
                  'flex-1 h-0.5 mb-5 mx-1 transition-colors',
                  idx < currentIdx ? 'bg-rose-600' : 'bg-stone-200',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
