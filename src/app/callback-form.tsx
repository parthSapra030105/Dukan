'use client'

import { useState, useTransition } from 'react'

export function CallbackForm() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  async function submit() {
    setResult(null)
    if (!phone.trim()) {
      setResult({ kind: 'err', msg: 'Phone number is required.' })
      return
    }
    const res = await fetch('/api/voice/dispatch-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        language,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setResult({ kind: 'err', msg: json.detail ?? json.error ?? 'Dispatch failed.' })
      return
    }
    setResult({
      kind: 'ok',
      msg: json.message ?? 'Calling you now — please answer.',
    })
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">Request a callback</h2>
        <p className="text-xs text-stone-500 mt-1">
          What you fill in here, the agent will already know when it dials. <strong>Note:</strong> on the
          Bolna trial only verified numbers can be called (verify yours at platform.bolna.ai).
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Raj Sharma"
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
              Language
            </label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as 'hi-IN' | 'en-IN')}
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="hi-IN">Hindi</option>
              <option value="en-IN">English</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1 block">
            Delivery address (optional)
          </label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Flat 502, Sapphire Heights, FC Road, Pune 411005"
            rows={2}
            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
          />
          <p className="text-[10px] text-stone-500 mt-1">
            Saved as your default address. The agent will confirm rather than ask for it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => startTransition(submit)}
          disabled={pending}
          className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {pending ? 'Calling you now…' : 'Call me to place an order'}
        </button>

        {result && (
          <div
            className={`text-sm rounded-lg px-3 py-2 ${
              result.kind === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {result.msg}
          </div>
        )}
      </div>
    </div>
  )
}
