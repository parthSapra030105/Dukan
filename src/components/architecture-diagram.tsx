import { Globe, Layers, PhoneCall, Smartphone, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

const INTERFACE_METHODS = [
  'createAgent',
  'dispatchOutbound',
  'parseWebhook',
  'verifyWebhookSignature',
  'getCallRecording',
]

const PROVIDERS: Array<{
  key: string
  label: string
  status: 'active' | 'stub'
  subtitle: string
}> = [
  {
    key: 'bolna',
    label: 'Hosted voice AI',
    status: 'active',
    subtitle: 'GPT-4.1-mini · Deepgram · ElevenLabs',
  },
  {
    key: 'vapi',
    label: 'Vapi',
    status: 'stub',
    subtitle: 'Adapter scaffolded · not wired',
  },
  {
    key: 'custom',
    label: 'Custom',
    status: 'stub',
    subtitle: 'Bring your own LLM + TTS + STT',
  },
]

export function ArchitectureDiagram() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6">
      <div className="space-y-3">
        <Layer
          icon={Globe}
          label="Web app"
          sublabel="Dashboard · /api/agent/tools/* · /api/voice/webhook"
          tone="stone"
        />

        <Connector />

        <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-stone-600" />
            <p className="text-sm font-semibold text-stone-900">VoiceProvider interface</p>
            <code className="ml-auto text-[10px] text-stone-500 font-mono">
              src/lib/voice/types.ts
            </code>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INTERFACE_METHODS.map(m => (
              <code
                key={m}
                className="bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-stone-700"
              >
                {m}
              </code>
            ))}
          </div>
        </div>

        <Connector />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <ProviderBox key={p.key} label={p.label} status={p.status} subtitle={p.subtitle} />
          ))}
        </div>

        <Connector />

        <Layer
          icon={PhoneCall}
          label="Phone network"
          sublabel="Outbound dial · IP-allowlisted webhooks back to Web app"
          tone="stone"
        />

        <Connector />

        <Layer
          icon={Smartphone}
          label="Customer"
          sublabel="Real phone, Hindi or English, mid-cooking"
          tone="rose"
        />
      </div>

      <p className="text-xs text-stone-500 mt-5 pt-4 border-t border-stone-100 leading-relaxed">
        Provider is selected by the{' '}
        <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[10px]">VOICE_PROVIDER</code>{' '}
        env var. Swap to Vapi or a custom stack without touching application code — only the adapter
        needs to change.
      </p>
    </div>
  )
}

function Layer({
  icon: Icon,
  label,
  sublabel,
  tone,
}: {
  icon: LucideIcon
  label: string
  sublabel: string
  tone: 'stone' | 'rose'
}) {
  return (
    <div
      className={cn(
        'border rounded-lg p-3 flex items-center gap-3',
        tone === 'rose' ? 'border-rose-200 bg-rose-50/40' : 'border-stone-200 bg-white',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          tone === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-600',
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}

function ProviderBox({
  label,
  status,
  subtitle,
}: {
  label: string
  status: 'active' | 'stub'
  subtitle: string
}) {
  return (
    <div
      className={cn(
        'border rounded-lg p-3',
        status === 'active' ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-stone-50',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <p
          className={cn(
            'text-sm font-semibold',
            status === 'active' ? 'text-stone-900' : 'text-stone-500',
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded',
            status === 'active'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-stone-200 text-stone-500',
          )}
        >
          {status === 'active' && <span className="w-1 h-1 rounded-full bg-emerald-600" />}
          {status === 'active' ? 'Active' : 'Stub'}
        </span>
      </div>
      <p className="text-[10px] text-stone-500 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex justify-center">
      <div className="w-px h-4 bg-stone-300" />
    </div>
  )
}
