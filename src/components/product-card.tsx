import { Package } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRupees } from '@/lib/format'
import { ProductQuickActions } from './product-quick-actions'

const CATEGORY_TINT: Record<string, string> = {
  staples:         'bg-amber-50 text-amber-800 ring-amber-100',
  dairy:           'bg-blue-50 text-blue-800 ring-blue-100',
  vegetables:      'bg-green-50 text-green-800 ring-green-100',
  snacks:          'bg-orange-50 text-orange-800 ring-orange-100',
  cleaning:        'bg-sky-50 text-sky-800 ring-sky-100',
  'personal-care': 'bg-pink-50 text-pink-800 ring-pink-100',
  beverages:       'bg-purple-50 text-purple-800 ring-purple-100',
  bakery:          'bg-yellow-50 text-yellow-800 ring-yellow-100',
}

const CATEGORY_LABEL: Record<string, string> = {
  staples: 'Staples',
  dairy: 'Dairy',
  vegetables: 'Vegetables',
  snacks: 'Snacks',
  cleaning: 'Cleaning',
  'personal-care': 'Personal care',
  beverages: 'Beverages',
  bakery: 'Bakery',
}

export interface ProductCardData {
  id: string
  sku: string
  name_default: string
  name_hi: string | null
  aliases: string[]
  price_paise: number
  unit: string
  stock_count: number | null
  category: string | null
  active: boolean
}

interface ProductCardProps {
  product: ProductCardData
}

function stockState(stock: number | null) {
  if (stock === null) return { label: 'Unlimited', tone: 'stone' as const }
  if (stock === 0)    return { label: 'Out of stock', tone: 'rose' as const }
  if (stock <= 10)    return { label: `Low · ${stock} left`, tone: 'amber' as const }
  return { label: `${stock} in stock`, tone: 'green' as const }
}

const TONE_STYLES = {
  stone: 'text-stone-600 bg-stone-100',
  rose:  'text-rose-700 bg-rose-100',
  amber: 'text-amber-800 bg-amber-100',
  green: 'text-green-800 bg-green-100',
}

const TONE_DOT = {
  stone: 'bg-stone-400',
  rose:  'bg-rose-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
}

export function ProductCard({ product }: ProductCardProps) {
  const tint = product.category ? CATEGORY_TINT[product.category] : null
  const label = product.category ? CATEGORY_LABEL[product.category] ?? product.category : null
  const stock = stockState(product.stock_count)
  const muted = !product.active || product.stock_count === 0

  return (
    <div
      className={cn(
        'group relative bg-white border border-stone-200 rounded-xl p-4 transition-shadow',
        'hover:shadow-sm hover:border-stone-300',
        muted && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {label && (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-medium ring-1 ring-inset',
              tint ?? 'bg-stone-100 text-stone-700 ring-stone-200',
            )}
          >
            {label}
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap',
            TONE_STYLES[stock.tone],
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', TONE_DOT[stock.tone])} />
          {stock.label}
        </span>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-10 h-10 bg-stone-50 border border-stone-100 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-stone-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900 leading-tight">{product.name_default}</p>
          {product.name_hi && (
            <p className="text-xs text-stone-500 mt-0.5 truncate" lang="hi">
              {product.name_hi}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-stone-100 pt-3">
        <div>
          <p className="text-lg font-semibold text-stone-900 tabular-nums">
            {formatRupees(product.price_paise)}
          </p>
          <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
            per {product.unit}
          </p>
        </div>
        <p className="text-[10px] text-stone-400 font-mono truncate max-w-[120px]" title={product.sku}>
          {product.sku}
        </p>
      </div>

      {product.aliases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Aliases</p>
          <div className="flex flex-wrap gap-1">
            {product.aliases.slice(0, 4).map(a => (
              <span
                key={a}
                className="inline-block px-1.5 py-0.5 text-[10px] text-stone-600 bg-stone-50 border border-stone-100 rounded"
              >
                {a}
              </span>
            ))}
            {product.aliases.length > 4 && (
              <span className="inline-block px-1.5 py-0.5 text-[10px] text-stone-400">
                +{product.aliases.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-stone-100">
        <ProductQuickActions
          productId={product.id}
          active={product.active}
          stockCount={product.stock_count}
        />
      </div>
    </div>
  )
}
