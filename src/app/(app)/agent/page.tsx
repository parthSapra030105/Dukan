import fs from 'node:fs/promises'
import path from 'node:path'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Page } from '@/components/page'
import { SectionHeader } from '@/components/section-header'
import { AgentHero } from '@/components/agent-hero'
import { ArchitectureDiagram } from '@/components/architecture-diagram'
import { ToolCard } from '@/components/tool-card'
import { SystemPromptViewer } from '@/components/system-prompt-viewer'
import { CallbackForm } from '@/app/callback-form'
import { TOOLS_CATALOG } from '@/lib/voice/tools-catalog'
import {
  fetchDeployedAgent,
  computeToolSync,
  type ToolSyncState,
} from '@/lib/voice/bolna/fetch-agent'

export const dynamic = 'force-dynamic'

const PROMPT_PATH = 'src/lib/voice/bolna/prompts/order-agent.md'

async function loadSystemPrompt(): Promise<string> {
  try {
    return await fs.readFile(path.join(process.cwd(), PROMPT_PATH), 'utf-8')
  } catch (err) {
    console.error('[agent/page] failed to load system prompt:', err)
    return '# System prompt unavailable\n\nCould not read `' + PROMPT_PATH + '` at request time.'
  }
}

export default async function AgentPage() {
  const [systemPrompt, snapshot] = await Promise.all([loadSystemPrompt(), fetchDeployedAgent()])

  // Sync each local tool against deployed state (null = not deployed, skip diff)
  const toolSyncs: Map<string, ToolSyncState> = new Map()
  if (snapshot.ok) {
    for (const local of TOOLS_CATALOG) {
      toolSyncs.set(
        local.name,
        computeToolSync(
          {
            name: local.name,
            method: local.method,
            endpoint: local.endpoint,
            requiredParams: local.params.filter(p => p.required).map(p => p.name),
          },
          snapshot,
        ),
      )
    }
  }

  const syncedCount = [...toolSyncs.values()].filter(s => s.state === 'synced').length
  const driftCount = [...toolSyncs.values()].filter(s => s.state === 'mismatch').length
  const missingCount = [...toolSyncs.values()].filter(s => s.state === 'missing').length

  return (
    <Page maxWidth="6xl">
      <AgentHero snapshot={snapshot} toolCount={TOOLS_CATALOG.length} />

      <section className="mb-12">
        <SectionHeader title="Architecture" right={<span>Provider-agnostic</span>} />
        <ArchitectureDiagram />
      </section>

      <section className="mb-12">
        <SectionHeader
          title="Tools"
          count={TOOLS_CATALOG.length}
          right={
            snapshot.ok ? (
              <SyncSummary synced={syncedCount} drift={driftCount} missing={missingCount} total={TOOLS_CATALOG.length} />
            ) : (
              <span>Live sync unavailable</span>
            )
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS_CATALOG.map(t => (
            <ToolCard key={t.name} tool={t} sync={toolSyncs.get(t.name) ?? null} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader
          title="System prompt"
          right={<span className="font-mono">order-agent.md</span>}
        />
        <div className="bg-white border border-stone-200 rounded-xl p-6 lg:p-8">
          <SystemPromptViewer markdown={systemPrompt} />
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader title="Try the agent" right={<span>Trial mode · verified numbers only</span>} />
        <div className="max-w-md">
          <CallbackForm />
        </div>
      </section>
    </Page>
  )
}

function SyncSummary({
  synced,
  drift,
  missing,
  total,
}: {
  synced: number
  drift: number
  missing: number
  total: number
}) {
  if (synced === total) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        {synced}/{total} synced with provider
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-800">
      <AlertTriangle className="w-3 h-3" />
      {synced}/{total} synced
      {drift > 0 && <> · {drift} drift</>}
      {missing > 0 && <> · {missing} missing</>}
    </span>
  )
}
