import { cn } from '@/lib/cn'

interface TranscriptSnippetProps {
  /** Last meaningful line from the call, or a summary. */
  text: string
  /** Who said it. Defaults to 'customer'. */
  speaker?: 'agent' | 'customer'
  className?: string
}

export function TranscriptSnippet({ text, speaker = 'customer', className }: TranscriptSnippetProps) {
  return (
    <p
      className={cn(
        'text-sm italic line-clamp-2',
        speaker === 'agent' ? 'text-stone-600' : 'text-stone-700',
        className,
      )}
    >
      <span className="not-italic text-[10px] uppercase tracking-wider mr-1.5 font-medium text-stone-400">
        {speaker}
      </span>
      &ldquo;{text}&rdquo;
    </p>
  )
}
