import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'

export interface EscalationMiniData {
  id: string
  reason: string
  created_at: string
  customer_name?: string | null
  transcript_snippet?: string | null
}

const REASON_LABELS: Record<string, string> = {
  payment_dispute: 'Payment dispute',
  return_request: 'Return / refund',
  complaint: 'Complaint',
  off_menu: 'Off-menu request',
  bulk_order: 'Bulk order',
  bulk_order_over_10k: 'Bulk order',
  human_request: 'Asked for human',
  misunderstanding: 'Misunderstanding',
  three_strike_misunderstanding: 'Misunderstanding',
}

export function EscalationMiniCard({ escalation, href }: { escalation: EscalationMiniData; href?: string }) {
  const label = REASON_LABELS[escalation.reason] ?? escalation.reason.replace(/_/g, ' ')

  return (
    <Link
      href={href ?? '/escalations'}
      className={cn(
        'block bg-white border border-rose-200 rounded-lg p-3',
        'hover:border-rose-300 transition-colors',
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900">{label}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {escalation.customer_name ?? 'Caller'} · {timeAgo(escalation.created_at)}
          </p>
          {escalation.transcript_snippet && (
            <p className="text-xs text-stone-600 italic mt-1.5 line-clamp-2">
              &ldquo;{escalation.transcript_snippet}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
