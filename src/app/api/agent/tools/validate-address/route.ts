import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

/**
 * validate_address — agent tool
 * Body: { text: string }
 * Returns: { resolved, full_address?, within_delivery_zone, clarification_needed? }
 *
 * v1 logic: extract pincode-like 6-digit substring, check against outlet's
 * delivery_zones. If no pincode found, ask for clarification.
 *
 * Post-submission: geocode via Google Maps API → polygon containment check.
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const text = String(v.body.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'text_required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  const { data: outlet } = await supabase
    .from('outlets')
    .select('delivery_zones')
    .eq('merchant_id', merchantId)
    .limit(1)
    .maybeSingle()

  const pincodeMatch = text.match(/\b(\d{6})\b/)
  if (!pincodeMatch) {
    return NextResponse.json({
      resolved: false,
      clarification_needed: 'Could you tell me the 6-digit pincode of the delivery address?',
    })
  }

  const pincode = pincodeMatch[1]
  const zones = (outlet?.delivery_zones as Array<{ pincode: string; name: string }> | null) ?? []
  const inZone = zones.some(z => z.pincode === pincode)

  return NextResponse.json({
    resolved: true,
    full_address: text,
    pincode,
    within_delivery_zone: inZone,
    ...(inZone ? {} : { clarification_needed: `Sorry, we don't deliver to pincode ${pincode}. Could you give a different address?` }),
  })
}
