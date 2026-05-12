/**
 * Provider-agnostic voice interface.
 *
 * All merchant-facing code interacts with VoiceProvider, not with Bolna/Vapi/Custom directly.
 * See docs/05-voice-provider-abstraction.md for the design rationale.
 */

export type ProviderName = 'bolna' | 'vapi' | 'custom'

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description: string
      required?: boolean
    }
  >
  endpoint: string                    // absolute URL the provider POSTs to
}

export interface AgentConfig {
  name: string
  systemPrompt: string
  language: string                    // primary language, e.g. 'hi-IN'
  fallbackLanguages: string[]         // e.g. ['en-IN', 'mr-IN']
  voice: {
    provider: 'native' | 'elevenlabs' | 'sarvam'
    voiceId?: string
  }
  tools: ToolDefinition[]
  webhookUrl: string                  // where call events POST
  endpointing: {
    silenceMs: number                 // 600 typical for Hindi-English
    interruptionThresholdMs: number   // 200
  }
  providerExtras?: Record<string, unknown>
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
  /** Provider-specific payload, normalised where possible. */
  payload: Record<string, unknown>
}

export interface DispatchPayload {
  agentId: string
  to: string                          // E.164, e.g. +919876543210
  customerContext?: Record<string, unknown>
}

export interface DispatchResult {
  callId: string
}

export interface VoiceProvider {
  readonly name: ProviderName

  /** Provider-specific create-agent payload, persists agent on the provider's platform. */
  createAgent(config: AgentConfig): Promise<{ agentId: string }>
  updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<void>
  deleteAgent(agentId: string): Promise<void>

  /** Outbound — agent dials a customer. */
  dispatchOutbound(payload: DispatchPayload): Promise<DispatchResult>

  /** Parse an incoming webhook from the provider into a normalised CallEvent. */
  parseWebhook(request: Request, body: string): Promise<CallEvent>

  /** Cryptographically verify a webhook came from the provider. */
  verifyWebhookSignature(request: Request, body: string): Promise<boolean>

  /** Recording + transcript retrieval. */
  getCallRecording(providerCallId: string): Promise<string | null>
  getCallTranscript(providerCallId: string): Promise<unknown>
}
