'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function updateProductActive(productId: string, active: boolean) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('catalog_items')
    .update({ active })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/catalog')
  return { ok: true }
}

export async function updateProductStock(productId: string, stockCount: number | null) {
  if (stockCount !== null && (!Number.isInteger(stockCount) || stockCount < 0 || stockCount > 100000)) {
    throw new Error('Stock must be a whole number between 0 and 100000')
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('catalog_items')
    .update({ stock_count: stockCount })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/catalog')
  return { ok: true }
}
