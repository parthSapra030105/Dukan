import { NextResponse } from 'next/server'
import { verifyToolCall } from '../_verify'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'

export const runtime = 'nodejs'

/**
 * catalog_search — agent tool
 * Body: { query: string, language?: string, limit?: number }
 * Returns: { results: [{ sku, name_localized, aliases, price_paise, unit, in_stock, substitutes? }] }
 *
 * Strategy: search name_default ILIKE + aliases array overlap. Cheap, demo-grade.
 * Replace with pg_trgm fuzzy + embedding rerank post-submission.
 */
export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const query = String(v.body.query ?? '').trim().toLowerCase()
  const language = String(v.body.language ?? 'en').slice(0, 2)
  const limit = Math.min(Math.max(parseInt(String(v.body.limit ?? '5'), 10) || 5, 1), 20)
  if (!query) return NextResponse.json({ error: 'query_required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  // Search by alias array first (high precision), then by name ILIKE (recall)
  const { data: byAlias } = await supabase
    .from('catalog_items')
    .select('sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category, active')
    .eq('merchant_id', merchantId)
    .eq('active', true)
    .contains('aliases', [query])
    .limit(limit)

  const { data: byName } = await supabase
    .from('catalog_items')
    .select('sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category, active')
    .eq('merchant_id', merchantId)
    .eq('active', true)
    .ilike('name_default', `%${query}%`)
    .limit(limit * 2)

  const seen = new Set<string>()
  const merged: Array<{
    sku: string
    name_localized: string
    aliases: string[]
    price_paise: number
    unit: string
    in_stock: boolean
    category: string | null
  }> = []

  for (const row of [...(byAlias ?? []), ...(byName ?? [])]) {
    if (seen.has(row.sku)) continue
    seen.add(row.sku)
    const localized = (row.name_localized as Record<string, string> | null) ?? {}
    merged.push({
      sku: row.sku,
      name_localized: localized[language] ?? localized['en'] ?? row.name_default,
      aliases: row.aliases ?? [],
      price_paise: row.price_paise,
      unit: row.unit,
      in_stock: row.stock_count === null || row.stock_count > 0,
      category: row.category,
    })
    if (merged.length >= limit) break
  }

  return NextResponse.json({ results: merged })
}
