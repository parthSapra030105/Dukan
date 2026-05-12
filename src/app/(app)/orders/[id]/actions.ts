'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const VALID = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'] as const
type Status = (typeof VALID)[number]

export async function updateOrderStatus(orderId: string, newStatus: Status) {
  if (!VALID.includes(newStatus)) {
    throw new Error(`invalid status: ${newStatus}`)
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { ok: true }
}
