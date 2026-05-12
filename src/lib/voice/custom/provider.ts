import type {
  AgentConfig,
  CallEvent,
  DispatchPayload,
  DispatchResult,
  VoiceProvider,
} from '../types'

/**
 * Custom-stack provider — STUB ONLY for v1.
 *
 * "Custom" = DIY orchestration: Twilio (telephony) + Deepgram (STT) +
 * ElevenLabs (TTS) + Claude or GPT-4o-mini (LLM with function calling).
 *
 * This is the most-control, most-work option. Only used if Bolna AND Vapi
 * are both unavailable.
 *
 * Required env: TWILIO_*, DEEPGRAM_API_KEY, ELEVENLABS_API_KEY, OPENROUTER_API_KEY
 */
export class CustomProvider implements VoiceProvider {
  readonly name = 'custom' as const

  async createAgent(_config: AgentConfig): Promise<{ agentId: string }> {
    throw new Error('custom_provider_not_implemented')
  }
  async updateAgent(_agentId: string, _config: Partial<AgentConfig>): Promise<void> {
    throw new Error('custom_provider_not_implemented')
  }
  async deleteAgent(_agentId: string): Promise<void> {
    throw new Error('custom_provider_not_implemented')
  }
  async dispatchOutbound(_payload: DispatchPayload): Promise<DispatchResult> {
    throw new Error('custom_provider_not_implemented')
  }
  async parseWebhook(_request: Request, _body: string): Promise<CallEvent> {
    throw new Error('custom_provider_not_implemented')
  }
  async verifyWebhookSignature(_request: Request, _body: string): Promise<boolean> {
    throw new Error('custom_provider_not_implemented')
  }
  async getCallRecording(_providerCallId: string): Promise<string | null> {
    throw new Error('custom_provider_not_implemented')
  }
  async getCallTranscript(_providerCallId: string): Promise<unknown> {
    throw new Error('custom_provider_not_implemented')
  }
}
