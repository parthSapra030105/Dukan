import { Phone } from 'lucide-react'
import { formatPhone, timeAgo } from '@/lib/format'

export interface ActiveCallData {
  caller_phone: string | null
  customer_name: string | null
  started_at: string
}

interface Props {
  call: ActiveCallData | null
}

export function ActiveCallBadge({ call }: Props) {
  if (!call) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5 h-full flex items-center justify-center text-center">
        <div>
          <div className="w-10 h-10 rounded-full bg-stone-100 mx-auto mb-2 flex items-center justify-center">
            <Phone className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">No live call</p>
          <p className="text-xs text-stone-500 mt-0.5">
            Agent is standing by
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative inline-flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-rose-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-rose-600" />
        </span>
        <span className="text-xs uppercase tracking-wider font-medium text-rose-700">
          Live · on a call
        </span>
      </div>
      <p className="text-base font-medium text-stone-900">
        {call.customer_name ?? 'Unknown caller'}
      </p>
      {call.caller_phone && (
        <p className="text-sm font-mono text-stone-600 mt-0.5">
          {formatPhone(call.caller_phone)}
        </p>
      )}
      <p className="text-xs text-stone-500 mt-2">
        Started {timeAgo(call.started_at)}
      </p>
    </div>
  )
}
