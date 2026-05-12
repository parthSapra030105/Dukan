import { AlertTriangle, Phone, Clock, FileText } from 'lucide-react'
import { StatusPill, type EscalationStatus } from './status-pill'
import { EscalationActions } from './escalation-actions'
import { cn } from '@/lib/cn'
import { formatPhone, timeAgo, formatDuration } from '@/lib/format'

const REASON_LABELS: Record<string, string> = {
  payment_dispute: 'Payment dispute',
  return_request: 'Return / refund',
  complaint: 'Customer complaint',
  off_menu: 'Off-menu request',
  bulk_order: 'Bulk order',
  bulk_order_over_10k: 'Bulk order over ₹10k',
  human_request: 'Asked for a human',
  misunderstanding: 'Misunderstanding',
  three_strike_misunderstanding: 'Repeat misunderstanding',
}

export interface EscalationCardData {
  id: string
  reason: string
  status: EscalationStatus
  transcript_snapshot: string | null
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
  customer_name: string | null
  customer_phone: string | null
  call_duration: number | null
  call_language: string | null
}

const STATUS_ACCENT: Record<EscalationStatus, { ring: string; bg: string; icon: string }> = {
  queued:    { ring: 'border-rose-200',    bg: 'bg-rose-50/30',    icon: 'text-rose-600' },
  taken:     { ring: 'border-blue-200',    bg: 'bg-blue-50/30',    icon: 'text-blue-600' },
  resolved:  { ring: 'border-stone-200',   bg: 'bg-white',         icon: 'text-emerald-600' },
  abandoned: { ring: 'border-stone-200',   bg: 'bg-stone-50',      icon: 'text-stone-400' },
}

export function EscalationCard({ escalation }: { escalation: EscalationCardData }) {
  const accent = STATUS_ACCENT[escalation.status]
  const reasonLabel = REASON_LABELS[escalation.reason] ?? escalation.reason.replace(/_/g, ' ')
  const muted = escalation.status === 'abandoned' || escalation.status === 'resolved'

  return (
    <article
      className={cn(
        'border rounded-xl p-5 transition-colors',
        accent.ring,
        accent.bg,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn('shrink-0 w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center', muted && 'opacity-70')}>
            <AlertTriangle className={cn('w-4 h-4', accent.icon)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900">{reasonLabel}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {escalation.customer_name ?? 'Walk-in caller'}
              {escalation.customer_phone && (
                <>
                  {' '}
                  <span className="text-stone-300">·</span>{' '}
                  <span className="font-mono">{formatPhone(escalation.customer_phone)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill kind="escalation" status={escalation.status} />
          <p className="text-[10px] text-stone-400 whitespace-nowrap">
            {timeAgo(escalation.created_at)}
          </p>
        </div>
      </div>

      {/* Call meta */}
      {(escalation.call_duration || escalation.call_language) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 mb-3 pl-12">
          {escalation.call_duration && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {formatDuration(escalation.call_duration)}
            </span>
          )}
          {escalation.call_language && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {escalation.call_language}
            </span>
          )}
        </div>
      )}

      {/* Transcript snapshot */}
      {escalation.transcript_snapshot && (
        <blockquote
          className={cn(
            'mt-3 pl-3 border-l-2 italic text-sm text-stone-700',
            escalation.status === 'queued' ? 'border-rose-300' : 'border-stone-300',
          )}
        >
          <p className="line-clamp-3">&ldquo;{escalation.transcript_snapshot}&rdquo;</p>
        </blockquote>
      )}

      {/* Resolution notes (after resolved) */}
      {escalation.resolution_notes && (
        <div className="mt-3 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider font-medium text-emerald-700 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Resolution
          </p>
          <p className="text-xs text-stone-700">{escalation.resolution_notes}</p>
        </div>
      )}

      {/* Resolved/abandoned timestamp */}
      {escalation.resolved_at && (
        <p className="text-[10px] text-stone-400 mt-2">
          {escalation.status === 'resolved' ? 'Resolved' : 'Abandoned'} {timeAgo(escalation.resolved_at)}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-stone-100">
        <EscalationActions escalationId={escalation.id} status={escalation.status} />
      </div>
    </article>
  )
}
