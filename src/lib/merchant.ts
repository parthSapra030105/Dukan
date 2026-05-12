import { getSupabaseAdmin } from './supabase/admin'

/**
 * For v1 (single-tenant) we resolve "the merchant" by:
 *   1. DEMO_MERCHANT_ID env var if set, OR
 *   2. The single merchant named 'Sapra Bazar Demo' from the seed
 *
 * Multi-tenant resolution (by API key, header, or phone-number → outlet)
 * lands post-submission.
 */
export async function getDemoMerchantId(): Promise<string> {
  const fromEnv = process.env.DEMO_MERCHANT_ID
  if (fromEnv) return fromEnv

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('merchants')
    .select('id')
    .eq('name', 'Sapra Bazar Demo')
    .maybeSingle()
  if (error) throw new Error(`getDemoMerchantId: ${error.message}`)
  if (!data) throw new Error('no demo merchant found — did you run supabase/seed.sql?')
  return data.id
}
