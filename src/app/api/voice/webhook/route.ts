import { NextResponse } from 'next/server'
import { getVoiceProvider } from '@/lib/voice/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * End-of-call webhook ingestion.
 *
 * Bolna POSTs the full execution record here once when the call ends.
 * Verified shape (per docs): mirrors GET /v2/agent/executions/:id response —
 * includes transcript, recording_url, telephony_data, tool-call audit, etc.
 *
 * Security: source-IP allowlist (Bolna does not sign webhooks).
 * Idempotency: keyed on provider_call_id; re-deliveries update the same row.
 */
export async function POST(request: Request) {
  const body = await request.text()

  const provider = getVoiceProvider()
  const valid = await provider.verifyWebhookSignature(request, body)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 401 })
  }

  let event
  try {
    event = await provider.parseWebhook(request, body)
  } catch (err) {
    return NextResponse.json(
      { error: 'parse_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 400 },
    )
  }

  const supabase = getSupabaseAdmin()
  const raw = event.payload as Record<string, unknown>

  // Resolve our calls row — by provider_call_id first, fallback to user_data.callback_request_id
  let callRowId: string | null = null
  if (event.callId) {
    const { data } = await supabase
      .from('calls')
      .select('id')
      .eq('provider', provider.name)
      .eq('provider_call_id', event.callId)
      .maybeSingle()
    if (data) callRowId = data.id
  }
  if (!callRowId) {
    const userData = raw.user_data as Record<string, unknown> | undefined
    const explicitCallId = userData?.call_id ?? userData?.callback_request_id
    if (typeof explicitCallId === 'string') callRowId = explicitCallId
  }
  if (!callRowId) {
    // We've never seen this call. Create a row so we don't lose the data.
    const userData = (raw.user_data ?? {}) as Record<string, unknown>
    const merchantId = userData.merchant_id ? String(userData.merchant_id) : null
    if (!merchantId) {
      return NextResponse.json({ error: 'cannot_route_call', hint: 'missing merchant_id in user_data' }, { status: 400 })
    }
    const { data: created, error: createErr } = await supabase
      .from('calls')
      .insert({
        merchant_id: merchantId,
        caller_phone: String(raw.recipient_phone_number ?? raw.from_phone_number ?? 'unknown'),
        direction: 'outbound',
        provider: provider.name,
        provider_call_id: event.callId,
      })
      .select('id')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: 'call_create_failed', detail: createErr?.message }, { status: 500 })
    }
    callRowId = created.id
  }

  // Extract fields we care about (best-effort — Bolna shape is loosely typed for us)
  const transcript = raw.transcript ?? raw.conversation ?? []
  const recordingUrl =
    (raw.telephony_data as { recording_url?: string } | undefined)?.recording_url ??
    (raw.recording_url as string | undefined) ??
    null
  const startedAt = raw.start_time ? String(raw.start_time) : null
  const endedAt = raw.end_time ? String(raw.end_time) : new Date().toISOString()
  const duration = typeof raw.conversation_duration === 'number' ? raw.conversation_duration : null
  const language = (raw.language as string | undefined) ?? null
  const toolCalls = raw.api_tools_data ?? raw.tool_calls ?? []
  const costPaise =
    typeof raw.total_cost === 'number'
      ? Math.round(raw.total_cost * 100)
      : null

  // Outcome: if any tool call landed place_order, mark order_placed.
  // If escalate_to_human was called, mark escalated. Else no_intent.
  let outcome: 'order_placed' | 'escalated' | 'no_intent' | 'abandoned' = 'no_intent'
  const toolList = Array.isArray(toolCalls) ? toolCalls : []
  for (const t of toolList) {
    const name = (t as { name?: string; tool_name?: string }).name ?? (t as { tool_name?: string }).tool_name
    if (name === 'place_order') outcome = 'order_placed'
    if (name === 'escalate_to_human' && outcome !== 'order_placed') outcome = 'escalated'
  }

  const { error: updateErr } = await supabase
    .from('calls')
    .update({
      transcript,
      recording_url: recordingUrl,
      started_at: startedAt ?? undefined,
      ended_at: endedAt,
      duration_seconds: duration,
      language_detected: language,
      tool_calls: toolCalls,
      outcome,
      provider_cost_paise: costPaise,
    })
    .eq('id', callRowId)
  if (updateErr) {
    return NextResponse.json({ error: 'call_update_failed', detail: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, call_id: callRowId, outcome })
}
