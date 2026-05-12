import { cn } from '@/lib/cn'

/**
 * Dukan brand mark. The Hindi द (da) IS the 'D' in Dukan, followed by 'ukan'.
 * Reads as one continuous word: `[द]ukan` → "Dukan", but visually anchored
 * in the Indian-language identity of the product.
 *
 * Sizes:
 *   sm — for nav (14px text, 28px square)
 *   md — for inline references (18px text, 36px square)
 *   lg — for hero / landing (32px text, 56px square)
 *   xl — for cover slides (48px text, 80px square)
 */
type BrandSize = 'sm' | 'md' | 'lg' | 'xl'

interface BrandMarkProps {
  size?: BrandSize
  /** Optional className on outer wrapper */
  className?: string
  /** Render only the icon (no 'ukan' wordmark) — useful for favicons, avatars */
  iconOnly?: boolean
}

const SIZES: Record<BrandSize, {
  box: string
  icon: string
  word: string
  gap: string
  radius: string
}> = {
  sm: { box: 'w-7 h-7',   icon: 'text-sm',  word: 'text-base font-semibold',         gap: 'gap-1',    radius: 'rounded-md' },
  md: { box: 'w-9 h-9',   icon: 'text-lg',  word: 'text-xl font-semibold',           gap: 'gap-1.5',  radius: 'rounded-md' },
  lg: { box: 'w-14 h-14', icon: 'text-3xl', word: 'text-5xl font-bold tracking-tight', gap: 'gap-2',    radius: 'rounded-lg' },
  xl: { box: 'w-20 h-20', icon: 'text-5xl', word: 'text-7xl font-bold tracking-tight', gap: 'gap-2.5',  radius: 'rounded-xl' },
}

export function BrandMark({ size = 'md', className, iconOnly = false }: BrandMarkProps) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center shrink-0', s.gap, className)}>
      <span
        className={cn(
          'flex items-center justify-center bg-rose-600 text-white',
          s.box,
          s.radius,
        )}
        aria-hidden
      >
        <span className={cn('font-bold leading-none', s.icon)}>द</span>
      </span>
      {!iconOnly && (
        <span className={cn('text-stone-900 leading-none', s.word)}>ukan</span>
      )}
    </span>
  )
}
