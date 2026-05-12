'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function takeEscalation(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('escalations')
    .update({ status: 'taken' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escalations')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function resolveEscalation(id: string, notes: string | null) {
  const trimmed = notes?.trim() || null
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('escalations')
    .update({
      status: 'resolved',
      resolution_notes: trimmed,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escalations')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function abandonEscalation(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('escalations')
    .update({ status: 'abandoned', resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escalations')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function reopenEscalation(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('escalations')
    .update({ status: 'queued', resolution_notes: null, resolved_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escalations')
  revalidatePath('/dashboard')
  return { ok: true }
}
