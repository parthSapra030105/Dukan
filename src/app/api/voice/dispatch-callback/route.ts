import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVoiceProvider } from '@/lib/voice/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

/**
 * Public endpoint: customer requests a callback via the homepage form.
 *
 * Body: { phone: E.164, language?: 'hi-IN' | 'en-IN', name?: string }
 * Returns: { ok, call_id }
 *
 * Triggers an outbound call via the configured voice provider. The agent
 * (configured separately, BOLNA_AGENT_ID) handles the conversation; our
 * webhook tool endpoints handle catalog / address / order placement.
 *
 * Trial constraint: on Bolna's trial plan, the recipient_phone_number
 * MUST be a verified number in the Bolna dashboard. The API will reject
 * unverified numbers with an error — we surface that error verbatim.
 */
const BodySchema = z.object({
  phone: z.string().min(8).max(20),
  language: z.string().optional(),
  name: z.string().optional(),
})

export async function POST(request: Request) {
  let parsed: z.infer<typeof BodySchema>
  try {
    const body = await request.json()
    parsed = BodySchema.parse(body)
  } catch (err) {
    return NextResponse.json({ error: 'invalid_body', detail: String(err) }, { status: 400 })
  }

  const agentId = process.env.BOLNA_AGENT_ID
  if (!agentId) {
    return NextResponse.json({ error: 'agent_not_configured', hint: 'set BOLNA_AGENT_ID in env' }, { status: 500 })
  }

  const provider = getVoiceProvider()
  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  // Normalise phone to E.164 — assume Indian by default if no leading +
  const phone = normalisePhone(parsed.phone)

  // Pre-create a calls row so the agent can reference it before the webhook lands
  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .insert({
      merchant_id: merchantId,
      caller_phone: phone,
      direction: 'outbound',
      provider: provider.name,
      outcome: 'in_progress',
    })
    .select('id')
    .single()
  if (callErr || !callRow) {
    return NextResponse.json({ error: 'call_record_create_failed', detail: callErr?.message }, { status: 500 })
  }

  // Dispatch
  try {
    const { callId: providerCallId } = await provider.dispatchOutbound({
      agentId,
      to: phone,
      customerContext: {
        callback_request_id: callRow.id,
        merchant_id: merchantId,
        customer_name: parsed.name ?? null,
        preferred_language: parsed.language ?? 'hi-IN',
      },
    })

    // Link provider's execution id back to our row
    await supabase
      .from('calls')
      .update({ provider_call_id: providerCallId })
      .eq('id', callRow.id)

    return NextResponse.json({
      ok: true,
      call_id: callRow.id,
      provider_call_id: providerCallId,
      message: 'Calling you now — please answer.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'dispatch_failed'
    await supabase
      .from('calls')
      .update({ outcome: 'no_intent', ended_at: new Date().toISOString() })
      .eq('id', callRow.id)
    return NextResponse.json({ error: 'dispatch_failed', detail: msg }, { status: 502 })
  }
}

function normalisePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `+91${cleaned}`
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}
