import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

interface OrderItem {
  sku: string
  name: string
  qty: number
  price_at_order_paise: number
  unit?: string
}

/**
 * place_order — agent tool
 * Body: {
 *   call_id?: string,
 *   customer_id?: string,
 *   customer_phone?: string,
 *   items: OrderItem[],
 *   delivery_address: string,
 *   delivery_slot: string,
 *   total_paise: number,
 *   language?: string
 * }
 * Returns: { order_id, sms_sent }
 *
 * Resolves customer by id OR phone (creates if missing).
 * Server-validates total by recomputing from items.
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  // Accept items as a real array OR a JSON string (Bolna may send templated strings).
  let items: OrderItem[] = []
  if (Array.isArray(v.body.items)) {
    items = v.body.items as OrderItem[]
  } else if (typeof v.body.items === 'string') {
    try {
      const parsed = JSON.parse(v.body.items)
      if (Array.isArray(parsed)) items = parsed as OrderItem[]
    } catch {
      return NextResponse.json(
        { error: 'items_not_valid_json', detail: String(v.body.items).slice(0, 200) },
        { status: 400 },
      )
    }
  }
  if (items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 })
  }

  // Treat un-substituted Bolna templates ("%(caller_phone)s" etc.) and empty strings as "not provided"
  const isPlaceholder = (s: unknown): boolean => {
    if (typeof s !== 'string') return false
    const t = s.trim()
    return t === '' || t.startsWith('%(') || t === 'None' || t === 'null'
  }
  const customerId = !isPlaceholder(v.body.customer_id) ? String(v.body.customer_id) : null
  const customerPhone = !isPlaceholder(v.body.customer_phone) ? String(v.body.customer_phone) : null

  const deliveryAddress = String(v.body.delivery_address ?? '').trim()
  if (!deliveryAddress || isPlaceholder(deliveryAddress)) {
    return NextResponse.json({ error: 'delivery_address_required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  // Resolve customer
  let resolvedCustomerId = customerId
  if (!resolvedCustomerId && customerPhone) {
    // Phone given — look up or create
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('phone', customerPhone)
      .maybeSingle()
    if (existing) {
      resolvedCustomerId = existing.id
    } else {
      const { data: created, error: createErr } = await supabase
        .from('customers')
        .insert({ merchant_id: merchantId, phone: customerPhone })
        .select('id')
        .single()
      if (createErr || !created) {
        return NextResponse.json({ error: 'customer_create_failed' }, { status: 500 })
      }
      resolvedCustomerId = created.id
    }
  }

  if (!resolvedCustomerId) {
    // Chat-mode / no-phone scenarios: create an anonymous walk-in customer so the order can land.
    // Real voice calls always have a caller_phone, so this branch only runs for testing.
    const anonPhone = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert({ merchant_id: merchantId, phone: anonPhone, name: 'Walk-in (chat test)' })
      .select('id')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: 'anon_customer_create_failed', detail: createErr?.message }, { status: 500 })
    }
    resolvedCustomerId = created.id
  }

  // Server-side total recompute (don't trust the client total)
  const recomputedTotal = items.reduce((acc, it) => acc + (Number(it.price_at_order_paise) || 0) * (Number(it.qty) || 0), 0)
  const claimedTotal = Number(v.body.total_paise) || 0
  const totalToUse = recomputedTotal > 0 ? recomputedTotal : claimedTotal

  // Resolve a default outlet for this merchant
  const { data: outlet } = await supabase
    .from('outlets')
    .select('id')
    .eq('merchant_id', merchantId)
    .limit(1)
    .maybeSingle()

  // call_id may be an unsubstituted Bolna template in chat mode — treat as null in that case
  const callIdRaw = v.body.call_id ? String(v.body.call_id) : ''
  const callIdToUse = isPlaceholder(callIdRaw) ? null : callIdRaw

  // language and delivery_slot may also be placeholders
  const slotRaw = String(v.body.delivery_slot ?? '')
  const slotToUse = isPlaceholder(slotRaw) ? '' : slotRaw
  const langRaw = String(v.body.language ?? 'hi-IN')
  const langToUse = isPlaceholder(langRaw) ? 'hi-IN' : langRaw

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      merchant_id: merchantId,
      outlet_id: outlet?.id ?? null,
      customer_id: resolvedCustomerId,
      call_id: callIdToUse,
      source: 'phone',
      status: 'pending',
      items,
      delivery_address_snapshot: deliveryAddress,
      delivery_slot: slotToUse,
      total_paise: totalToUse,
      language: langToUse,
      sms_sent: false,
    })
    .select('id')
    .single()
  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? 'order_create_failed' }, { status: 500 })
  }

  // TODO(post-submission): trigger real SMS via Twilio/Karix here. For demo: mark sms_sent=true.
  await supabase.from('orders').update({ sms_sent: true }).eq('id', order.id)

  // Update customer aggregates
  if (resolvedCustomerId) {
    await supabase.rpc('increment_customer_stats', {
      _customer_id: resolvedCustomerId,
      _amount_paise: totalToUse,
    }).then(({ error }) => {
      // Function doesn't exist yet; ignore silently for v1. Add the RPC post-submission.
      if (error && !error.message.includes('does not exist')) {
        console.warn('[place-order] increment_customer_stats failed:', error.message)
      }
    })
  }

  return NextResponse.json({
    order_id: order.id,
    sms_sent: true,
    total_paise: totalToUse,
  })
}
