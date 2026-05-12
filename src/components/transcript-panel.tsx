import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/cn'

interface TranscriptPanelProps {
  /** Raw transcript from Bolna — multi-line, "assistant: ..." / "user: ..." */
  transcript: string | null
  /** Compact mode used in popovers. */
  compact?: boolean
}

interface Turn {
  speaker: 'agent' | 'customer'
  text: string
}

function parseTranscript(raw: string): Turn[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      if (line.startsWith('assistant:')) return { speaker: 'agent' as const, text: line.slice('assistant:'.length).trim() }
      if (line.startsWith('user:')) return { speaker: 'customer' as const, text: line.slice('user:'.length).trim() }
      // Unknown prefix — drop
      return null
    })
    .filter((t): t is Turn => t !== null && t.text.length > 0)
}

export function TranscriptPanel({ transcript, compact }: TranscriptPanelProps) {
  if (!transcript) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-700 font-medium mb-1">No transcript</p>
        <p className="text-xs text-stone-500">
          This order didn&apos;t come through a call, or the call hasn&apos;t ended yet.
        </p>
      </div>
    )
  }

  const turns = parseTranscript(transcript)
  if (turns.length === 0) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center text-xs text-stone-500">
        Transcript was empty.
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {turns.map((turn, i) => (
        <Turn key={i} turn={turn} compact={compact} />
      ))}
    </div>
  )
}

function Turn({ turn, compact }: { turn: Turn; compact?: boolean }) {
  const isAgent = turn.speaker === 'agent'
  const Icon = isAgent ? Bot : User
  return (
    <div className={cn('flex gap-2.5', compact && 'gap-2')}>
      <div
        className={cn(
          'shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
          isAgent ? 'bg-stone-100 text-stone-600' : 'bg-rose-100 text-rose-700',
          compact && 'w-6 h-6',
        )}
      >
        <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[10px] uppercase tracking-wider font-medium mb-0.5',
            isAgent ? 'text-stone-500' : 'text-rose-700',
          )}
        >
          {isAgent ? 'Agent' : 'Customer'}
        </p>
        <p className={cn('text-stone-800', compact ? 'text-xs' : 'text-sm')}>{turn.text}</p>
      </div>
    </div>
  )
}
