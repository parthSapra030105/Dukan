import { NextResponse } from 'next/server'
import { getVoiceProvider } from '@/lib/voice/provider'

/**
 * Tool endpoints share this verification preamble:
 *   - Read raw body (provider signs it)
 *   - Verify signature via current provider
 *   - Parse JSON
 *
 * Returns either `{ ok: true, body }` or a 401 NextResponse.
 */
export async function verifyToolCall(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const body = await request.text()
  const provider = getVoiceProvider()

  const verified = await provider.verifyWebhookSignature(request, body)
  if (!verified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid_signature' }, { status: 401 }),
    }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(body) as Record<string, unknown>
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid_json' }, { status: 400 }),
    }
  }

  return { ok: true, body: parsed }
}
