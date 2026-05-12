import { Page, PageHeader } from '@/components/page'
import { StatusTabs } from '@/components/status-tabs'
import { EscalationCard, type EscalationCardData } from '@/components/escalation-card'
import { EscalationsRealtime } from '@/components/escalations-realtime'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { type EscalationStatus } from '@/components/status-pill'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUSES: Array<{ key: EscalationStatus; label: string }> = [
  { key: 'queued',    label: 'Queued' },
  { key: 'taken',     label: 'In progress' },
  { key: 'resolved',  label: 'Resolved' },
  { key: 'abandoned', label: 'Abandoned' },
]

// Sort priority: queued first, then taken, then resolved/abandoned
const STATUS_SORT: Record<EscalationStatus, number> = {
  queued: 0,
  taken: 1,
  resolved: 2,
  abandoned: 3,
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

interface EscalationRow {
  id: string
  reason: string
  status: string
  transcript_snapshot: string | null
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
  calls: {
    merchant_id: string
    duration_seconds: number | null
    language_detected: string | null
    customers: { name: string | null; phone: string | null } | null
  } | null
}

export default async function EscalationsPage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const filter = STATUSES.find(s => s.key === status)?.key

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  // Pull all escalations joined with call+customer info. Filter by merchant in app.
  // (Escalations table doesn't have merchant_id directly — it goes through calls.)
  const { data: rows } = await supabase
    .from('escalations')
    .select(`
      id, reason, status, transcript_snapshot, resolution_notes, created_at, resolved_at,
      calls:call_id (
        merchant_id, duration_seconds, language_detected,
        customers:customer_id (name, phone)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const all = ((rows ?? []) as unknown as EscalationRow[]).filter(
    r => r.calls?.merchant_id === merchantId,
  )

  // Tab counts
  const counts: Record<string, number> = {}
  for (const r of all) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  const totalCount = all.length

  // Filter + sort
  const filtered = (filter ? all.filter(r => r.status === filter) : all).slice().sort((a, b) => {
    const sa = STATUS_SORT[a.status as EscalationStatus] ?? 99
    const sb = STATUS_SORT[b.status as EscalationStatus] ?? 99
    if (sa !== sb) return sa - sb
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const cards: EscalationCardData[] = filtered.map(r => ({
    id: r.id,
    reason: r.reason,
    status: r.status as EscalationStatus,
    transcript_snapshot: r.transcript_snapshot,
    resolution_notes: r.resolution_notes,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    customer_name: r.calls?.customers?.name ?? null,
    customer_phone: r.calls?.customers?.phone ?? null,
    call_duration: r.calls?.duration_seconds ?? null,
    call_language: r.calls?.language_detected ?? null,
  }))

  const queuedCount = counts.queued ?? 0
  const takenCount = counts.taken ?? 0
  const resolvedCount = counts.resolved ?? 0

  return (
    <Page maxWidth="5xl">
      <EscalationsRealtime />

      <PageHeader
        title="Escalations"
        subtitle={
          queuedCount > 0
            ? `${queuedCount} need a human · ${takenCount} in progress`
            : 'No live escalations — agent is handling everything'
        }
      />

      {/* Mini KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MiniKpi
          label="Queued"
          value={queuedCount}
          tone={queuedCount > 0 ? 'rose' : 'stone'}
          icon={AlertTriangle}
        />
        <MiniKpi
          label="In progress"
          value={takenCount}
          tone={takenCount > 0 ? 'blue' : 'stone'}
          icon={AlertTriangle}
        />
        <MiniKpi
          label="Resolved (all time)"
          value={resolvedCount}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>

      <StatusTabs counts={counts} statuses={STATUSES} totalCount={totalCount} />

      {cards.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          {filter === 'queued' || (!filter && queuedCount === 0) ? (
            <>
              <div className="inline-flex w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-sm font-medium text-stone-700 mb-1">All clear</p>
              <p className="text-xs text-stone-500">
                When the agent hits an escalation trigger it&apos;ll land here in real time.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-stone-700 mb-1">
                No {filter ?? ''} escalations
              </p>
              <p className="text-xs text-stone-500">Try a different filter.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(c => (
            <EscalationCard key={c.id} escalation={c} />
          ))}
        </div>
      )}
    </Page>
  )
}

const TONE_BG: Record<'stone' | 'rose' | 'blue' | 'emerald', string> = {
  stone:   'bg-stone-100 text-stone-500',
  rose:    'bg-rose-100 text-rose-700',
  blue:    'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
}

function MiniKpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone: 'stone' | 'rose' | 'blue' | 'emerald'
  icon: typeof AlertTriangle
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONE_BG[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-semibold text-stone-900 tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  )
}
