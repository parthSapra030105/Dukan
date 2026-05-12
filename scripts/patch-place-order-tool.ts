/**
 * Patches Bolna's place_order tool to use the new flat schema
 * (item_skus + item_quantities as comma-separated strings, instead of items JSON-string).
 *
 * Also pushes the updated system prompt from src/lib/voice/bolna/prompts/order-agent.md
 * so the LLM is told about the new shape.
 *
 * Run: bun run scripts/patch-place-order-tool.ts
 */

export {}

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

if (!process.env.BOLNA_API_KEY) { console.error('✗ BOLNA_API_KEY missing'); process.exit(1) }
if (!process.env.BOLNA_AGENT_ID) { console.error('✗ BOLNA_AGENT_ID missing'); process.exit(1) }

const agentId = process.env.BOLNA_AGENT_ID!.trim()
const API = 'https://api.bolna.ai'
const HEADERS = {
  Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
  'Content-Type': 'application/json',
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const promptPath = join(__dirname, '..', 'src', 'lib', 'voice', 'bolna', 'prompts', 'order-agent.md')
const newPrompt = readFileSync(promptPath, 'utf-8')

// 1) GET current agent
console.log(`⏵ GET /v2/agent/${agentId}`)
const getRes = await fetch(`${API}/v2/agent/${agentId}`, { headers: HEADERS })
if (!getRes.ok) {
  console.error(`✗ GET failed: ${getRes.status} ${await getRes.text()}`)
  process.exit(1)
}
const agent = (await getRes.json()) as Record<string, unknown>
console.log('✓ fetched agent')

// 2) Find place_order in both tools[] and tools_params{}
type ToolEntry = {
  name: string
  description?: string
  parameters?: { type?: string; required?: string[]; properties?: Record<string, unknown> }
  pre_call_message?: string | null
}
const tasks = agent.tasks as Array<Record<string, unknown>>
const tools_config = tasks[0].tools_config as Record<string, unknown>
const api_tools = tools_config.api_tools as Record<string, unknown>
const tools = api_tools.tools as ToolEntry[]
const tools_params = api_tools.tools_params as Record<string, Record<string, unknown>>

const placeOrder = tools.find(t => t.name === 'place_order')
if (!placeOrder) {
  console.error('✗ place_order tool not found in agent')
  process.exit(1)
}

// 3) Update place_order's LLM schema
placeOrder.description =
  'Place the final order after the customer explicitly confirms. ' +
  'Pass item_skus as a comma-separated string of SKUs (from catalog_search results), e.g. "tamatar-500g,dahi-amul-400g". ' +
  'Pass item_quantities as a comma-separated string of integers position-matched to SKUs, e.g. "1,2". ' +
  'The server looks up name, price, and unit from the catalog automatically. ' +
  'Pass customer_id if lookup_customer returned one; otherwise pass customer_phone (the caller\'s number from user_data). ' +
  'Call this exactly once after the customer says yes to your read-back. ' +
  'Returns order_id and SMS confirmation status.'

placeOrder.parameters = {
  type: 'object',
  properties: {
    call_id:          { type: 'string' },
    customer_id:      { type: 'string' },
    customer_phone:   { type: 'string' },
    item_skus:        { type: 'string' },
    item_quantities:  { type: 'string' },
    delivery_address: { type: 'string' },
    delivery_slot:    { type: 'string' },
    total_paise:      { type: 'string' },
    language:         { type: 'string' },
  },
  required: [
    'call_id',
    'item_skus',
    'item_quantities',
    'delivery_address',
    'delivery_slot',
    'total_paise',
    'language',
  ],
}

placeOrder.pre_call_message = 'Order place kar rahi hu, ek minute…'

// 4) Update place_order's HTTP runtime config (tools_params)
const placeOrderRuntime = tools_params['place_order']
if (!placeOrderRuntime) {
  console.error('✗ place_order not in tools_params')
  process.exit(1)
}
placeOrderRuntime.param = {
  call_id:          '%(call_id)s',
  customer_id:      '%(customer_id)s',
  customer_phone:   '%(customer_phone)s',
  item_skus:        '%(item_skus)s',
  item_quantities:  '%(item_quantities)s',
  delivery_address: '%(delivery_address)s',
  delivery_slot:    '%(delivery_slot)s',
  total_paise:      '%(total_paise)s',
  language:         '%(language)s',
}
console.log('✓ patched place_order schema + runtime params')

// 5) Update system prompt
const agentPrompts = (agent.agent_prompts ?? {}) as Record<string, Record<string, string>>
agentPrompts.task_1 = { ...agentPrompts.task_1, system_prompt: newPrompt }
console.log(`✓ updated system_prompt (${newPrompt.split(/\s+/).length} words)`)

// 6) Build PUT body — re-wrap into Bolna's expected schema
const skipKeys = new Set([
  'id', 'created_at', 'updated_at', 'agent_status',
  'agent_prompts', 'ingest_source_config',
])
const agentConfig: Record<string, unknown> = {}
for (const [k, v] of Object.entries(agent)) {
  if (!skipKeys.has(k)) agentConfig[k] = v
}

const putBody = { agent_config: agentConfig, agent_prompts: agentPrompts }

console.log(`\n⏵ PUT /v2/agent/${agentId}`)
const putRes = await fetch(`${API}/v2/agent/${agentId}`, {
  method: 'PUT',
  headers: HEADERS,
  body: JSON.stringify(putBody),
})
const putText = await putRes.text()
if (!putRes.ok) {
  console.error(`✗ PUT failed: ${putRes.status}`)
  console.error(putText.slice(0, 800))
  process.exit(1)
}
console.log('✓ agent updated')
console.log('\nNext: run `bun run scripts/verify-bolna-tools.ts` (won\'t catch new schema since verify doesn\'t know about item_skus — but it\'ll confirm the agent still has 5 tools).')
console.log('Then: test in Bolna chat. Order something simple, confirm.')
