/**
 * Patches the Bolna agent for two specific issues:
 *   1. Removes 'limit' from catalog_search.parameters.required (still missing from properties)
 *   2. Sets the agent's webhook_url so end-of-call payload reaches our /api/voice/webhook
 *
 * Strategy: GET current agent → modify in-place → PUT back.
 * Bolna's PUT expects { agent_config: {...}, agent_prompts: {...} }, but GET returns
 * a flat shape. We re-wrap before PUT.
 *
 * Run: bun run scripts/patch-bolna-agent.ts
 */
export {}

if (!process.env.BOLNA_API_KEY) {
  console.error('✗ BOLNA_API_KEY missing'); process.exit(1)
}
const agentId = process.env.BOLNA_AGENT_ID?.trim()
if (!agentId) {
  console.error('✗ BOLNA_AGENT_ID missing'); process.exit(1)
}
const publicUrl = process.env.BOLNA_WEBHOOK_PUBLIC_URL?.replace(/\/$/, '')
if (!publicUrl) {
  console.error('✗ BOLNA_WEBHOOK_PUBLIC_URL missing'); process.exit(1)
}

const API = 'https://api.bolna.ai'
const HEADERS = {
  Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
  'Content-Type': 'application/json',
}

console.log(`⏵ GET /v2/agent/${agentId}…`)
const getRes = await fetch(`${API}/v2/agent/${agentId}`, { headers: HEADERS })
if (!getRes.ok) {
  console.error(`✗ GET failed: ${getRes.status} ${await getRes.text()}`)
  process.exit(1)
}
const agent = (await getRes.json()) as Record<string, unknown>
console.log(`✓ fetched agent`)

// -----------------------------------------------------------------------------
// Patch 1 — catalog_search.parameters.required (drop "limit")
// -----------------------------------------------------------------------------
const tasks = agent.tasks as Array<Record<string, unknown>> | undefined
const task1 = tasks?.[0]
const toolsConfig = task1?.tools_config as Record<string, unknown> | undefined
const apiTools = toolsConfig?.api_tools as Record<string, unknown> | undefined
const toolList = apiTools?.tools as Array<{
  name: string
  parameters?: { required?: string[]; properties?: Record<string, unknown> }
}>

if (!toolList) {
  console.error('✗ no api_tools.tools array found in agent')
  process.exit(1)
}

const catalog = toolList.find(t => t.name === 'catalog_search')
if (!catalog) {
  console.warn('⚠ catalog_search not found — skipping required-array patch')
} else if (!catalog.parameters?.required?.includes('limit')) {
  console.log('ℹ catalog_search.required already clean (no "limit")')
} else {
  catalog.parameters.required = catalog.parameters.required.filter(r => r !== 'limit')
  console.log('✓ patched catalog_search.required — removed "limit"')
}

// -----------------------------------------------------------------------------
// Patch 2 — agent webhook_url (top-level field)
// -----------------------------------------------------------------------------
const desiredWebhookUrl = `${publicUrl}/api/voice/webhook`
if (agent.webhook_url === desiredWebhookUrl) {
  console.log(`ℹ webhook_url already ${desiredWebhookUrl}`)
} else {
  agent.webhook_url = desiredWebhookUrl
  console.log(`✓ set webhook_url → ${desiredWebhookUrl}`)
}

// -----------------------------------------------------------------------------
// PUT — re-wrap into Bolna's expected schema
// -----------------------------------------------------------------------------
const agentPrompts = agent.agent_prompts ?? { task_1: { system_prompt: '' } }

// Build agent_config from the flat GET shape (everything except id, timestamps, agent_prompts, ingest_source_config)
const skipKeys = new Set(['id', 'created_at', 'updated_at', 'agent_prompts', 'agent_status', 'ingest_source_config'])
const agentConfig: Record<string, unknown> = {}
for (const [k, v] of Object.entries(agent)) {
  if (!skipKeys.has(k)) agentConfig[k] = v
}

const putBody = {
  agent_config: agentConfig,
  agent_prompts: agentPrompts,
}

console.log(`\n⏵ PUT /v2/agent/${agentId}…`)
const putRes = await fetch(`${API}/v2/agent/${agentId}`, {
  method: 'PUT',
  headers: HEADERS,
  body: JSON.stringify(putBody),
})
const putRespText = await putRes.text()
if (!putRes.ok) {
  console.error(`✗ PUT failed: ${putRes.status}`)
  console.error(putRespText.slice(0, 800))
  process.exit(1)
}
console.log(`✓ agent updated`)
console.log('\nRun `bun run scripts/verify-bolna-tools.ts` to confirm 5/5 clean.')
