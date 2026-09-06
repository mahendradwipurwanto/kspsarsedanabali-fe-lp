'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_NAV_MAX, type BottomNavItem } from '@/contracts'
import { iconByName } from '../ui'

/**
 * The bar pinned to the bottom of phone screens.
 *
 * A phone reader keeps a thumb near the bottom; the hamburger sits at the
 * top. This puts the four or five places most people go where the thumb is,
 * and stays out of the way on tablets and desktops, where the header's own
 * menu is in reach. Everything on it is edited under Pengaturan → Header &
 * Menu. It sits under the mobile drawer (z-30 against the drawer's z-40), so
 * an open menu covers it rather than the other way round.
 */
export function MobileNav({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname()
  const list = items.filter((i) => i.label.trim() && i.href.trim()).slice(0, BOTTOM_NAV_MAX)
  if (list.length < 2) return null
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))

  return (
    <nav
      aria-label="Menu bawah"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
        {list.map((item) => {
          const IconCmp = iconByName(item.icon)
          const active = isActive(item.href)
          return (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[10.5px] font-semibold leading-none transition-colors ${
                  active ? 'text-green-700' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-full transition-colors ${active ? 'bg-green-50 text-green-700' : ''}`}>
                  <IconCmp className="size-[18px]" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
