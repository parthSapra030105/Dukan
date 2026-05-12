import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Clock } from 'lucide-react'
import { Page } from '@/components/page'
import { StatusPill, type OrderStatus } from '@/components/status-pill'
import { StatusTimeline } from '@/components/status-timeline'
import { TranscriptPanel } from '@/components/transcript-panel'
import { OrderStatusActions } from '@/components/order-status-actions'
import { SectionHeader } from '@/components/section-header'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { formatRupees, formatPhone, formatDuration, timeAgo } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = getSupabaseAdmin()
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, status, total_paise, items, source, language, notes,
      delivery_address_snapshot, delivery_slot, sms_sent,
      created_at, updated_at, customer_id, call_id,
      customers:customer_id (name, phone, preferred_language),
      calls:call_id (
        id, started_at, ended_at, duration_seconds, language_detected,
        transcript, recording_url, outcome, provider
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[order detail] fetch failed:', error.message)
  }
  if (!order) return notFound()

  const customer = order.customers as unknown as {
    name: string | null
    phone: string | null
    preferred_language: string | null
  } | null
  const call = order.calls as unknown as {
    id: string
    started_at: string | null
    ended_at: string | null
    duration_seconds: number | null
    language_detected: string | null
    transcript: string | null
    recording_url: string | null
    outcome: string | null
    provider: string
  } | null

  const items = Array.isArray(order.items)
    ? (order.items as Array<{ sku: string; name: string; qty: number; price_at_order_paise: number; unit?: string }>)
    : []

  const totalRupees = formatRupees(order.total_paise)

  return (
    <Page maxWidth="6xl">
      {/* Breadcrumb */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to orders
      </Link>

      {/* Hero */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-stone-900">
                {customer?.name ?? 'Walk-in customer'}
              </h1>
              <StatusPill kind="order" status={order.status} />
            </div>
            {customer?.phone && (
              <p className="text-sm text-stone-500 font-mono mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {formatPhone(customer.phone)}
              </p>
            )}
            <p className="text-xs text-stone-400 mt-1.5">
              Order #{order.id.slice(0, 8)} · placed {timeAgo(order.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-stone-900 tabular-nums">{totalRupees}</p>
            <p className="text-xs text-stone-500 uppercase tracking-wider mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {/* Status timeline */}
        <div className="mt-6 pt-6 border-t border-stone-100">
          <StatusTimeline current={order.status as OrderStatus} />
        </div>

        {/* Status actions */}
        {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'dispatched') && (
          <div className="mt-6 pt-6 border-t border-stone-100">
            <OrderStatusActions orderId={order.id} currentStatus={order.status as OrderStatus} />
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: items + address */}
        <div className="space-y-6">
          <section className="bg-white border border-stone-200 rounded-xl p-6">
            <SectionHeader title="Items" count={items.length} />
            {items.length === 0 ? (
              <p className="text-sm text-stone-500">No items.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{item.name}</p>
                      <p className="text-xs text-stone-500 font-mono mt-0.5">
                        {item.sku}
                        {item.unit && <span className="ml-1 text-stone-400">· {item.unit}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm text-stone-900 tabular-nums">
                        {formatRupees(item.price_at_order_paise)} <span className="text-stone-400">×{item.qty}</span>
                      </p>
                      <p className="text-xs text-stone-500 tabular-nums mt-0.5">
                        {formatRupees(item.price_at_order_paise * item.qty)}
                      </p>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-between py-3 mt-1 border-t-2 border-stone-200">
                  <span className="text-sm font-medium text-stone-700">Total</span>
                  <span className="text-base font-semibold text-stone-900 tabular-nums">{totalRupees}</span>
                </li>
              </ul>
            )}
          </section>

          <section className="bg-white border border-stone-200 rounded-xl p-6">
            <SectionHeader title="Delivery" />
            {order.delivery_address_snapshot ? (
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-stone-900">{order.delivery_address_snapshot}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address_snapshot)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-xs text-rose-600 hover:underline"
                  >
                    View on map →
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500">No address on file.</p>
            )}
            {order.delivery_slot && (
              <div className="flex items-center gap-2 text-sm text-stone-700">
                <Clock className="w-4 h-4 text-stone-400" />
                <span>Slot: {order.delivery_slot}</span>
              </div>
            )}
          </section>
        </div>

        {/* Right: call + transcript */}
        <div className="space-y-6">
          <section className="bg-white border border-stone-200 rounded-xl p-6">
            <SectionHeader title="Call recording" />
            {call?.recording_url ? (
              <div>
                <audio controls src={call.recording_url} className="w-full" />
                <p className="text-xs text-stone-500 mt-2">
                  {call.duration_seconds ? formatDuration(call.duration_seconds) : ''} · {call.provider}
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-center">
                <p className="text-xs text-stone-500">No recording attached.</p>
                {call?.duration_seconds && (
                  <p className="text-xs text-stone-400 mt-1">
                    Call duration {formatDuration(call.duration_seconds)}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="bg-white border border-stone-200 rounded-xl p-6">
            <SectionHeader
              title="Transcript"
              right={call?.language_detected ? <span>Lang · {call.language_detected}</span> : null}
            />
            <TranscriptPanel transcript={call?.transcript ?? null} />
          </section>
        </div>
      </div>
    </Page>
  )
}
