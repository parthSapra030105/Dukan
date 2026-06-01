import { Activity, Mic, Globe, BrainCog, AlertCircle, type LucideIcon } from 'lucide-react'
import type { AgentFetchResult } from '@/lib/voice/bolna/fetch-agent'
import { timeAgo } from '@/lib/format'

interface AgentHeroProps {
  snapshot: AgentFetchResult
  toolCount: number
}

export function AgentHero({ snapshot, toolCount }: AgentHeroProps) {
  if (!snapshot.ok) {
    return <NotDeployedBanner reason={snapshot.reason} />
  }

  const { name, agentId, llm, voice, transcriber, fetchedAt } = snapshot
  const language = formatLanguage(transcriber?.language ?? null)
  const voiceLabel = voice?.voiceName
    ? `${cap(voice.synthProvider ?? '')} · ${cap(voice.voiceName)}`
    : voice?.synthProvider
      ? cap(voice.synthProvider)
      : '–'
  const modelLabel = llm?.model ?? '–'

  return (
    <div className="bg-gradient-to-br from-stone-50 via-white to-rose-50/40 border border-stone-200 rounded-xl p-6 mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
        <code className="text-[10px] font-mono text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
          agent_id · {agentId.slice(0, 8)}…
        </code>
        <span className="text-[10px] text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
          Last synced {timeAgo(fetchedAt)}
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-stone-900">{name}</h1>
      <p className="text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
        The phone-order operator for a neighbourhood supermarket. Takes orders in Hindi and English, knows
        ~40 SKUs by name and alias, writes orders to the dashboard in realtime, and routes to a human only
        on disputes, refunds, and bulk requests.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <HeroMeta icon={Globe}    label="Transcriber" value={transcriber ? `${cap(transcriber.provider)} · ${language}` : '–'} />
        <HeroMeta icon={Mic}      label="Voice"       value={voiceLabel} />
        <HeroMeta icon={BrainCog} label="Model"       value={modelLabel} hint={llm?.temperature != null ? `temp ${llm.temperature}` : undefined} />
        <HeroMeta icon={Activity} label="Tools"       value={`${snapshot.tools.length} deployed`} hint={`${toolCount} expected`} />
      </div>
    </div>
  )
}

function HeroMeta({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-stone-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
        <p className="text-xs font-medium text-stone-900 truncate">{value}</p>
        {hint && <p className="text-[10px] text-stone-400 truncate">{hint}</p>}
      </div>
    </div>
  )
}

function NotDeployedBanner({ reason }: { reason: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Agent not deployed</p>
          <p className="text-xs text-stone-700 mt-0.5">
            Couldn&apos;t fetch the live agent from the voice provider. The architecture, tools, and
            system prompt below are read from the local source of truth.
          </p>
          <code className="inline-block mt-2 text-[10px] font-mono text-amber-900 bg-amber-100 border border-amber-200 px-2 py-1 rounded">
            {reason}
          </code>
        </div>
      </div>
    </div>
  )
}

function cap(s: string): string {
  if (!s) return ''
  return s[0].toUpperCase() + s.slice(1)
}

function formatLanguage(code: string | null): string {
  if (!code) return ''
  const map: Record<string, string> = { hi: 'Hindi', en: 'English', mr: 'Marathi' }
  return map[code.toLowerCase()] ?? code
}
