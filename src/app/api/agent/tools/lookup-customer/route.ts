import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

/**
 * lookup_customer — agent tool
 * Body: { phone: string }
 * Returns: { found, customer?: { id, name, preferred_language, last_order?, saved_addresses } }
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const phone = String(v.body.phone ?? '').trim()
  if (!phone) return NextResponse.json({ error: 'phone_required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, preferred_language, total_orders, lifetime_value_paise')
    .eq('merchant_id', merchantId)
    .eq('phone', phone)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ found: false })
  }

  const [{ data: addresses }, { data: lastOrder }] = await Promise.all([
    supabase
      .from('customer_addresses')
      .select('id, label, full_text, is_default')
      .eq('customer_id', customer.id)
      .order('is_default', { ascending: false }),
    supabase
      .from('orders')
      .select('id, items, total_paise, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return NextResponse.json({
    found: true,
    customer: {
      id: customer.id,
      name: customer.name,
      preferred_language: customer.preferred_language,
      total_orders: customer.total_orders,
      last_order: lastOrder
        ? {
            id: lastOrder.id,
            items: lastOrder.items,
            total_paise: lastOrder.total_paise,
            date: lastOrder.created_at,
          }
        : null,
      saved_addresses: addresses ?? [],
    },
  })
}
