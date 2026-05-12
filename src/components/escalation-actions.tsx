'use client'

import { useState, useTransition } from 'react'
import { Hand, CheckCircle2, X, RotateCcw } from 'lucide-react'
import {
  takeEscalation,
  resolveEscalation,
  abandonEscalation,
  reopenEscalation,
} from '@/app/(app)/escalations/actions'
import { cn } from '@/lib/cn'

type Status = 'queued' | 'taken' | 'resolved' | 'abandoned'

interface EscalationActionsProps {
  escalationId: string
  status: Status
}

export function EscalationActions({ escalationId, status }: EscalationActionsProps) {
  const [pending, startTransition] = useTransition()
  const [resolving, setResolving] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  if (resolving) {
    return (
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Resolution notes (optional) — what did you do?"
          rows={2}
          disabled={pending}
          autoFocus
          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400 placeholder:text-stone-400 resize-none"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => run(() => resolveEscalation(escalationId, notes))}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            {pending ? 'Saving…' : 'Save as resolved'}
          </button>
          <button
            type="button"
            onClick={() => {
              setResolving(false)
              setNotes('')
              setError(null)
            }}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60"
          >
            Cancel
          </button>
          {error && <ErrorChip msg={error} />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'queued' && (
        <button
          type="button"
          onClick={() => run(() => takeEscalation(escalationId))}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
        >
          <Hand className="w-4 h-4" />
          Take it
        </button>
      )}

      {status === 'taken' && (
        <button
          type="button"
          onClick={() => setResolving(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark resolved
        </button>
      )}

      {(status === 'queued' || status === 'taken') && (
        <button
          type="button"
          onClick={() => run(() => abandonEscalation(escalationId))}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60"
        >
          <X className="w-4 h-4" />
          Abandon
        </button>
      )}

      {(status === 'resolved' || status === 'abandoned') && (
        <button
          type="button"
          onClick={() => run(() => reopenEscalation(escalationId))}
          disabled={pending}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs',
            'text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-60',
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reopen
        </button>
      )}

      {error && <ErrorChip msg={error} />}
    </div>
  )
}

function ErrorChip({ msg }: { msg: string }) {
  return (
    <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
      {msg}
    </span>
  )
}
