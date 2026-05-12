'use server'

import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirect') ?? '/dashboard')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await getServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect(redirectTo)
}

export async function signOut() {
  const supabase = await getServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
