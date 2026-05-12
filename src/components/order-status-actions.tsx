'use client'

import { useState, useTransition } from 'react'
import { Check, Truck, PackageCheck, X } from 'lucide-react'
import { updateOrderStatus } from '@/app/(app)/orders/[id]/actions'
import { cn } from '@/lib/cn'

type Status = 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'

const NEXT_LABEL: Partial<Record<Status, { next: Status; label: string; icon: typeof Check }>> = {
  pending:    { next: 'confirmed',  label: 'Confirm order',  icon: Check },
  confirmed:  { next: 'dispatched', label: 'Mark dispatched', icon: Truck },
  dispatched: { next: 'delivered',  label: 'Mark delivered', icon: PackageCheck },
}

export function OrderStatusActions({ orderId, currentStatus }: { orderId: string; currentStatus: Status }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
    return null
  }

  const next = NEXT_LABEL[currentStatus]
  if (!next) return null
  const NextIcon = next.icon

  function go(target: Status) {
    setError(null)
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, target)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update status')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => go(next.next)}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60',
        )}
      >
        <NextIcon className="w-4 h-4" />
        {pending ? 'Saving…' : next.label}
      </button>
      <button
        type="button"
        onClick={() => go('cancelled')}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>
      {error && (
        <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          {error}
        </span>
      )}
    </div>
  )
}
