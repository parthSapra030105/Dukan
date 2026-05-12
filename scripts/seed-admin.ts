/**
 * Seeds the single admin user for the Dukan demo. Idempotent — running twice
 * resets the password.
 *
 * Run: bun run scripts/seed-admin.ts
 */
export {}

import { getSupabaseAdmin } from '../src/lib/supabase/admin'

const EMAIL = process.env.DUKAN_ADMIN_EMAIL ?? 'admin@dukan.demo'
const PASSWORD = process.env.DUKAN_ADMIN_PASSWORD ?? 'dukan-demo-2026'

const supabase = getSupabaseAdmin()

console.log(`Seeding admin user: ${EMAIL}`)

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 })
if (listErr) {
  console.error('✗ listUsers failed:', listErr.message)
  process.exit(1)
}

const existing = list.users.find(u => u.email === EMAIL)

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) {
    console.error('✗ updateUser failed:', error.message)
    process.exit(1)
  }
  console.log(`✓ admin password reset for ${EMAIL}`)
} else {
  const { error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) {
    console.error('✗ createUser failed:', error.message)
    process.exit(1)
  }
  console.log(`✓ admin created: ${EMAIL}`)
}

console.log(`\nSign in at /login with:`)
console.log(`  email:    ${EMAIL}`)
console.log(`  password: ${PASSWORD}`)
