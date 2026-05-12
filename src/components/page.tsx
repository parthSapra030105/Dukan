import { cn } from '@/lib/cn'

interface PageProps {
  children: React.ReactNode
  /** Max width — defaults to 6xl (1152px). Use 'full' for edge-to-edge. */
  maxWidth?: '4xl' | '5xl' | '6xl' | '7xl' | 'full'
  className?: string
}

const MAX_W: Record<NonNullable<PageProps['maxWidth']>, string> = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-none',
}

export function Page({ children, maxWidth = '6xl', className }: PageProps) {
  return (
    <main className={cn('flex-1 bg-stone-50 min-h-screen')}>
      <div className={cn('mx-auto px-6 py-8 sm:py-10', MAX_W[maxWidth], className)}>
        {children}
      </div>
    </main>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
