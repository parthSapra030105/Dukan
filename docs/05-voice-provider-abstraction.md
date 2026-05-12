# Voice provider abstraction

**Goal:** Dukan must work on Bolna today, but be one config-flip away from running on Vapi or a custom stack (ElevenLabs + Deepgram + Claude). This protects us against:
- Bolna pricing / availability shifts
- Bolna rejecting our integration use case
- A different vendor doing better on specific languages / accents

## Provider contract

All voice providers implement the same interface. The merchant-facing code never imports Bolna directly.

```ts
// src/lib/voice/types.ts

export interface AgentConfig {
  name: string
  systemPrompt: string
  language: string                     // 'hi-IN' default
  fallbackLanguages: string[]          // ['en-IN', 'mr-IN']
  voice: {
    provider: 'native' | 'elevenlabs'
    voiceId?: string
  }
  tools: ToolDefinition[]
  webhookUrl: string                   // where tool calls + events go
  endpointing: {
    silenceMs: number                  // 600 typical for Hindi-English
    interruptionThresholdMs: number    // 200
  }
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  endpoint: string                     // POST URL, relative or absolute
}

export type CallEventType =
  | 'call_started'
  | 'transcript_chunk'
  | 'tool_call'
  | 'tool_response'
  | 'language_switched'
  | 'escalated'
  | 'call_ended'

export interface CallEvent {
  type: CallEventType
  callId: string
  agentId: string
  timestamp: string
  payload: Record<string, unknown>
}

export interface DispatchPayload {
  agentId: string
  to: string                           // E.164 phone
  customerContext?: Record<string, unknown>
}

export interface VoiceProvider {
  readonly name: 'bolna' | 'vapi' | 'custom'

  createAgent(config: AgentConfig): Promise<{ agentId: string }>
  updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<void>
  deleteAgent(agentId: string): Promise<void>

  // Outbound — agent dials a customer
  dispatchOutbound(payload: DispatchPayload): Promise<{ callId: string }>

  // Inbound webhook — provider POSTs us call events + tool calls
  parseWebhook(request: Request): Promise<CallEvent>
  verifyWebhookSignature(request: Request, body: string): Promise<boolean>

  // Recording + transcript retrieval
  getCallRecording(callId: string): Promise<string | null>   // URL
  getCallTranscript(callId: string): Promise<unknown>         // provider-specific shape, adapted by adapter
}
```

## Provider factory

```ts
// src/lib/voice/provider.ts

import { BolnaProvider } from './bolna/provider'
import { VapiProvider } from './vapi/provider'
import { CustomProvider } from './custom/provider'
import type { VoiceProvider } from './types'

let _cached: VoiceProvider | null = null

export function getVoiceProvider(): VoiceProvider {
  if (_cached) return _cached
  const name = process.env.VOICE_PROVIDER ?? 'bolna'
  switch (name) {
    case 'bolna': _cached = new BolnaProvider(); break
    case 'vapi':  _cached = new VapiProvider();  break
    case 'custom': _cached = new CustomProvider(); break
    default: throw new Error(`Unknown VOICE_PROVIDER: ${name}`)
  }
  return _cached
}
```

## What each provider has to translate

The provider's job is **adapter, not abstraction-leak**. Each provider:

1. **Translates outbound config** — `AgentConfig` → provider's create-agent payload
2. **Normalises inbound webhooks** — provider's call-event payload → `CallEvent`
3. **Handles signatures** — provider-specific verification
4. **Surfaces recording URLs** — if the provider stores recordings, return URL; if not, return null

The rest of Dukan never knows which provider is in use.

## Bolna-specific notes — verified 2026-05-12

API surface, verified against https://www.bolna.ai/docs:

- **Base URL:** `https://api.bolna.ai`
- **Auth:** `Authorization: Bearer <API_KEY>`
- **Create agent:** `POST /v2/agent` with **nested** payload
  ```json
  {
    "agent_config": {
      "agent_name": "...",
      "agent_welcome_message": "...",
      "webhook_url": "https://your.app/api/voice/webhook",
      "agent_type": "other",
      "tasks": [{
        "task_type": "conversation",
        "tools_config": {
          "llm_agent": { "agent_type": "simple_llm_agent",
            "llm_config": { "provider": "openai", "model": "gpt-4.1-mini" }},
          "synthesizer": { "provider": "elevenlabs" },
          "transcriber": { "provider": "deepgram", "model": "nova-3", "language": "hi" },
          "input": { "provider": "plivo", "format": "wav" },
          "output": { "provider": "plivo", "format": "wav" },
          "api_tools": null
        }
      }]
    },
    "agent_prompts": { "task_1": { "system_prompt": "..." } }
  }
  ```
