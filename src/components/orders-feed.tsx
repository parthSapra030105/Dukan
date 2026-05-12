'use client'

import { useEffect, useRef, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import { OrderCard, type OrderCardData } from './order-card'

interface OrdersFeedProps {
  initialOrders: OrderCardData[]
  merchantId: string
  /** Max cards to keep in the feed. */
  cap?: number
}

/**
 * Live feed of recent orders. Hydrates with server-fetched initial data,
 * then subscribes to Supabase Realtime — new orders get prepended with a
 * 2-second amber highlight, then settle.
 *
 * The realtime payload from Supabase only contains the raw order row.
 * Customer name / transcript snippet are not joined, so new realtime
 * arrivals show with fewer details until the page next re-renders.
 */
export function OrdersFeed({ initialOrders, merchantId, cap = 6 }: OrdersFeedProps) {
  const [orders, setOrders] = useState<OrderCardData[]>(initialOrders)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const settleTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel(`orders-feed-${merchantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `merchant_id=eq.${merchantId}` },
        (payload) => {
          const row = payload.new as {
            id: string
            status: string
            total_paise: number
            items: Array<{ name: string; qty: number; unit?: string }>
            delivery_address_snapshot: string | null
            created_at: string
          }
          const card: OrderCardData = {
            id: row.id,
            status: row.status as OrderCardData['status'],
            total_paise: row.total_paise,
            items: Array.isArray(row.items) ? row.items : [],
            delivery_address_snapshot: row.delivery_address_snapshot,
            created_at: row.created_at,
            customer_name: null,
            customer_phone: null,
            customer_snippet: null,
          }
          setOrders(prev => {
            // de-dup just in case
            if (prev.some(o => o.id === card.id)) return prev
            return [card, ...prev].slice(0, cap)
          })
          setNewIds(prev => new Set(prev).add(card.id))
          const t = setTimeout(() => {
            setNewIds(prev => {
              const n = new Set(prev)
              n.delete(card.id)
              return n
            })
            settleTimers.current.delete(card.id)
          }, 2000)
          settleTimers.current.set(card.id, t)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      settleTimers.current.forEach(t => clearTimeout(t))
      settleTimers.current.clear()
    }
  }, [merchantId, cap])

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <p className="text-sm text-stone-700 font-medium mb-1">No phone orders yet today</p>
        <p className="text-xs text-stone-500">
          The agent is on the line — share your callback link to start one.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <OrderCard key={order.id} order={order} isNew={newIds.has(order.id)} />
      ))}
    </div>
  )
}
