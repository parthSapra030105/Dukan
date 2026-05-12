import { Page, PageHeader } from '@/components/page'
import { StatusTabs } from '@/components/status-tabs'
import { OrdersFeed } from '@/components/orders-feed'
import { type OrderCardData } from '@/components/order-card'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'
import { formatRupees } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUSES = [
  { key: 'pending',    label: 'Pending' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cancelled',  label: 'Cancelled' },
]

function extractCustomerSnippet(transcript: unknown): string | null {
  if (!transcript || typeof transcript !== 'string') return null
  const userLines = transcript
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('user:'))
    .map(l => l.replace(/^user:\s*/, ''))
    .filter(Boolean)
  return userLines[0] ?? null
}

function startOfTodayIstIso(): string {
  const now = new Date()
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + istOffsetMs)
  istNow.setUTCHours(0, 0, 0, 0)
  return new Date(istNow.getTime() - istOffsetMs).toISOString()
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const filter = STATUSES.find(s => s.key === status)?.key

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()
  const todayStart = startOfTodayIstIso()

  // Parallel: counts (for tabs) + filtered list (for cards) + today's total (for header)
  const [{ data: allForCounts }, { data: filteredOrders }, { data: todaysOrders }] = await Promise.all([
    supabase
      .from('orders')
      .select('status')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(500),
    (() => {
      let q = supabase
        .from('orders')
        .select(`
          id, status, total_paise, items, delivery_address_snapshot, created_at,
          customers:customer_id (name, phone),
          calls:call_id (transcript)
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (filter) q = q.eq('status', filter)
      return q
    })(),
    supabase
      .from('orders')
      .select('id, total_paise')
      .eq('merchant_id', merchantId)
      .gte('created_at', todayStart),
  ])

  // Tab counts
  const counts: Record<string, number> = {}
  for (const r of allForCounts ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  const totalCount = allForCounts?.length ?? 0

  // Today total
  const ordersToday = todaysOrders?.length ?? 0
  const revenueToday = (todaysOrders ?? []).reduce((acc, o) => acc + (o.total_paise ?? 0), 0)

  // Map to cards
  const cards: OrderCardData[] = (filteredOrders ?? []).map(o => {
    const c = o.customers as unknown as { name: string | null; phone: string | null } | null
    const call = o.calls as unknown as { transcript: unknown } | null
    return {
      id: o.id,
      status: o.status as OrderCardData['status'],
      total_paise: o.total_paise,
      items: Array.isArray(o.items) ? (o.items as OrderCardData['items']) : [],
      delivery_address_snapshot: o.delivery_address_snapshot,
      created_at: o.created_at,
      customer_name: c?.name ?? null,
      customer_phone: c?.phone ?? null,
      customer_snippet: extractCustomerSnippet(call?.transcript ?? null),
    }
  })

  return (
    <Page maxWidth="6xl">
      <PageHeader
        title="Orders"
        subtitle={
          ordersToday > 0
            ? `${ordersToday} ${ordersToday === 1 ? 'order' : 'orders'} today · ${formatRupees(revenueToday)} in phone revenue`
            : 'No orders today yet'
        }
      />

      <StatusTabs counts={counts} statuses={STATUSES} totalCount={totalCount} />

      {cards.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-stone-700 mb-1">
            {filter ? `No ${filter} orders` : 'No orders yet'}
          </p>
          <p className="text-xs text-stone-500">
            {filter
              ? 'Try a different status filter.'
              : 'When the agent takes phone orders, they’ll appear here in real time.'}
          </p>
        </div>
      ) : (
        <OrdersFeed initialOrders={cards} merchantId={merchantId} cap={30} filterStatus={filter} />
      )}
    </Page>
  )
}
