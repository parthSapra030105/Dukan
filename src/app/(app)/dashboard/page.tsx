import { Page, PageHeader } from '@/components/page'

export default function DashboardPage() {
  return (
    <Page>
      <PageHeader title="Dashboard" subtitle="Operator pulse · today's calls + orders" />
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-500">
        Real dashboard ships in Phase 4.2.B.
      </div>
    </Page>
  )
}
