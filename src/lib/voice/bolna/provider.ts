import type {
  AgentConfig,
  CallEvent,
  DispatchPayload,
  DispatchResult,
  VoiceProvider,
} from '../types'

/**
 * Bolna AI provider.
 *
 * Verified against https://www.bolna.ai/docs (2026-05-12):
 *  - Auth: `Authorization: Bearer <API_KEY>`
 *  - Base URL: https://api.bolna.ai
 *  - Create agent: POST /v2/agent (nested {agent_config, agent_prompts} payload)
 *  - Outbound: POST /call with {agent_id, recipient_phone_number, from_phone_number?}
 *  - Tools: configured via dashboard UI; runtime tool-call payload is templated
 *    (Bolna substitutes %(param)s placeholders into URL/body — NOT a JSON envelope)
 *  - Webhooks: single end-of-call POST. No HMAC signing. Security = source IP allowlist.
 *    Bolna's published origin IP: 13.203.39.153
 *
 * Trial plan: $5 credits, outbound limited to verified phone numbers.
 * Inbound numbers require Indian Pvt Ltd KYC (CIN + GST).
 */
export class BolnaProvider implements VoiceProvider {
  readonly name = 'bolna' as const

  private apiKey(): string {
    const k = process.env.BOLNA_API_KEY
    if (!k) throw new Error('BOLNA_API_KEY missing in env')
    return k
  }

  private baseUrl(): string {
    return process.env.BOLNA_API_URL ?? 'https://api.bolna.ai'
  }

