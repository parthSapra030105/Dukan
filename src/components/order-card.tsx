import Link from 'next/link'
import { Phone, MapPin } from 'lucide-react'
import { StatusPill, type OrderStatus } from './status-pill'
import { TranscriptSnippet } from './transcript-snippet'
import { formatRupees, formatPhone, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'

export interface OrderCardData {
  id: string
  status: OrderStatus
  total_paise: number
  items: Array<{ name: string; qty: number; unit?: string }>
  customer_name?: string | null
  customer_phone?: string | null
  delivery_address_snapshot?: string | null
  created_at: string
  /** Last customer line from the call transcript, if available. */
  customer_snippet?: string | null
}

interface OrderCardProps {
  order: OrderCardData
  /** Highlight pulse when first rendered (for realtime new-arrival). */
  isNew?: boolean
  /** Compact mode hides the address line. */
  compact?: boolean
  /** href for click — defaults to /orders/[id]. */
  href?: string
}

export function OrderCard({ order, isNew, compact, href }: OrderCardProps) {
  const itemsLine = order.items
    .slice(0, 3)
    .map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`)
    .join(' · ')
  const extraItems = order.items.length > 3 ? ` +${order.items.length - 3} more` : ''
  const addrLine = order.delivery_address_snapshot
    ? order.delivery_address_snapshot.split(',').slice(0, 2).join(',').trim()
    : null

  return (
    <Link
      href={href ?? `/orders/${order.id}`}
      className={cn(
        'block bg-white border rounded-xl p-4 transition-colors',
        isNew ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300',
      )}
    >
      {/* Header: customer + total */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-stone-900 font-medium">
            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{order.customer_name ?? 'Walk-in'}</span>
          </div>
          {order.customer_phone && (
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {formatPhone(order.customer_phone)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold text-stone-900 tabular-nums">
            {formatRupees(order.total_paise)}
          </p>
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">
            {timeAgo(order.created_at)}
          </p>
        </div>
      </div>

      {/* Transcript snippet if we have one */}
      {order.customer_snippet && (
        <div className="mb-2">
          <TranscriptSnippet text={order.customer_snippet} speaker="customer" />
        </div>
      )}

      {/* Items line */}
      <p className="text-sm text-stone-700">
        {itemsLine}
        <span className="text-stone-400">{extraItems}</span>
      </p>

      {/* Address + status */}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-stone-100">
        {addrLine && !compact ? (
          <div className="flex items-center gap-1.5 text-xs text-stone-500 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{addrLine}</span>
          </div>
        ) : (
          <span />
        )}
        <StatusPill kind="order" status={order.status} size="sm" />
      </div>
    </Link>
  )
}
