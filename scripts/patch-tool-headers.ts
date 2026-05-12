/**
 * Patches all attached tools on the deployed Bolna agent to send a
 * shared-secret header (x-dukan-tool-secret) on every runtime call.
 *
 * Tool endpoints check this header (see src/app/api/agent/tools/_verify.ts)
 * — replaces the brittle IP-allowlist scheme for tool auth.
 *
 * Run: bun run scripts/patch-tool-headers.ts
 *
 * Then:
 *   1. Add TOOL_SHARED_SECRET to Vercel env (same value as local .env)
 *   2. Redeploy the web app
 *   3. Test a callback
 */
export {}

const SECRET_HEADER = 'x-dukan-tool-secret'

if (!process.env.BOLNA_API_KEY) {
  console.error('✗ BOLNA_API_KEY missing'); process.exit(1)
}
const agentId = process.env.BOLNA_AGENT_ID?.trim()
if (!agentId) {
  console.error('✗ BOLNA_AGENT_ID missing'); process.exit(1)
}
const secret = process.env.TOOL_SHARED_SECRET?.trim()
if (!secret) {
  console.error('✗ TOOL_SHARED_SECRET missing in env')
  console.error('  Generate one with: openssl rand -hex 32')
  console.error('  Then add to .env (local) AND Vercel env (production).')
  process.exit(1)
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
console.log(`✓ fetched agent\n`)

const tasks = agent.tasks as Array<Record<string, unknown>> | undefined
const task1 = tasks?.[0]
const toolsConfig = task1?.tools_config as Record<string, unknown> | undefined
const apiTools = toolsConfig?.api_tools as Record<string, unknown> | undefined
const toolsParams = apiTools?.tools_params as Record<string, Record<string, unknown>> | undefined

if (!toolsParams) {
  console.error('✗ no api_tools.tools_params found in agent')
  process.exit(1)
}

const toolNames = Object.keys(toolsParams)
console.log(`Found ${toolNames.length} tool runtime configs:`)

for (const name of toolNames) {
  const cfg = toolsParams[name]
  const existing = (cfg.headers as Record<string, string> | undefined) ?? {}
  const merged: Record<string, string> = { ...existing, [SECRET_HEADER]: secret }
  cfg.headers = merged
  console.log(`  ✓ ${name} — header attached`)
}

const agentPrompts = agent.agent_prompts ?? { task_1: { system_prompt: '' } }
const skipKeys = new Set([
  'id',
  'created_at',
  'updated_at',
  'agent_prompts',
  'agent_status',
  'ingest_source_config',
])
const agentConfig: Record<string, unknown> = {}
for (const [k, v] of Object.entries(agent)) {
  if (!skipKeys.has(k)) agentConfig[k] = v
}
const putBody = { agent_config: agentConfig, agent_prompts: agentPrompts }

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

console.log(`✓ all ${toolNames.length} tools patched with ${SECRET_HEADER}\n`)
console.log(`Next steps:`)
console.log(`  1. Set TOOL_SHARED_SECRET in Vercel project env (Production + Preview)`)
console.log(`  2. Redeploy: vercel --prod  (or push to main)`)
console.log(`  3. Test a callback — tool calls should now 200`)
console.log(`  4. Run \`bun run scripts/verify-bolna-tools.ts\` to confirm`)
