import { Page, PageHeader } from '@/components/page'

export default function CatalogPage() {
  return (
    <Page>
      <PageHeader title="Catalog" subtitle="What the agent can sell" />
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-500">
        Ships in Phase 4.2.D.
      </div>
    </Page>
  )
}
