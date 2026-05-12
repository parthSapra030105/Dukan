/**
 * Dumps the full agent JSON from Bolna so we can see where tools actually live.
 * Run: bun run scripts/dump-bolna-agent.ts
 */
export {}

if (!process.env.BOLNA_API_KEY) {
  console.error('✗ BOLNA_API_KEY missing'); process.exit(1)
}
const agentId = process.env.BOLNA_AGENT_ID?.trim()
if (!agentId) {
  console.error('✗ BOLNA_AGENT_ID missing'); process.exit(1)
}

const res = await fetch(`https://api.bolna.ai/v2/agent/${agentId}`, {
  headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` },
})
if (!res.ok) {
  console.error(`✗ ${res.status} ${await res.text()}`)
  process.exit(1)
}
const agent = await res.json()
console.log(JSON.stringify(agent, null, 2))
