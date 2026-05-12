import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { ToolDoc } from '@/lib/voice/tools-catalog'
import type { ToolSyncState } from '@/lib/voice/bolna/fetch-agent'
import { cn } from '@/lib/cn'

interface ToolCardProps {
  tool: ToolDoc
  sync?: ToolSyncState | null
}

export function ToolCard({ tool, sync }: ToolCardProps) {
  const Icon = tool.icon
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-mono font-semibold text-stone-900 truncate">{tool.name}</p>
          <p className="text-[10px] text-stone-500 font-mono mt-0.5 truncate">
            <span className="text-rose-700 font-semibold">{tool.method}</span> {tool.endpoint}
          </p>
        </div>
        {sync && <SyncBadge sync={sync} />}
      </div>

      <p className="text-sm text-stone-700 leading-relaxed mb-3">{tool.description}</p>

      <div className="bg-stone-50 border border-stone-100 rounded-lg p-2.5 mb-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-0.5">When called</p>
        <p className="text-xs text-stone-700">{tool.when}</p>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2">Inputs</p>
        <div className="space-y-1.5">
          {tool.params.map(p => (
            <div
              key={p.name}
              className="grid grid-cols-[max-content_max-content_1fr] gap-2 text-xs items-baseline"
            >
              <code className="font-mono text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">{p.name}</code>
              <span
                className={cn(
                  'text-[9px] uppercase tracking-wider font-medium',
                  p.required ? 'text-rose-700' : 'text-stone-400',
                )}
              >
                {p.type}
                {p.required ? '' : ' · optional'}
              </span>
              <span className="text-stone-600 leading-relaxed">{p.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Returns</p>
        <code className="block bg-stone-900 text-stone-100 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all">
          {tool.returns}
        </code>
      </div>
    </div>
  )
}

function SyncBadge({ sync }: { sync: ToolSyncState }) {
  if (sync.state === 'synced') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5"
        title="Local catalog matches deployed Bolna agent"
      >
        <CheckCircle2 className="w-3 h-3" />
        Synced
      </span>
    )
  }
  if (sync.state === 'mismatch') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
        title={sync.issues.join(' · ')}
      >
        <AlertTriangle className="w-3 h-3" />
        Drift
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5"
      title="Tool exists locally but is not attached to the deployed agent"
    >
      <XCircle className="w-3 h-3" />
      Missing
    </span>
  )
}
