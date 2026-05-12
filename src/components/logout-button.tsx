'use client'

import { LogOut } from 'lucide-react'
import { useTransition } from 'react'
import { signOut } from '@/app/login/actions'

export function LogoutButton({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
      title={email ? `Sign out (${email})` : 'Sign out'}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors disabled:opacity-50"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  )
}
