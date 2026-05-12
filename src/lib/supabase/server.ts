import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side, cookie-aware Supabase client. Used for auth checks and
 * any user-context reads. Data writes still go through getSupabaseAdmin
 * (service role) — single-tenant demo, RLS not enforced.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(toSet) {
        try {
          for (const c of toSet) cookieStore.set(c.name, c.value, c.options)
        } catch {
          // Reading from a Server Component — cookies are read-only there.
          // Server Actions / route handlers handle the actual session writes.
        }
      },
    },
  })
}
