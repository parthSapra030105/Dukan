'use client'

import { useState, useTransition } from 'react'
import { signInWithPassword } from './actions'

const DEMO_EMAIL = 'admin@dukan.demo'
const DEMO_PASSWORD = 'dukan-demo-2026'

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', email)
      fd.set('password', password)
      fd.set('redirect', redirectTo)
      const result = await signInWithPassword(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </div>

      <div>
        <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      {error && (
        <div className="text-sm bg-rose-50 text-rose-800 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </form>
  )
}
