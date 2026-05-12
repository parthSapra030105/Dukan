import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVoiceProvider } from '@/lib/voice/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

/**
 * Public endpoint: customer requests a callback via the homepage form.
 *
 * Body: { phone: E.164, language?: 'hi-IN' | 'en-IN', name?: string, address?: string }
 * Returns: { ok, call_id }
 *
 * Pre-call upserts:
 *   1. customers row (merchant_id + phone unique) — name, preferred_language
 *   2. customer_addresses row (if address provided) — set as default
 *   3. calls row linked to customer_id
 *
 * The agent receives customer_id in user_data so lookup_customer becomes a
 * context-fetch (saved addresses, last order) rather than identity discovery.
 *
 * Trial constraint: on Bolna's trial plan, the recipient_phone_number MUST be
 * a verified number in the Bolna dashboard.
 */
const BodySchema = z.object({
  phone: z.string().min(8).max(20),
  language: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
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
    return NextResponse.json(
      { error: 'agent_not_configured', hint: 'set BOLNA_AGENT_ID in env' },
      { status: 500 },
    )
  }

  const provider = getVoiceProvider()
  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  const phone = normalisePhone(parsed.phone)
  const language = parsed.language ?? 'hi-IN'

  // 1) Find-or-create customer by (merchant_id, phone). Selective update so a
  //    blank Name field on resubmit doesn't blow away an existing name.
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, preferred_language')
    .eq('merchant_id', merchantId)
    .eq('phone', phone)
    .maybeSingle()

  const submittedName = parsed.name?.trim() || null

  let customer: { id: string; name: string | null; preferred_language: string | null } | null = null
  if (existing) {
    const updateRow: Record<string, unknown> = { preferred_language: language }
    if (submittedName) updateRow.name = submittedName
    const { data: updated, error: updateErr } = await supabase
      .from('customers')
      .update(updateRow)
      .eq('id', existing.id)
      .select('id, name, preferred_language')
      .single()
    if (updateErr) console.warn('[dispatch-callback] customer update failed:', updateErr.message)
    customer = updated ?? existing
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('customers')
      .insert({
        merchant_id: merchantId,
        phone,
        name: submittedName,
        preferred_language: language,
      })
      .select('id, name, preferred_language')
      .single()
    if (insertErr) console.warn('[dispatch-callback] customer insert failed:', insertErr.message)
    customer = inserted ?? null
  }

  const customerId = customer?.id ?? null

  // 2) Optional address — dedupe by exact text, then make this one the default
  const addressText = parsed.address?.trim()
  if (addressText && customerId) {
    // Reset other defaults for this customer
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)

    const { data: existing } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('customer_id', customerId)
      .eq('full_text', addressText)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', existing.id)
    } else {
      const { error: addrErr } = await supabase.from('customer_addresses').insert({
        customer_id: customerId,
        label: 'home',
        full_text: addressText,
        is_default: true,
      })
      if (addrErr) {
        console.warn('[dispatch-callback] address insert failed:', addrErr.message)
      }
    }
  }

  // 3) Create the calls row linked to the customer
  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .insert({
      merchant_id: merchantId,
      customer_id: customerId,
      caller_phone: phone,
      direction: 'outbound',
      provider: provider.name,
      outcome: 'in_progress',
    })
    .select('id')
    .single()
  if (callErr || !callRow) {
    return NextResponse.json(
      { error: 'call_record_create_failed', detail: callErr?.message },
      { status: 500 },
    )
  }

  // 4) Dispatch — agent receives customer_id, customer_name, etc. via user_data
  try {
    const { callId: providerCallId } = await provider.dispatchOutbound({
      agentId,
      to: phone,
      customerContext: {
        call_id: callRow.id,                                           // internal call row id (for escalate_to_human)
        caller_phone: phone,
        merchant_id: merchantId,
        customer_id: customerId,                                       // agent already knows who's calling
        customer_name: customer?.name ?? parsed.name?.trim() ?? null,
        preferred_language: customer?.preferred_language ?? language,
      },
    })

    await supabase
      .from('calls')
      .update({ provider_call_id: providerCallId })
      .eq('id', callRow.id)

    return NextResponse.json({
      ok: true,
      call_id: callRow.id,
      provider_call_id: providerCallId,
      customer_id: customerId,
      message: customer?.name
        ? `Calling you now, ${customer.name.split(' ')[0]} — please answer.`
        : 'Calling you now — please answer.',
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
