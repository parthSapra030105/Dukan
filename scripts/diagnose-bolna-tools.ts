/**
 * Diagnostic: fetch the deployed Bolna agent and report on tool-auth state.
 *
 * Tells you:
 *   - For each tool: URL, method, whether x-dukan-tool-secret header is set
 *   - Whether the secret in Bolna matches your local TOOL_SHARED_SECRET
 *   - Whether the agent's webhook_url points at your deployment
 *
 * Run: bun run scripts/diagnose-bolna-tools.ts
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
const localSecret = process.env.TOOL_SHARED_SECRET?.trim() ?? ''

const API = 'https://api.bolna.ai'
const HEADERS = { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` }

const res = await fetch(`${API}/v2/agent/${agentId}`, { headers: HEADERS })
if (!res.ok) {
  console.error(`✗ GET /v2/agent/${agentId} failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const agent = (await res.json()) as Record<string, unknown>

console.log('━'.repeat(70))
console.log(`Agent: ${agent.agent_name} (${agentId})`)
console.log(`Webhook URL: ${agent.webhook_url ?? '<not set>'}`)
console.log('━'.repeat(70))

console.log(`\nLocal env TOOL_SHARED_SECRET: ${localSecret ? `${localSecret.slice(0, 6)}… (${localSecret.length} chars)` : '<NOT SET>'}`)

const tasks = agent.tasks as Array<Record<string, unknown>> | undefined
const task1 = tasks?.[0]
const toolsConfig = task1?.tools_config as Record<string, unknown> | undefined
const apiTools = toolsConfig?.api_tools as Record<string, unknown> | undefined
const toolsParams = apiTools?.tools_params as Record<string, Record<string, unknown>> | undefined

if (!toolsParams) {
  console.error('\n✗ no api_tools.tools_params found on agent')
  process.exit(1)
}

console.log(`\nTools in agent runtime config: ${Object.keys(toolsParams).length}\n`)

let allMatch = true
let anyHeader = false
for (const [name, cfg] of Object.entries(toolsParams)) {
  const url = (cfg.url as string | undefined) ?? '<none>'
  const method = (cfg.method as string | undefined) ?? '<none>'
  const headers = (cfg.headers as Record<string, string> | undefined) ?? {}
  const secretValue = headers[SECRET_HEADER]
  const headerCount = Object.keys(headers).length

  console.log(`◇ ${name}`)
  console.log(`  method: ${method}`)
  console.log(`  url:    ${url}`)
  console.log(`  headers (${headerCount}): ${headerCount === 0 ? '<none>' : Object.keys(headers).join(', ')}`)

  if (!secretValue) {
    console.log(`  ✗ ${SECRET_HEADER} NOT SET on this tool`)
    allMatch = false
  } else {
    anyHeader = true
    const masked = `${secretValue.slice(0, 6)}… (${secretValue.length} chars)`
    if (secretValue === localSecret) {
      console.log(`  ✓ ${SECRET_HEADER} = ${masked} — matches local env`)
    } else if (!localSecret) {
      console.log(`  ⚠ ${SECRET_HEADER} = ${masked} — local env empty, cannot compare`)
      allMatch = false
    } else {
      console.log(`  ✗ ${SECRET_HEADER} = ${masked} — DOES NOT MATCH local env`)
      allMatch = false
    }
  }
  console.log('')
}

console.log('━'.repeat(70))
if (allMatch && anyHeader) {
  console.log('✓ All tools have the matching shared-secret header.')
  console.log('  If tool calls still 401, check:')
  console.log('    1. TOOL_SHARED_SECRET is set in Vercel env (same value as local)')
  console.log('    2. You have redeployed since adding the env var')
} else if (!anyHeader) {
  console.log('✗ No tool has the shared-secret header attached.')
  console.log('  → Run: bun run scripts/patch-tool-headers.ts')
} else {
  console.log('✗ Some tools have mismatched or missing secrets.')
  console.log('  → Re-run: bun run scripts/patch-tool-headers.ts')
  console.log('    (it merges the current TOOL_SHARED_SECRET into every tool)')
}
