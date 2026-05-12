'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'

/**
 * Subscribes to changes on the `calls` table and triggers a router refresh
 * so the Nav's "Live agent" indicator (active-call pulse) and badge counts
 * stay in sync with reality. Cheap — only fires when calls actually change.
 */
export function NavRealtime() {
  const router = useRouter()
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel('nav-live-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escalations' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])
  return null
}
