/**
 * StatusPill — semantic-colored chip for order / call / escalation / call status.
 * Color = meaning, never decoration.
 */

import { cn } from '@/lib/cn'

export type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
export type CallOutcome = 'in_progress' | 'order_placed' | 'escalated' | 'abandoned' | 'no_intent'
export type EscalationStatus = 'queued' | 'taken' | 'resolved' | 'abandoned'

const ORDER_TONES: Record<OrderStatus, string> = {
  pending:    'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  confirmed:  'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  dispatched: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200',
  delivered:  'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  cancelled:  'bg-stone-200 text-stone-600 ring-1 ring-stone-300',
}

const CALL_TONES: Record<CallOutcome, string> = {
  in_progress:  'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  order_placed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  escalated:    'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  abandoned:    'bg-stone-200 text-stone-600 ring-1 ring-stone-300',
  no_intent:    'bg-stone-200 text-stone-600 ring-1 ring-stone-300',
}

const ESCALATION_TONES: Record<EscalationStatus, string> = {
  queued:    'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  taken:     'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  resolved:  'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  abandoned: 'bg-stone-200 text-stone-600 ring-1 ring-stone-300',
}

const ORDER_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

interface StatusPillProps {
  kind?: 'order' | 'call' | 'escalation'
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusPill({ kind = 'order', status, size = 'md', className }: StatusPillProps) {
  const tone =
    kind === 'order'
      ? ORDER_TONES[status as OrderStatus] ?? 'bg-stone-100 text-stone-700 ring-1 ring-stone-200'
      : kind === 'call'
        ? CALL_TONES[status as CallOutcome] ?? 'bg-stone-100 text-stone-700 ring-1 ring-stone-200'
        : ESCALATION_TONES[status as EscalationStatus] ?? 'bg-stone-100 text-stone-700 ring-1 ring-stone-200'

  const label =
    kind === 'order'
      ? ORDER_LABELS[status as OrderStatus] ?? status
      : status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span className={cn('inline-flex items-center gap-1 rounded font-medium', sizeClass, tone, className)}>
      {label}
    </span>
  )
}
