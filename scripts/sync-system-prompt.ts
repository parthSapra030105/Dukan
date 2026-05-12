/**
 * Reads src/lib/voice/bolna/prompts/order-agent.md and pushes it as the deployed
 * Bolna agent's system prompt (agent_prompts.task_1.system_prompt).
 *
 * Use after editing the prompt file locally.
 *
 * Run: bun run scripts/sync-system-prompt.ts
 */
export {}

import fs from 'node:fs/promises'
import path from 'node:path'

if (!process.env.BOLNA_API_KEY) {
  console.error('✗ BOLNA_API_KEY missing'); process.exit(1)
}
const agentId = process.env.BOLNA_AGENT_ID?.trim()
if (!agentId) {
  console.error('✗ BOLNA_AGENT_ID missing'); process.exit(1)
}

const API = 'https://api.bolna.ai'
const HEADERS = {
  Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
  'Content-Type': 'application/json',
}

const promptPath = path.join(process.cwd(), 'src/lib/voice/bolna/prompts/order-agent.md')
const newPrompt = await fs.readFile(promptPath, 'utf-8')
console.log(`✓ loaded prompt from ${promptPath} (${newPrompt.length} chars)\n`)

console.log(`⏵ GET /v2/agent/${agentId}…`)
const getRes = await fetch(`${API}/v2/agent/${agentId}`, { headers: HEADERS })
if (!getRes.ok) {
  console.error(`✗ GET failed: ${getRes.status} ${await getRes.text()}`)
  process.exit(1)
}
const agent = (await getRes.json()) as Record<string, unknown>
console.log(`✓ fetched agent`)

// Bolna's GET returns `agent_prompts` flat; PUT expects { agent_config, agent_prompts }.
const oldPrompts = (agent.agent_prompts as Record<string, { system_prompt?: string }> | undefined) ?? {}
const oldPrompt = oldPrompts.task_1?.system_prompt ?? ''
console.log(`  current prompt: ${oldPrompt.length} chars`)
console.log(`  new prompt:     ${newPrompt.length} chars`)

if (oldPrompt === newPrompt) {
  console.log(`\nℹ no changes — prompt already up-to-date on Bolna`)
  process.exit(0)
}

const newAgentPrompts = {
  ...oldPrompts,
  task_1: { ...(oldPrompts.task_1 ?? {}), system_prompt: newPrompt },
}

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

const putBody = { agent_config: agentConfig, agent_prompts: newAgentPrompts }

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
console.log(`✓ system prompt synced to Bolna`)
console.log(`  Test on your next call — no redeploy of the web app needed.`)
