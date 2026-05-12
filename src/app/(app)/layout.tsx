import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <Nav userEmail={user.email ?? null} />
      {children}
    </>
  )
}
