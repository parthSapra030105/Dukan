import { Boxes, AlertTriangle, PackageX } from 'lucide-react'
import { Page, PageHeader } from '@/components/page'
import { CategoryChips } from '@/components/category-chips'
import { CatalogSearch } from '@/components/catalog-search'
import { ProductCard, type ProductCardData } from '@/components/product-card'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDemoMerchantId } from '@/lib/merchant'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORY_ORDER = [
  { key: 'staples',       label: 'Staples' },
  { key: 'dairy',         label: 'Dairy' },
  { key: 'vegetables',    label: 'Vegetables' },
  { key: 'snacks',        label: 'Snacks' },
  { key: 'beverages',     label: 'Beverages' },
  { key: 'bakery',        label: 'Bakery' },
  { key: 'cleaning',      label: 'Cleaning' },
  { key: 'personal-care', label: 'Personal care' },
]

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category, q } = await searchParams
  const supabase = getSupabaseAdmin()
  const merchantId = await getDemoMerchantId()

  // Pull everything in one shot — kirana catalogs are small (~40-200 SKUs).
  // Filter + count in-memory so chips can show counts and search is forgiving.
  const { data: rows } = await supabase
    .from('catalog_items')
    .select('id, sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category, active')
    .eq('merchant_id', merchantId)
    .order('category', { ascending: true })
    .order('name_default', { ascending: true })

  const all: ProductCardData[] = (rows ?? []).map(r => {
    const loc = (r.name_localized ?? {}) as Record<string, string>
    return {
      id: r.id,
      sku: r.sku,
      name_default: r.name_default,
      name_hi: loc.hi ?? null,
      aliases: Array.isArray(r.aliases) ? r.aliases : [],
      price_paise: r.price_paise,
      unit: r.unit,
      stock_count: r.stock_count,
      category: r.category,
      active: r.active,
    }
  })

  // Category counts
  const categoryCounts: Record<string, number> = {}
  for (const p of all) {
    if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1
  }
  const categories = CATEGORY_ORDER
    .filter(c => (categoryCounts[c.key] ?? 0) > 0)
    .map(c => ({ ...c, count: categoryCounts[c.key] }))

  // Apply category + search filters
  const term = (q ?? '').trim().toLowerCase()
  const filtered = all.filter(p => {
    if (category && p.category !== category) return false
    if (!term) return true
    if (p.name_default.toLowerCase().includes(term)) return true
    if (p.sku.toLowerCase().includes(term)) return true
    if (p.name_hi && p.name_hi.includes(term)) return true
    if (p.aliases.some(a => a.toLowerCase().includes(term))) return true
    return false
  })

  // KPIs across the full catalog (not the filtered view)
  const totalSkus = all.length
  const outOfStock = all.filter(p => p.stock_count === 0).length
  const lowStock = all.filter(p => p.stock_count !== null && p.stock_count > 0 && p.stock_count <= 10).length

  return (
    <Page maxWidth="6xl">
      <PageHeader
        title="Catalog"
        subtitle="What the agent can sell — same SKUs the voice agent is grounded on."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi icon={Boxes}        tone="stone" label="Total SKUs"   value={totalSkus} />
        <Kpi icon={AlertTriangle} tone="amber" label="Low stock"    value={lowStock}    note="≤ 10 units" />
        <Kpi icon={PackageX}      tone="rose"  label="Out of stock" value={outOfStock} />
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <CategoryChips categories={categories} totalCount={totalSkus} />
        <CatalogSearch />
      </div>

      {/* Result count */}
      <p className="text-xs text-stone-500 mb-3">
        Showing <span className="font-medium text-stone-700 tabular-nums">{filtered.length}</span>
        {filtered.length !== totalSkus && (
          <> of <span className="tabular-nums">{totalSkus}</span></>
        )}{' '}
        {filtered.length === 1 ? 'item' : 'items'}
        {term && <> matching <span className="text-stone-700">&ldquo;{term}&rdquo;</span></>}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-stone-700 mb-1">No matches</p>
          <p className="text-xs text-stone-500">
            {term
              ? <>Try a different term — the agent also matches aliases like &ldquo;atta&rdquo; or &ldquo;doodh&rdquo;.</>
              : 'No items in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </Page>
  )
}

const TONE_BG: Record<'stone' | 'amber' | 'rose', string> = {
  stone: 'bg-stone-100 text-stone-600',
  amber: 'bg-amber-100 text-amber-700',
  rose:  'bg-rose-100 text-rose-700',
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Boxes
  tone: 'stone' | 'amber' | 'rose'
  label: string
  value: number
  note?: string
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', TONE_BG[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-semibold text-stone-900 tabular-nums leading-tight">
          {value}
          {note && <span className="ml-1.5 text-[10px] font-normal text-stone-400 uppercase">{note}</span>}
        </p>
      </div>
    </div>
  )
}
