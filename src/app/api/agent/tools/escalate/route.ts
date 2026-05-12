import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isPlaceholder(s: unknown): boolean {
  if (typeof s !== 'string') return false
  const t = s.trim()
  return t === '' || t.startsWith('%(') || t === 'None' || t === 'null' || t === 'undefined'
}

/**
 * escalate_to_human — agent tool
 * Body: { call_id: string, reason: string, transcript_so_far?: string }
 * Returns: { queued, queue_position }
 *
 * escalations.call_id is NOT NULL FK. If the agent passes a missing / hallucinated
 * call_id (common in chat-mode testing), we auto-create a synthetic call row
 * so the escalation can land.
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const callIdRaw = String(v.body.call_id ?? '').trim()
  const reason = String(v.body.reason ?? '').trim()
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 })
  }

  console.log('[escalate_to_human] inputs', {
    call_id_raw: callIdRaw.slice(0, 60),
    reason: reason.slice(0, 80),
  })

  const supabase = getSupabaseAdmin()

  // Resolve a valid call_id — either the LLM's value (verified), or create a synthetic call row.
  let validCallId: string | null = null
  if (!isPlaceholder(callIdRaw) && UUID_RX.test(callIdRaw)) {
    const { data: callRow } = await supabase
      .from('calls')
      .select('id')
      .eq('id', callIdRaw)
      .maybeSingle()
    validCallId = callRow?.id ?? null
  }

  if (!validCallId) {
    // Chat mode or hallucinated call_id — create a synthetic call row so the escalation has a parent.
    const merchantId = await getDemoMerchantId()
    const { data: synthCall, error: synthErr } = await supabase
      .from('calls')
      .insert({
        merchant_id: merchantId,
        caller_phone: 'chat-test',
        direction: 'outbound',
        provider: 'bolna',
        outcome: 'escalated',
      })
      .select('id')
      .single()
    if (synthErr || !synthCall) {
      return NextResponse.json(
        { error: 'synth_call_create_failed', detail: synthErr?.message },
        { status: 500 },
      )
    }
    validCallId = synthCall.id as string
    console.log(`[escalate_to_human] created synthetic call ${validCallId.slice(0, 8)} for chat-mode escalation`)
  }

  const { data: esc, error: escErr } = await supabase
    .from('escalations')
    .insert({
      call_id: validCallId,
      reason,
      transcript_snapshot: v.body.transcript_so_far ? String(v.body.transcript_so_far) : null,
      status: 'queued',
    })
    .select('id')
    .single()
  if (escErr || !esc) {
    return NextResponse.json({ error: escErr?.message ?? 'escalation_create_failed' }, { status: 500 })
  }

  // Mark the call as escalated
  await supabase.from('calls').update({ outcome: 'escalated' }).eq('id', validCallId)

  const { count } = await supabase
    .from('escalations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')

  return NextResponse.json({
    queued: true,
    queue_position: count ?? 1,
    escalation_id: esc.id,
  })
}
