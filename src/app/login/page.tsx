import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { LoginForm } from './login-form'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect: redirectTo } = await searchParams
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(redirectTo || '/dashboard')

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center mb-8" aria-label="Dukan home">
          <BrandMark size="md" />
        </Link>

        <h1 className="text-xl font-semibold text-stone-900 mb-1">Sign in</h1>
        <p className="text-sm text-stone-500 mb-5">
          Operator dashboard for Sapra Bazar.
        </p>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
          <p className="font-semibold mb-0.5">Demo credentials prefilled</p>
          <p className="text-amber-800 leading-relaxed">
            <code className="font-mono">admin@dukan.demo</code> /{' '}
            <code className="font-mono">dukan-demo-2026</code> — just click <strong>Sign in</strong>. This
            is a single-merchant demo; account creation is disabled.
          </p>
        </div>

        <p className="text-xs text-stone-500 mt-6 text-center">
          <Link href="/" className="hover:text-stone-900">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
