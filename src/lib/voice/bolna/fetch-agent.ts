/**
 * Server-side: fetch the live deployed agent config from Bolna and normalise
 * it into a structure the /agent page can render. Lets us prove the agent is
 * actually deployed and surface drift between local source-of-truth and what's
 * running in production.
 */

export interface DeployedTool {
  name: string
  url: string | null
  method: string | null
  requiredParams: string[]
  declaredParams: string[]
}

export interface DeployedAgentSnapshot {
  ok: true
  fetchedAt: string
  agentId: string
  name: string
  welcomeMessage: string | null
  llm: {
    provider: string
    model: string
    temperature: number | null
  } | null
  voice: {
    synthProvider: string | null
    voiceId: string | null
    voiceName: string | null
    model: string | null
  } | null
  transcriber: {
    provider: string
    model: string
    language: string
  } | null
  tools: DeployedTool[]
}

export type AgentFetchResult =
  | DeployedAgentSnapshot
  | { ok: false; reason: string }

const BOLNA_API = 'https://api.bolna.ai'

export async function fetchDeployedAgent(): Promise<AgentFetchResult> {
  const apiKey = process.env.BOLNA_API_KEY
  const agentId = process.env.BOLNA_AGENT_ID
  if (!apiKey) return { ok: false, reason: 'BOLNA_API_KEY not set in env' }
  if (!agentId) return { ok: false, reason: 'BOLNA_AGENT_ID not set in env' }

  try {
    const res = await fetch(`${BOLNA_API}/v2/agent/${agentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        reason: `Bolna returned ${res.status} ${res.statusText}${body ? ' · ' + body.slice(0, 120) : ''}`,
      }
    }
    const raw = (await res.json()) as Record<string, unknown>
    return normalise(raw, agentId)
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'unknown fetch error',
    }
  }
}

function normalise(raw: Record<string, unknown>, agentId: string): DeployedAgentSnapshot {
  // Bolna's GET /v2/agent/:id returns the agent payload flat at top level
  // (NOT wrapped in agent_config — that's just the create-payload shape).
  // Tools live under: tasks[0].tools_config.api_tools.{ tools[], tools_params{} }
  const tasks = raw.tasks as Array<Record<string, unknown>> | undefined
  const cfg = (tasks?.[0]?.tools_config as Record<string, unknown>) ?? {}

  const llmAgent = cfg.llm_agent as Record<string, unknown> | undefined
  const llmConfig = llmAgent?.llm_config as Record<string, unknown> | undefined
  const voice = cfg.voice as Record<string, unknown> | undefined
  const synth = cfg.synthesizer as Record<string, unknown> | undefined
  const transcriber = cfg.transcriber as Record<string, unknown> | undefined
  const apiTools = cfg.api_tools as Record<string, unknown> | undefined

  const toolList = (apiTools?.tools as Array<Record<string, unknown>>) ?? []
  const paramsMap = (apiTools?.tools_params as Record<string, Record<string, unknown>>) ?? {}

  const tools: DeployedTool[] = toolList.map(t => {
    const name = String(t.name ?? '')
    const runtime = paramsMap[name] ?? {}
    const params = (t.parameters as Record<string, unknown>) ?? {}
    const required = Array.isArray(params.required) ? (params.required as string[]) : []
    const properties = (params.properties as Record<string, unknown>) ?? {}
    return {
      name,
      url: (runtime.url as string | undefined) ?? null,
      method: (runtime.method as string | undefined) ?? null,
      requiredParams: required,
      declaredParams: Object.keys(properties),
    }
  })

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    agentId,
    name: String(raw.agent_name ?? '<unnamed>'),
    welcomeMessage: (raw.agent_welcome_message as string | undefined) ?? null,
    llm: llmConfig
      ? {
          provider: String(llmConfig.provider ?? ''),
          model: String(llmConfig.model ?? ''),
          temperature: typeof llmConfig.temperature === 'number' ? llmConfig.temperature : null,
        }
      : null,
    voice: voice || synth
      ? {
          synthProvider: (synth?.provider as string | undefined) ?? null,
          voiceId: (voice?.voice_id as string | undefined) ?? null,
          voiceName: (voice?.voice as string | undefined) ?? null,
          model: (voice?.model as string | undefined) ?? null,
        }
      : null,
    transcriber: transcriber
      ? {
          provider: String(transcriber.provider ?? ''),
          model: String(transcriber.model ?? ''),
          language: String(transcriber.language ?? ''),
        }
      : null,
    tools,
  }
}

// ---------------------------------------------------------------------------
// Sync diff — match local TOOLS_CATALOG against the deployed snapshot
// ---------------------------------------------------------------------------

export type ToolSyncState =
  | { state: 'synced' }
  | { state: 'mismatch'; issues: string[] }
  | { state: 'missing' }

export interface ToolMatchInput {
  name: string
  method: 'POST'
  endpoint: string
  requiredParams: string[]
}

export function computeToolSync(
  local: ToolMatchInput,
  deployed: DeployedAgentSnapshot,
): ToolSyncState {
  const remote = deployed.tools.find(t => t.name === local.name)
  if (!remote) return { state: 'missing' }

  const issues: string[] = []

  if (remote.method && remote.method.toUpperCase() !== local.method) {
    issues.push(`method ${remote.method} vs ${local.method}`)
  }
  if (remote.url && !remote.url.endsWith(local.endpoint)) {
    issues.push('url mismatch')
  }
  const missingRequired = local.requiredParams.filter(r => !remote.requiredParams.includes(r))
  if (missingRequired.length) {
    issues.push(`missing required: ${missingRequired.join(', ')}`)
  }
  const orphanRequired = remote.requiredParams.filter(r => !remote.declaredParams.includes(r))
  if (orphanRequired.length) {
    issues.push(`orphan required: ${orphanRequired.join(', ')}`)
  }

  if (issues.length) return { state: 'mismatch', issues }
  return { state: 'synced' }
}
