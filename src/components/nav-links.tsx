'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Package, AlertTriangle, Bot } from 'lucide-react'
import { cn } from '@/lib/cn'

interface NavLinksProps {
  pendingOrders: number
  queuedEscalations: number
}

export function NavLinks({ pendingOrders, queuedEscalations }: NavLinksProps) {
  const pathname = usePathname()
  const items = [
    { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, badge: null as number | null },
    { href: '/orders',       label: 'Orders',       icon: ShoppingBag,    badge: pendingOrders || null },
    { href: '/catalog',      label: 'Catalog',      icon: Package,         badge: null },
    { href: '/escalations',  label: 'Escalations',  icon: AlertTriangle,   badge: queuedEscalations || null },
    { href: '/agent',        label: 'Agent',        icon: Bot,             badge: null },
  ]

  return (
    <nav className="flex items-center gap-1">
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
              active
                ? 'text-stone-900 bg-stone-100 font-medium'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium',
                  item.href === '/escalations'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