  private allowedIps(): string[] {
    const raw = process.env.BOLNA_WEBHOOK_ALLOWED_IPS ?? ''
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // -------------------------------------------------------------------------
  // Agent lifecycle — verified shape
  // -------------------------------------------------------------------------

  async createAgent(config: AgentConfig): Promise<{ agentId: string }> {
    const payload = this.buildAgentPayload(config)
    const res = await fetch(`${this.baseUrl()}/v2/agent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`bolna createAgent ${res.status}: ${body.slice(0, 400)}`)
    }
    const json = (await res.json()) as { agent_id?: string; id?: string }
    const agentId = json.agent_id ?? json.id
    if (!agentId) throw new Error('bolna createAgent: response missing agent_id')
    return { agentId }
  }

  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<void> {
    const payload = this.buildAgentPayload(config as AgentConfig)
    const res = await fetch(`${this.baseUrl()}/v2/agent/${agentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`bolna updateAgent ${res.status}: ${body.slice(0, 400)}`)
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl()}/v2/agent/${agentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey()}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`bolna deleteAgent ${res.status}: ${body.slice(0, 400)}`)
    }
  }

  async dispatchOutbound(payload: DispatchPayload): Promise<DispatchResult> {
    const res = await fetch(`${this.baseUrl()}/call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: payload.agentId,
        recipient_phone_number: payload.to,
        user_data: payload.customerContext ?? {},
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`bolna dispatchOutbound ${res.status}: ${body.slice(0, 400)}`)
    }
    const json = (await res.json()) as { execution_id?: string; call_id?: string; id?: string }
    const callId = json.execution_id ?? json.call_id ?? json.id
    if (!callId) throw new Error('bolna dispatchOutbound: response missing execution_id')
    return { callId }
  }

  // -------------------------------------------------------------------------
  // Webhooks — end-of-call single payload, IP-allowlisted
  // -------------------------------------------------------------------------

  async parseWebhook(_request: Request, body: string): Promise<CallEvent> {
    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(body)
    } catch {
      throw new Error('bolna parseWebhook: body is not JSON')
    }

    // Bolna posts the full execution record once at call end.
    // Payload mirrors the "Get Execution" API response shape.
    return {
      type: 'call_ended',
      callId: String(raw.execution_id ?? raw.id ?? ''),
      agentId: String(raw.agent_id ?? ''),
      timestamp: String(raw.created_at ?? new Date().toISOString()),
      payload: raw,
    }
  }

  /**
   * Bolna does NOT sign webhooks. We verify by source IP allowlist.
   * In Next.js / Vercel, the originating IP is in x-forwarded-for (left-most entry)
   * or x-real-ip. Local dev: leave BOLNA_WEBHOOK_ALLOWED_IPS empty to skip the check.
   */
  async verifyWebhookSignature(request: Request, _body: string): Promise<boolean> {
    const allowed = this.allowedIps()
    if (allowed.length === 0) {
      console.warn('[BolnaProvider] BOLNA_WEBHOOK_ALLOWED_IPS is empty — webhook verification SKIPPED')
      return true
    }
    const sourceIp = this.extractSourceIp(request)
    if (!sourceIp) return false
    return allowed.includes(sourceIp)
  }

  async getCallRecording(providerCallId: string): Promise<string | null> {
    const res = await fetch(`${this.baseUrl()}/v2/agent/executions/${providerCallId}`, {
      headers: { Authorization: `Bearer ${this.apiKey()}` },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { recording_url?: string; telephony_data?: { recording_url?: string } }
    return json.telephony_data?.recording_url ?? json.recording_url ?? null
  }

  async getCallTranscript(providerCallId: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl()}/v2/agent/executions/${providerCallId}`, {
      headers: { Authorization: `Bearer ${this.apiKey()}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`bolna getCallTranscript ${res.status}: ${body.slice(0, 400)}`)
    }
    return res.json()
  }

  // -------------------------------------------------------------------------
  // Private — payload builders + helpers
  // -------------------------------------------------------------------------

  private buildAgentPayload(config: AgentConfig): Record<string, unknown> {
    // Bolna's verified schema (corrected after first 400):
    //   agent_config: { tasks: [{ task_type, toolchain, tools_config, task_config }], ... }
    //   agent_prompts: { task_1: { system_prompt } }
    // Required fields surfaced by validator:
    //   - llm_agent.agent_flow_type   (we use 'streaming')
    //   - toolchain                   (pipeline declaration — sibling of tools_config)
    //   - synthesizer.voice_id when provider=elevenlabs
    //   - hangup_after_silence must be integer seconds (not float)
    return {
      agent_config: {
        agent_name: config.name,
        agent_welcome_message: this.welcomeMessageFor(config),
        webhook_url: config.webhookUrl,
        agent_type: 'other',
        tasks: [
          {
            task_type: 'conversation',
            toolchain: {
              execution: 'parallel',
              pipelines: [['transcriber', 'llm', 'synthesizer']],
            },
            tools_config: {
              llm_agent: {
                agent_type: 'simple_llm_agent',
                agent_flow_type: 'streaming',
                llm_config: {
                  provider: 'openai',
                  model: 'gpt-4.1-mini',
                  temperature: 0.1,
                },
              },
              // Bolna splits voice into TWO required fields:
              //   - voice: WHICH voice (id, name, model)
              //   - synthesizer: HOW synthesis runs (provider, streaming, audio format)
              voice: this.buildVoiceConfig(config),
              synthesizer: this.buildSynthesizerConfig(config),
              transcriber: {
                provider: 'deepgram',
                model: 'nova-3',
                language: this.languageCodeFor(config.language),
              },
              input: { provider: 'plivo', format: 'wav' },
              output: { provider: 'plivo', format: 'wav' },
              // tools configured via Bolna dashboard UI per their docs
              api_tools: null,
            },
            task_config: {
              hangup_after_silence: 15,
            },
          },
        ],
        ...(config.providerExtras ?? {}),
      },
      agent_prompts: {
        task_1: { system_prompt: config.systemPrompt },
      },
    }
  }

  /**
   * Voice identity — what the agent sounds like.
   * Three required fields per Bolna validator: voice_id, voice (name), model.
   */
  private buildVoiceConfig(config: AgentConfig): Record<string, unknown> {
    if (config.voice.provider === 'elevenlabs') {
      const voiceId = config.voice.voiceId ?? 'pNInz6obpgDQGcFmaJgB' // Adam, multilingual v2
      return {
        voice_id: voiceId,
        voice: 'Adam',
        model: 'eleven_multilingual_v2',
      }
    }
    // Deepgram Aura — Asteria is a common default female voice
    return {
      voice_id: 'aura-asteria-en',
      voice: 'asteria',
      model: 'aura',
    }
  }

  /**
   * Synthesizer engine — provider + streaming/audio settings.
   * Sibling field to `voice` in Bolna's tools_config schema.
   */
  private buildSynthesizerConfig(config: AgentConfig): Record<string, unknown> {
    const provider = config.voice.provider === 'elevenlabs' ? 'elevenlabs' : 'deepgram'
    return {
      provider,
      stream: true,
      buffer_size: 100,
      audio_format: 'wav',
    }
  }

  private welcomeMessageFor(config: AgentConfig): string {
    const fallback = config.providerExtras?.welcome_message as string | undefined
    if (fallback) return fallback
    return config.language.startsWith('hi')
      ? 'Namaste! Aap Sapra Bazar se baat kar rahe hain. Aapka order kaise le sakte hain?'
      : 'Hello! Welcome to Sapra Bazar. How can I take your order today?'
  }

  private languageCodeFor(full: string): string {
    return full.split('-')[0]
  }

  private extractSourceIp(request: Request): string | null {
    const xff = request.headers.get('x-forwarded-for')
    if (xff) {
      const first = xff.split(',')[0].trim()
      if (first) return first
    }
    const real = request.headers.get('x-real-ip')
    if (real) return real.trim()
    return null
  }
}
