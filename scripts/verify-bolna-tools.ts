/**
 * Verifies the 5 tools attached to the Bolna agent.
 *
 * Lists all agents → finds the "Sapra Bazar — Order Agent" (or uses BOLNA_AGENT_ID if set)
 * → checks each expected tool is present with correct shape.
 *
 * Run: bun run scripts/verify-bolna-tools.ts
 */
export {}

if (!process.env.BOLNA_API_KEY) {
  console.error('✗ BOLNA_API_KEY missing in env')
  process.exit(1)
}

const API = 'https://api.bolna.ai'
const HEADERS = {
  Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
}

const EXPECTED_TOOLS = [
  {
    name: 'lookup_customer',
    url: 'https://dukan.parthsapra.me/api/agent/tools/lookup-customer',
    required: ['phone'],
  },
  {
    name: 'catalog_search',
    url: 'https://dukan.parthsapra.me/api/agent/tools/catalog-search',
    required: ['query', 'language'],
  },
  {
    name: 'validate_address',
    url: 'https://dukan.parthsapra.me/api/agent/tools/validate-address',
    required: ['text'],
  },
  {
    name: 'place_order',
    url: 'https://dukan.parthsapra.me/api/agent/tools/place-order',
    required: ['call_id', 'item_skus', 'item_quantities', 'delivery_address', 'delivery_slot', 'total_paise', 'language'],
  },
  {
    name: 'escalate_to_human',
    url: 'https://dukan.parthsapra.me/api/agent/tools/escalate',
    required: ['call_id', 'reason', 'transcript_so_far'],
  },
]

async function findAgent(): Promise<{ id: string; raw: Record<string, unknown> }> {
  const idFromEnv = process.env.BOLNA_AGENT_ID?.trim()
  if (idFromEnv) {
    const res = await fetch(`${API}/v2/agent/${idFromEnv}`, { headers: HEADERS })
    if (!res.ok) {
      throw new Error(`GET /v2/agent/${idFromEnv} → ${res.status} ${await res.text()}`)
    }
    return { id: idFromEnv, raw: (await res.json()) as Record<string, unknown> }
  }

  console.log('ℹ BOLNA_AGENT_ID not set — listing agents to find one matching "Sapra Bazar"…')
  const listRes = await fetch(`${API}/v2/agent/all`, { headers: HEADERS })
  if (!listRes.ok) {
    throw new Error(`GET /v2/agent/all → ${listRes.status} ${await listRes.text()}`)
  }
  const agents = (await listRes.json()) as Array<Record<string, unknown>>
  const flat: Array<{ id: string; name: string; raw: Record<string, unknown> }> = []
  for (const a of agents) {
    const id = String(a.id ?? a.agent_id ?? '')
    const cfg = a.agent_config as Record<string, unknown> | undefined
    const name = String(cfg?.agent_name ?? a.name ?? '<unnamed>')
    if (id) flat.push({ id, name, raw: a })
  }
  console.log(`  found ${flat.length} agents:`)
  for (const a of flat) console.log(`    ${a.id} — ${a.name}`)
  const target = flat.find(a => /sapra|dukan|order/i.test(a.name)) ?? flat[0]
  if (!target) throw new Error('no agents found at all')
  console.log(`✓ using agent: ${target.name} (${target.id})\n`)
  return { id: target.id, raw: target.raw }
}

interface ToolEntry {
  name: string
  description?: string
  parameters?: { required?: string[]; properties?: Record<string, unknown> }
  pre_call_message?: string | null
  /** Merged from tools_params[name] */
  url?: string
  method?: string
  param?: Record<string, unknown>
  headers?: Record<string, unknown>
}

/** Bolna splits tools across two structures:
 *    tasks[0].tools_config.api_tools.tools[]        — LLM schema (name, description, parameters)
 *    tasks[0].tools_config.api_tools.tools_params{} — HTTP runtime (url, method, param), keyed by name
 *  Merge them into one logical view.
 */
function findToolsInAgent(agent: Record<string, unknown>): ToolEntry[] {
  // Agent JSON is flat — no `agent_config` wrapper at the top level.
  const tasks = agent.tasks as Array<Record<string, unknown>> | undefined
  const task1 = tasks?.[0]
  const toolsConfig = task1?.tools_config as Record<string, unknown> | undefined
  const apiTools = toolsConfig?.api_tools as Record<string, unknown> | undefined
  if (!apiTools) return []

  const toolList = (apiTools.tools as Array<ToolEntry>) ?? []
  const paramsMap = (apiTools.tools_params as Record<string, Record<string, unknown>>) ?? {}

  return toolList.map(t => {
    const runtime = paramsMap[t.name] ?? {}
    return {
      ...t,
      url: runtime.url as string | undefined,
      method: runtime.method as string | undefined,
      param: runtime.param as Record<string, unknown> | undefined,
      headers: runtime.headers as Record<string, unknown> | undefined,
    }
  })
}

async function main() {
  const agent = await findAgent()
  const tools = findToolsInAgent(agent.raw)
  console.log(`Agent has ${tools.length} tools attached.\n`)

  let pass = 0
  let fail = 0
  for (const expected of EXPECTED_TOOLS) {
    const got = tools.find(t => t.name === expected.name)
    console.log(`◇ ${expected.name}`)
    if (!got) {
      console.log(`  ✗ NOT FOUND in agent's tool list`)
      fail++
      continue
    }
    let ok = true

    // URL match
    const gotUrl = got.url ?? ''
    if (gotUrl !== expected.url) {
      console.log(`  ✗ url mismatch`)
      console.log(`     expected: ${expected.url}`)
      console.log(`     got:      ${gotUrl}`)
      ok = false
    } else {
      console.log(`  ✓ url`)
    }

    // Method
    const gotMethod = got.method ?? ''
    if (gotMethod !== 'POST') {
      console.log(`  ✗ method should be POST, got "${gotMethod}"`)
      ok = false
    } else {
      console.log(`  ✓ method POST`)
    }

    // Required vs properties consistency — a `required` entry with no matching property is unfixable for the LLM
    const gotRequired = new Set(got.parameters?.required ?? [])
    const gotProps = new Set(Object.keys(got.parameters?.properties ?? {}))
    const orphanRequired = [...gotRequired].filter(r => !gotProps.has(r))
    if (orphanRequired.length) {
      console.log(`  ✗ required references undeclared properties: ${orphanRequired.join(', ')}`)
      console.log(`     LLM cannot supply these; tool will fail at runtime`)
      ok = false
    }

    // Required vs expected
    const missing = expected.required.filter(r => !gotRequired.has(r))
    if (missing.length === 0) {
      console.log(`  ✓ required params: ${expected.required.join(', ')}`)
    } else {
      console.log(`  ⚠ missing required params: ${missing.join(', ')}`)
    }

    // Body params present
    const gotBodyKeys = Object.keys(got.param ?? {})
    const missingInBody = expected.required.filter(r => !gotBodyKeys.includes(r))
    if (missingInBody.length === 0) {
      console.log(`  ✓ body has all required keys`)
    } else {
      console.log(`  ✗ body is missing keys: ${missingInBody.join(', ')}`)
      ok = false
    }

    if (ok) pass++
    else fail++
    console.log('')
  }

  console.log('━'.repeat(50))
  console.log(`${pass}/${EXPECTED_TOOLS.length} tools passed verification`)
  if (fail > 0) {
    console.log(`${fail} tool(s) have issues — fix in Bolna dashboard, re-run this script`)
    process.exit(1)
  } else {
    console.log('✓ All tools look good. Ready to test a real call.')
  }
}

main().catch(err => {
  console.error('\n✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
