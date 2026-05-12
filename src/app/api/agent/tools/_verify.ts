import { NextResponse } from 'next/server'

const SECRET_HEADER = 'x-dukan-tool-secret'

/**
 * Tool endpoints share this verification preamble:
 *   - Check the shared-secret header (Bolna sends it per-tool via tools_params.headers)
 *   - Parse JSON body
 *
 * Why a header-based shared secret instead of an IP allowlist:
 *   Bolna's tool runtime is a worker pool — outgoing IPs shift constantly, so
 *   `BOLNA_WEBHOOK_ALLOWED_IPS` style allowlisting is too brittle here. The
 *   webhook endpoint (`/api/voice/webhook`) still uses IP verification because
 *   Bolna's webhook delivery uses their documented, stable IP (13.203.39.153).
 *
 * Returns either `{ ok: true, body }` or a 401 NextResponse.
 */
export async function verifyToolCall(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const expected = process.env.TOOL_SHARED_SECRET
  if (!expected) {
    console.error('[verifyToolCall] TOOL_SHARED_SECRET not set — refusing all tool calls (fail closed)')
    return {
      ok: false,
      response: NextResponse.json({ error: 'tool_auth_not_configured' }, { status: 500 }),
    }
  }

  const provided = request.headers.get(SECRET_HEADER)
  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid_secret' }, { status: 401 }),
    }
  }

  const body = await request.text()
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
