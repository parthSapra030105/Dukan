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
 * Strategy (in priority order, deduped by SKU):
 *   1. Exact full-phrase alias match — highest precision
 *   2. Per-token alias match — catches "half kg tamatar" → alias "tamatar"
 *   3. Per-token name_default ILIKE — catches "rice" → "Basmati Rice 1kg"
 *
 * Stop words ("half", "kg", "ka", "the", small junk tokens) are filtered.
 */
const STOP_TOKENS = new Set([
  // English
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'with', 'please', 'some',
  'half', 'kg', 'kgs', 'gram', 'grams', 'g', 'ml', 'l', 'litre', 'litres', 'liter', 'liters',
  'pc', 'pcs', 'pack', 'packet', 'packets', 'box', 'boxes', 'bottle', 'bottles',
  'one', 'two', 'three', 'four', 'five', 'six',
  // Hindi (romanised)
  'ek', 'do', 'teen', 'char', 'paanch', 'aadha', 'paav', 'pao',
  'ka', 'ki', 'ke', 'me', 'mein', 'hai', 'chahiye', 'do na', 'dena',
  'kilo', 'kilos',
])

function tokenize(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ')   // keep Devanagari range too
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = cleaned.split(' ').filter(t => t.length > 1 && !STOP_TOKENS.has(t))
  return Array.from(new Set(tokens))
}

export async function POST(request: Request) {
  const v = await verifyToolCall(request)
  if (!v.ok) return v.response

  const queryRaw = String(v.body.query ?? '').trim()
  const language = String(v.body.language ?? 'en').slice(0, 2)
  const limit = Math.min(Math.max(parseInt(String(v.body.limit ?? '5'), 10) || 5, 1), 20)
  if (!queryRaw) return NextResponse.json({ error: 'query_required' }, { status: 400 })

  const query = queryRaw.toLowerCase()
  const tokens = tokenize(queryRaw)

  console.log('[catalog_search]', { query: queryRaw, tokens })

  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  type Row = {
    sku: string
    name_default: string
    name_localized: Record<string, string> | null
    aliases: string[]
    price_paise: number
    unit: string
    stock_count: number | null
    category: string | null
    active: boolean
  }

  const results = new Map<string, Row>()

  const cols =
    'sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category, active'

  // 1) Exact full-phrase alias match
  if (results.size < limit) {
    const { data } = await supabase
      .from('catalog_items')
      .select(cols)
      .eq('merchant_id', merchantId)
      .eq('active', true)
      .contains('aliases', [query])
      .limit(limit)
    for (const r of (data as Row[] | null) ?? []) {
      if (!results.has(r.sku)) results.set(r.sku, r)
    }
  }

  // 2) Per-token alias match (catches "half kg tamatar" → "tamatar")
  for (const t of tokens) {
    if (results.size >= limit) break
    const { data } = await supabase
      .from('catalog_items')
      .select(cols)
      .eq('merchant_id', merchantId)
      .eq('active', true)
      .contains('aliases', [t])
      .limit(limit)
    for (const r of (data as Row[] | null) ?? []) {
      if (!results.has(r.sku)) results.set(r.sku, r)
    }
  }

  // 3) Per-token name_default ILIKE — recall pass
  for (const t of tokens) {
    if (results.size >= limit) break
    if (t.length < 3) continue
    const { data } = await supabase
      .from('catalog_items')
      .select(cols)
      .eq('merchant_id', merchantId)
      .eq('active', true)
      .ilike('name_default', `%${t}%`)
      .limit(limit)
    for (const r of (data as Row[] | null) ?? []) {
      if (!results.has(r.sku)) results.set(r.sku, r)
    }
  }

  const merged = Array.from(results.values())
    .slice(0, limit)
    .map(row => {
      const localized = row.name_localized ?? {}
      return {
        sku: row.sku,
        name_localized: localized[language] ?? localized['en'] ?? row.name_default,
        aliases: row.aliases ?? [],
        price_paise: row.price_paise,
        unit: row.unit,
        in_stock: row.stock_count === null || row.stock_count > 0,
        category: row.category,
      }
    })

  console.log(`[catalog_search] → ${merged.length} results: ${merged.map(r => r.sku).join(', ') || '(none)'}`)

  return NextResponse.json({ results: merged })
}
