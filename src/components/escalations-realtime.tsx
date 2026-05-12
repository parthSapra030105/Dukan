'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'

/**
 * Subscribes to all changes on the `escalations` table and refreshes the
 * server-rendered page when one comes through. Lets the page stay server-side
 * for data while still feeling alive when new escalations land or get taken
 * by another operator.
 */
export function EscalationsRealtime() {
  const router = useRouter()
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel('escalations-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalations' },
        () => {
          router.refresh()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])
  return null
}
