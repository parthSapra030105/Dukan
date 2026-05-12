/**
 * Creates (or updates) the Sapra Bazar Order Agent on Bolna.
 *
 * Usage:
 *   bun run scripts/create-bolna-agent.ts                # create or update
 *   bun run scripts/create-bolna-agent.ts --force-create # always create new
 *
 * Reads:
 *   - .env.local (BOLNA_API_KEY, BOLNA_WEBHOOK_PUBLIC_URL, BOLNA_AGENT_ID?)
 *   - src/lib/voice/bolna/prompts/order-agent.md
 *
 * After running:
 *   - If creating: paste the printed Agent ID into .env.local as BOLNA_AGENT_ID
 *   - Then follow the printed checklist to add the 5 tools in Bolna's dashboard
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { BolnaProvider } from '../src/lib/voice/bolna/provider'
import type { AgentConfig } from '../src/lib/voice/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const PROMPT_PATH = join(REPO_ROOT, 'src', 'lib', 'voice', 'bolna', 'prompts', 'order-agent.md')

// Welcome message — Option C from the brainstorm
const WELCOME_MESSAGE =
  'Namaste, Sapra Bazar mein aapka swagat hai. Order ke liye main hu — kya chahiye aapko?'

// Default synthesizer = Deepgram Aura. Reliable on Bolna trial without voice-ID curation.
// Override via BOLNA_VOICE_PROVIDER=elevenlabs (requires Bolna-allowed voice_id).
// Bolna's Audio tab lets you swap voices post-creation without re-running the script.
const VOICE_PROVIDER = (process.env.BOLNA_VOICE_PROVIDER ?? 'deepgram') as 'deepgram' | 'elevenlabs'
const DEFAULT_VOICE_ID = process.env.BOLNA_VOICE_ID ?? ''

async function main() {
  // ---------------------------------------------------------------------------
  // Pre-flight
  // ---------------------------------------------------------------------------
  const forceCreate = process.argv.includes('--force-create')

  if (!process.env.BOLNA_API_KEY) {
    console.error('✗ BOLNA_API_KEY missing in env. Add it to .env.local first.')
    process.exit(1)
  }
  const publicUrl = process.env.BOLNA_WEBHOOK_PUBLIC_URL?.replace(/\/$/, '')
  if (!publicUrl) {
    console.error('✗ BOLNA_WEBHOOK_PUBLIC_URL missing in env.')
    console.error('  Deploy to Vercel first → copy the production URL → add to .env.local.')
    console.error('  Example: BOLNA_WEBHOOK_PUBLIC_URL=https://dukan.vercel.app')
    process.exit(1)
  }

  // ---------------------------------------------------------------------------
  // Read prompt
  // ---------------------------------------------------------------------------
  let prompt: string
  try {
    prompt = readFileSync(PROMPT_PATH, 'utf-8')
  } catch (err) {
    console.error(`✗ Could not read prompt at ${PROMPT_PATH}`)
    console.error(`  ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
  const wordCount = prompt.split(/\s+/).filter(Boolean).length
  console.log(`✓ Read prompt (${wordCount} words) from src/lib/voice/bolna/prompts/order-agent.md`)

  // ---------------------------------------------------------------------------
  // Build config
  // ---------------------------------------------------------------------------
  const config: AgentConfig = {
    name: 'Sapra Bazar — Order Agent',
    systemPrompt: prompt,
    language: 'hi-IN',
    fallbackLanguages: ['en-IN', 'mr-IN'],
    voice: {
      // 'native' triggers the Deepgram fallback in BolnaProvider; 'elevenlabs' uses ElevenLabs.
      provider: VOICE_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'native',
      ...(DEFAULT_VOICE_ID ? { voiceId: DEFAULT_VOICE_ID } : {}),
    },
    tools: [], // Bolna v2 requires tools to be configured in dashboard
    webhookUrl: `${publicUrl}/api/voice/webhook`,
    endpointing: { silenceMs: 600, interruptionThresholdMs: 200 },
    providerExtras: {
      welcome_message: WELCOME_MESSAGE,
    },
  }

  // ---------------------------------------------------------------------------
  // Create or update
  // ---------------------------------------------------------------------------
  const provider = new BolnaProvider()
  const existingAgentId = process.env.BOLNA_AGENT_ID

  let agentId: string
  if (existingAgentId && !forceCreate) {
    console.log(`⏵ Updating existing agent ${existingAgentId}`)
    console.log('   (run with --force-create to make a fresh agent instead)')
    try {
      await provider.updateAgent(existingAgentId, config)
    } catch (err) {
      console.error(`✗ Update failed: ${err instanceof Error ? err.message : err}`)
      console.error('  Tip: if the agent was deleted, run with --force-create')
      process.exit(1)
    }
    console.log(`✓ PUT /v2/agent/${existingAgentId} — updated`)
    agentId = existingAgentId
  } else {
    if (existingAgentId && forceCreate) {
      console.log(`⚠ BOLNA_AGENT_ID is set (${existingAgentId}) but --force-create overrides`)
    }
    console.log('⏵ Creating new agent...')
    try {
      const result = await provider.createAgent(config)
      agentId = result.agentId
    } catch (err) {
      console.error(`✗ Create failed: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
    console.log(`✓ POST /v2/agent — created`)
    console.log(`\n🆔 Agent ID: ${agentId}`)
    console.log('   → paste into .env.local as BOLNA_AGENT_ID')
  }

  printNextSteps(agentId, publicUrl)
}

function printNextSteps(agentId: string, publicUrl: string) {
  const banner = '━'.repeat(70)
  console.log(`\n${banner}`)
  console.log('NEXT STEPS — ~10 min manual config in Bolna dashboard')
  console.log(`${banner}\n`)
  console.log('1. Open https://platform.bolna.ai/dashboard')
  console.log(`2. Find "Sapra Bazar — Order Agent" (id: ${agentId.slice(0, 8)}…)`)
  console.log('3. Click the "Tools" tab → "Add Tool" five times with these configs:\n')

  const tools = [
    {
      name: 'lookup_customer',
      method: 'POST',
      url: `${publicUrl}/api/agent/tools/lookup-customer`,
      body: '{ "phone": "%(caller_phone)s" }',
      params: ['caller_phone (from user_data)'],
    },
    {
      name: 'catalog_search',
      method: 'POST',
      url: `${publicUrl}/api/agent/tools/catalog-search`,
      body: '{ "query": "%(query)s", "language": "%(preferred_language)s", "limit": 5 }',
      params: ['query (LLM-extracted)', 'preferred_language (user_data)'],
    },
    {
      name: 'validate_address',
      method: 'POST',
      url: `${publicUrl}/api/agent/tools/validate-address`,
      body: '{ "text": "%(text)s" }',
      params: ['text (LLM-extracted)'],
    },
    {
      name: 'place_order',
      method: 'POST',
      url: `${publicUrl}/api/agent/tools/place-order`,
      body:
        '{ "call_id": "%(call_id)s", "customer_id": "%(customer_id)s", "items": %(items)s, ' +
        '"delivery_address": "%(delivery_address)s", "delivery_slot": "%(delivery_slot)s", ' +
        '"total_paise": %(total_paise)s, "language": "%(language)s" }',
      params: ['call_id (user_data)', 'rest: LLM-extracted'],
    },
    {
      name: 'escalate_to_human',
      method: 'POST',
      url: `${publicUrl}/api/agent/tools/escalate`,
      body: '{ "call_id": "%(call_id)s", "reason": "%(reason)s", "transcript_so_far": "%(transcript_so_far)s" }',
      params: ['call_id (user_data)', 'reason (LLM-extracted)', 'transcript_so_far (LLM-extracted)'],
    },
  ]

  for (const [i, tool] of tools.entries()) {
    console.log(`   Tool ${i + 1}: ${tool.name}`)
    console.log(`     Method: ${tool.method}`)
    console.log(`     URL:    ${tool.url}`)
    console.log(`     Headers: Content-Type: application/json`)
    console.log(`     Body:    ${tool.body}`)
    console.log(`     Params:  ${tool.params.join(', ')}`)
    console.log('')
  }

  console.log('4. Confirm the welcome message says:')
  console.log(`   "${WELCOME_MESSAGE}"`)
  console.log('')
  console.log('5. In the Audio tab — pick a Hindi female voice you like (the default is fine for v1)')
  console.log('')
  console.log('6. In the Engine tab — confirm endpointing silence = 600ms, interruption threshold = 200ms')
  console.log('')
  console.log('7. Verify your phone number in the dashboard (OTP) if you haven\'t already')
  console.log('')
  console.log('8. Click "Get call from agent" to test outbound — agent should call you in 5 seconds')
  console.log('')
  console.log(`${banner}\n`)
}

main().catch(err => {
  console.error('\n✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
