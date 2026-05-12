import type {
  AgentConfig,
  CallEvent,
  DispatchPayload,
  DispatchResult,
  VoiceProvider,
} from '../types'

/**
 * Vapi.ai provider — STUB ONLY for v1.
 *
 * Vapi is a credible fallback if Bolna integration hits issues. This stub
 * documents the integration surface; methods throw "vapi_not_implemented"
 * until we wire the real API.
 *
 * To implement:
 *  - POST https://api.vapi.ai/assistant       create/update
 *  - POST https://api.vapi.ai/call            outbound
 *  - Webhooks: shared-secret header (X-Vapi-Secret)
 *  - Inbound numbers: Twilio SIP trunk → Vapi
 *  - Tools: Vapi's "functions" field on assistant config
 */
export class VapiProvider implements VoiceProvider {
  readonly name = 'vapi' as const

  async createAgent(_config: AgentConfig): Promise<{ agentId: string }> {
    throw new Error('vapi_not_implemented')
  }
  async updateAgent(_agentId: string, _config: Partial<AgentConfig>): Promise<void> {
    throw new Error('vapi_not_implemented')
  }
  async deleteAgent(_agentId: string): Promise<void> {
    throw new Error('vapi_not_implemented')
  }
  async dispatchOutbound(_payload: DispatchPayload): Promise<DispatchResult> {
    throw new Error('vapi_not_implemented')
  }
  async parseWebhook(_request: Request, _body: string): Promise<CallEvent> {
    throw new Error('vapi_not_implemented')
  }
  async verifyWebhookSignature(_request: Request, _body: string): Promise<boolean> {
    throw new Error('vapi_not_implemented')
  }
  async getCallRecording(_providerCallId: string): Promise<string | null> {
    throw new Error('vapi_not_implemented')
  }
  async getCallTranscript(_providerCallId: string): Promise<unknown> {
    throw new Error('vapi_not_implemented')
  }
}