- **Outbound:** `POST /call` with `{agent_id, recipient_phone_number, user_data?}` → returns `execution_id`
- **Tools:** configured via the **Bolna dashboard UI** (not via API in v2). Tool invocations use template substitution — Bolna replaces `%(param_name)s` placeholders inline in the URL/body you configure. Each tool endpoint receives the literal request the merchant configured, NOT a generic JSON envelope.
- **Webhooks: not signed.** Bolna does NOT use HMAC, JWT, or any cryptographic signature on webhook callbacks. Security model = source IP allowlist. Bolna's published webhook origin IP: **`13.203.39.153`**. Implementation: `BolnaProvider.verifyWebhookSignature` reads `x-forwarded-for` / `x-real-ip` and matches against `BOLNA_WEBHOOK_ALLOWED_IPS`.
- **Webhook payload shape:** single end-of-call POST mirroring `GET /v2/agent/executions/:id` response. Contains: transcript, recording URL (under `telephony_data.recording_url`), tool-call audit (`api_tools_data`), duration, cost, language. **NOT a stream of per-event callbacks** — we get one consolidated record at call end.
- **Languages:** 10+ Indian languages (Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Punjabi etc.) via Deepgram + ElevenLabs.
- **Trial plan:** $5 free credits, outbound only to verified phone numbers (verified via OTP in dashboard). No KYC required for outbound.
- **Inbound numbers:** require Indian Pvt Ltd KYC (CIN + GST). No sandbox path waives this. v1 demo bypasses inbound entirely via the callback workflow (form → outbound).

## Vapi-specific notes (fallback design)

- Agent created via Vapi REST API
- Tools = "functions" in Vapi's assistant config; Vapi POSTs to function URL
- Webhook signature: shared secret in header
- Languages: leverages OpenAI Whisper + Deepgram + ElevenLabs — multilingual is good but Indian language quality varies
- Outbound: Vapi `/call` endpoint
- Inbound: Twilio or Vonage SIP trunk routed to a Vapi number

## Custom stack notes (if we DIY)

- **STT:** Deepgram Nova-2 (Indian English + Hindi reasonably strong); Sarvam AI for stronger Indian regional languages
- **TTS:** ElevenLabs (best naturalness, multilingual v2 model) or Sarvam (better Indian language vibes)
- **LLM:** Claude Haiku 4.5 (fast + cheap + good function-calling) or GPT-4o-mini
- **Orchestration:** Our own state machine using OpenAI's Realtime API protocol over WebSocket OR a simpler turn-based loop
- **Telephony:** Twilio inbound number + media stream → our WebSocket → STT → LLM → TTS → back

This is significantly more work than Bolna or Vapi, but gives full control. Not on the critical path for the Bolna submission.

## What the abstraction does NOT cover

These are deliberately leaky:

- **Provider-specific config knobs** (e.g. Bolna's specific voice model selection) — exposed as a `providerExtras: Record<string, unknown>` field in `AgentConfig`. Used sparingly.
- **Latency profiles** — different providers have different p95s. We don't try to hide this.
- **Pricing** — we track call costs separately per provider (in `calls.provider_cost_paise`).

## Tradeoff we accept

The abstraction adds ~150 lines of code we wouldn't write if we coupled directly to Bolna. We accept that cost because:
1. It demonstrates senior product-engineering judgment to Bolna's reviewers (they'll see this in the README)
2. It's a real fallback option if Bolna isn't available for production
3. It makes the project survivable beyond the assignment context

## What to put in the submission

A README diagram showing the abstraction + one paragraph: "Dukan uses Bolna by default but is provider-agnostic. The voice layer is behind a `VoiceProvider` interface with adapters for Bolna, Vapi, and a custom ElevenLabs + Deepgram + Claude stack. Swapping providers = one env var. We picked Bolna for this submission because of [specific reasons relevant to use case]."
