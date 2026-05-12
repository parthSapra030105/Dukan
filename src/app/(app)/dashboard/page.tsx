import { Page, PageHeader } from '@/components/page'
import { StatHero } from '@/components/stat-hero'
import { KpiCard } from '@/components/kpi-card'
import { OrdersFeed } from '@/components/orders-feed'
import { ActiveCallBadge, type ActiveCallData } from '@/components/active-call-badge'
import { EscalationMiniCard, type EscalationMiniData } from '@/components/escalation-mini-card'
import { SectionHeader } from '@/components/section-header'
import { type OrderCardData } from '@/components/order-card'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'
import { formatRupees, formatDuration } from '@/lib/format'
import { firstCustomerLine } from '@/lib/transcript'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function startOfTodayIsoUTC(): string {
  // Use IST (Asia/Kolkata, UTC+5:30) for "today" since this is for an Indian merchant
  const now = new Date()
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + istOffsetMs)
  istNow.setUTCHours(0, 0, 0, 0)
  return new Date(istNow.getTime() - istOffsetMs).toISOString()
}

// Use the shared transcript normaliser.

export default async function DashboardPage() {
  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()
  const todayStart = startOfTodayIsoUTC()

  // Parallel fetch all the data
  const [
    { data: ordersToday },
    { data: recentOrders },
    { data: activeCalls },
    { data: escalations },
    { data: callsToday },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_paise')
      .eq('merchant_id', merchantId)
      .gte('created_at', todayStart),
    supabase
      .from('orders')
      .select(`
        id, status, total_paise, items, delivery_address_snapshot, created_at, call_id,
        customers:customer_id (name, phone),
        calls:call_id (transcript)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('calls')
      .select('id, caller_phone, started_at, customers:customer_id (name)')
      .eq('merchant_id', merchantId)
      .eq('outcome', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1),
    supabase
      .from('escalations')
      .select(`
        id, reason, transcript_snapshot, created_at,
        calls:call_id (customers:customer_id (name))
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('calls')
      .select('duration_seconds, outcome')
      .eq('merchant_id', merchantId)
      .gte('started_at', todayStart),
  ])

  // KPIs
  const totalToday = (ordersToday ?? []).reduce((acc, o) => acc + (o.total_paise ?? 0), 0)
  const ordersCount = ordersToday?.length ?? 0
  const pendingCount = (ordersToday ?? []).filter(o => o.status === 'pending').length

  const callsTodayArr = callsToday ?? []
  const durations = callsTodayArr.map(c => c.duration_seconds).filter((d): d is number => typeof d === 'number' && d > 0)
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null
  const escalatedCount = callsTodayArr.filter(c => c.outcome === 'escalated').length
  const escalationRate = callsTodayArr.length
    ? Math.round((escalatedCount / callsTodayArr.length) * 100)
    : 0

  // Recent orders → cards. Cast through unknown — Supabase's join shapes
  // can be array OR object depending on FK cardinality typing.
  const initialOrders: OrderCardData[] = (recentOrders ?? []).map(o => {
    const c = o.customers as unknown as { name: string | null; phone: string | null } | null
    const call = o.calls as unknown as { transcript: unknown } | null
    return {
      id: o.id,
      status: o.status as OrderCardData['status'],
      total_paise: o.total_paise,
      items: Array.isArray(o.items) ? o.items as OrderCardData['items'] : [],
      delivery_address_snapshot: o.delivery_address_snapshot,
      created_at: o.created_at,
      customer_name: c?.name ?? null,
      customer_phone: c?.phone ?? null,
      customer_snippet: firstCustomerLine(call?.transcript),
    }
  })

  // Active call → hero badge data
  const activeCallRaw = activeCalls?.[0]
  const activeCall: ActiveCallData | null = activeCallRaw
    ? {
        caller_phone: activeCallRaw.caller_phone ?? null,
        customer_name: (activeCallRaw.customers as unknown as { name: string | null } | null)?.name ?? null,
        started_at: activeCallRaw.started_at ?? new Date().toISOString(),
      }
    : null

  // Escalations → mini cards
  const escalationCards: EscalationMiniData[] = (escalations ?? []).map(e => {
    const call = e.calls as unknown as { customers: { name: string | null } | null } | null
    return {
      id: e.id,
      reason: e.reason,
      created_at: e.created_at,
      customer_name: call?.customers?.name ?? null,
      transcript_snippet: e.transcript_snapshot
        ? String(e.transcript_snapshot).slice(0, 100)
        : null,
    }
  })

  return (
    <Page maxWidth="7xl">
      <PageHeader
        title="Dashboard"
        subtitle={`Operator pulse · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* Hero row — today's number + live call */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-8">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <StatHero
            label="Today"
            value={`${ordersCount} ${ordersCount === 1 ? 'order' : 'orders'}`}
            subtext={
              <span>
                <span className="font-medium text-stone-900 tabular-nums">{formatRupees(totalToday)}</span>{' '}
                <span className="text-stone-500">in phone orders</span>
              </span>
            }
          />
        </div>
        <ActiveCallBadge call={activeCall} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <KpiCard
          label="Pending"
          value={pendingCount}
          subtext={pendingCount === 0 ? 'All caught up' : 'Needs operator review'}
        />
        <KpiCard
          label="Avg call duration"
          value={avgDuration ? formatDuration(avgDuration) : '–'}
          subtext={callsTodayArr.length ? `${callsTodayArr.length} calls today` : 'No calls today'}
        />
        <KpiCard
          label="Escalation rate"
          value={`${escalationRate}%`}
          subtext={`${escalatedCount} of ${callsTodayArr.length || 0} calls`}
        />
      </div>

      {/* Main feed + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Recent orders */}
        <section>
          <SectionHeader
            title="Recent orders"
            count={initialOrders.length}
            right={
              <Link href="/orders" className="inline-flex items-center gap-1 text-rose-600 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <OrdersFeed initialOrders={initialOrders} merchantId={merchantId} cap={6} />
        </section>

        {/* Escalations queue */}
        <aside>
          <SectionHeader
            title="Escalations queue"
            count={escalationCards.length}
            right={
              escalationCards.length > 0 ? (
                <Link href="/escalations" className="text-rose-600 hover:underline">
                  Resolve →
                </Link>
              ) : null
            }
          />
          {escalationCards.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-5 text-center">
              <p className="text-sm font-medium text-stone-700">No escalations</p>
              <p className="text-xs text-stone-500 mt-0.5">Agent handled everything</p>
            </div>
          ) : (
            <div className="space-y-2">
              {escalationCards.map(e => (
                <EscalationMiniCard key={e.id} escalation={e} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </Page>
  )
}
