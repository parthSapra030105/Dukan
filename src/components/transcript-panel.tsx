import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/cn'
import { normaliseTranscript, type Turn } from '@/lib/transcript'

interface TranscriptPanelProps {
  /** Raw transcript from Bolna — string, array, null, or object. */
  transcript: unknown
  /** Compact mode used in popovers. */
  compact?: boolean
}

export function TranscriptPanel({ transcript, compact }: TranscriptPanelProps) {
  const turns = normaliseTranscript(transcript)

  if (turns.length === 0) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-700 font-medium mb-1">No transcript</p>
        <p className="text-xs text-stone-500">
          This order didn&apos;t come through a call, or the call hasn&apos;t ended yet.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {turns.map((turn, i) => (
        <TurnRow key={i} turn={turn} compact={compact} />
      ))}
    </div>
  )
}

function TurnRow({ turn, compact }: { turn: Turn; compact?: boolean }) {
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
