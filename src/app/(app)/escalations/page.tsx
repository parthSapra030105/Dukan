import { Page, PageHeader } from '@/components/page'

export default function EscalationsPage() {
  return (
    <Page>
      <PageHeader title="Escalations" subtitle="Calls that need a human" />
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-500">
        Ships in Phase 4.2.E.
      </div>
    </Page>
  )
}
