'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Eye, EyeOff, Pencil, Check, X, PackageX } from 'lucide-react'
import { updateProductActive, updateProductStock } from '@/app/(app)/catalog/actions'
import { cn } from '@/lib/cn'

interface ProductQuickActionsProps {
  productId: string
  active: boolean
  stockCount: number | null
}

export function ProductQuickActions({ productId, active, stockCount }: ProductQuickActionsProps) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [stockInput, setStockInput] = useState(stockCount?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function toggleActive() {
    setError(null)
    startTransition(async () => {
      try {
        await updateProductActive(productId, !active)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  function markOutOfStock() {
    setError(null)
    startTransition(async () => {
      try {
        await updateProductStock(productId, 0)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  function saveStock() {
    setError(null)
    const trimmed = stockInput.trim()
    if (trimmed === '') {
      // Empty → treat as "unlimited" (null in DB)
      startTransition(async () => {
        try {
          await updateProductStock(productId, null)
          setEditing(false)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed')
        }
      })
      return
    }
    const value = parseInt(trimmed, 10)
    if (!Number.isFinite(value) || value < 0) {
      setError('≥ 0')
      return
    }
    startTransition(async () => {
      try {
        await updateProductStock(productId, value)
        setEditing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  function cancelEdit() {
    setStockInput(stockCount?.toString() ?? '')
    setEditing(false)
    setError(null)
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <button
        type="button"
        onClick={toggleActive}
        disabled={pending}
        title={active ? 'Hide from agent' : 'Show to agent'}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded transition-colors disabled:opacity-60',
          active
            ? 'text-green-700 hover:bg-green-50'
            : 'text-stone-500 hover:bg-stone-50',
        )}
      >
        {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        <span className="font-medium">{active ? 'Active' : 'Hidden'}</span>
      </button>

      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={stockInput}
              onChange={e => setStockInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveStock()
                else if (e.key === 'Escape') cancelEdit()
              }}
              placeholder="∞"
              disabled={pending}
              className="w-14 px-1.5 py-0.5 text-xs text-right bg-white border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
            />
            <button
              type="button"
              onClick={saveStock}
              disabled={pending}
              className="p-1 text-green-700 hover:bg-green-50 rounded disabled:opacity-60"
              title="Save (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="p-1 text-stone-400 hover:bg-stone-100 rounded disabled:opacity-60"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {stockCount !== 0 && (
              <button
                type="button"
                onClick={markOutOfStock}
                disabled={pending}
                title="Mark out of stock"
                className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-stone-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                <PackageX className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-stone-600 hover:bg-stone-100 disabled:opacity-60"
              title="Edit stock"
            >
              <span className="tabular-nums">Stock: {stockCount ?? '∞'}</span>
              <Pencil className="w-3 h-3 text-stone-400" />
            </button>
          </>
        )}
      </div>

      {error && (
        <span className="text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
          {error}
        </span>
      )}
    </div>
  )
}
