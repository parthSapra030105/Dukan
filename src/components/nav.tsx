import Link from 'next/link'
import { Mic } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'
import { NavLinks } from './nav-links'
import { BrandMark } from './brand-mark'

/**
 * Top nav. Server component — fetches live badge counts for Orders (pending)
 * and Escalations (queued). Includes a "Live agent" indicator.
 */
export async function Nav() {
  // Best-effort badge counts. Don't block the nav if these fail.
  let pendingOrders = 0
  let queuedEscalations = 0
  let activeCallNow = false

  try {
    const supabase = getSupabaseAdmin()
    const merchantId = await getDemoMerchantId()

    const [{ count: pending }, { count: queued }, { count: active }] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('status', 'pending'),
      supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'queued'),
      supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('outcome', 'in_progress'),
    ])
    pendingOrders = pending ?? 0
    queuedEscalations = queued ?? 0
    activeCallNow = (active ?? 0) > 0
  } catch (err) {
    // Nav must still render even if DB isn't reachable
    console.warn('[Nav] count fetch failed:', err)
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" aria-label="Dukan home">
            <BrandMark size="sm" />
          </Link>

          <NavLinks pendingOrders={pendingOrders} queuedEscalations={queuedEscalations} />
        </div>

        <AgentStatus active={activeCallNow} />
      </div>
    </header>
  )
}

function AgentStatus({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <div className="relative shrink-0">
        <Mic className={active ? 'w-4 h-4 text-rose-600' : 'w-4 h-4 text-emerald-600'} />
        {active && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
        )}
      </div>
      <div className="leading-tight hidden sm:block">
        <div className="text-stone-500 text-[10px] uppercase tracking-wider">
          {active ? 'On call' : 'Live agent'}
        </div>
        <div className="text-stone-900 font-medium">Sapra Bazar Agent</div>
      </div>
    </div>
  )
}
