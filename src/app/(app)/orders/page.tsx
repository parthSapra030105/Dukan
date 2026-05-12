import { Page, PageHeader } from '@/components/page'

export default function OrdersPage() {
  return (
    <Page>
      <PageHeader title="Orders" subtitle="Phone orders from the agent" />
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-500">
        Ships in Phase 4.2.C.
      </div>
    </Page>
  )
}
