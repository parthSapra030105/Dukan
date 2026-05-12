import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * escalate_to_human — agent tool
 * Body: { call_id: string, reason: string, transcript_so_far?: string }
 * Returns: { queued, queue_position }
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const callId = String(v.body.call_id ?? '').trim()
  const reason = String(v.body.reason ?? '').trim()
  if (!callId || !reason) {
    return NextResponse.json({ error: 'call_id_and_reason_required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: esc, error: escErr } = await supabase
    .from('escalations')
    .insert({
      call_id: callId,
      reason,
      transcript_snapshot: v.body.transcript_so_far ? String(v.body.transcript_so_far) : null,
      status: 'queued',
    })
    .select('id')
    .single()
  if (escErr || !esc) {
    return NextResponse.json({ error: escErr?.message ?? 'escalation_create_failed' }, { status: 500 })
  }

  // Also update the call's outcome so it shows up in dashboards correctly
  await supabase
    .from('calls')
    .update({ outcome: 'escalated' })
    .eq('id', callId)

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
