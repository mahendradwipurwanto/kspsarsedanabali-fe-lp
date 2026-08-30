'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { telLink } from '@mahendradwipurwanto/ksp-contracts'
import { Shell, Wordmark, Action, Icon, Tile } from '../ui'

interface NavItem { label: string; href: string; children?: { label: string; href: string }[] }

export function Header({
  nav, whatsapp, branches,
}: {
  nav: NavItem[]
  whatsapp: string
  branches: { name: string; phone: string }[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50">
      <div className={`bg-white/95 backdrop-blur-md transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_var(--color-line),0_8px_24px_-16px_rgb(31_42_68/0.30)]' : 'border-b border-line'}`}>
        <Shell>
          <div className="flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
            <Link href="/" aria-label="KSP Sari Sedana Bali — Beranda" className="min-w-0 flex-1 xl:flex-none">
              <Wordmark />
            </Link>

            <nav aria-label="Navigasi utama" className="hidden items-center gap-0.5 xl:flex">
              {nav.map((item) => (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`relative flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2.5 text-[13.5px] font-medium transition-colors after:absolute after:inset-x-2.5 after:bottom-1 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-green-500 after:to-green-700 after:transition-transform after:duration-300 after:[transition-timing-function:var(--ease-settle)] ${
                      isActive(item.href)
                        ? 'text-green-700 after:scale-x-100'
                        : 'text-slate-600 after:scale-x-0 hover:text-green-700 hover:after:scale-x-100'
                    }`}
                  >
                    {item.label}
                    {item.children?.length ? <Icon.chevron className="size-3.5 text-slate-400 transition-transform group-hover:rotate-180" /> : null}
                  </Link>

                  {item.children?.length ? (
                    <div className="invisible absolute left-0 top-full z-10 w-56 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-b from-white to-[#fbfcfa] p-1.5 shadow-[var(--shadow-lift)]">
                        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-green-500 via-green-400 to-transparent" />
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href}
                            className="block rounded-lg px-3.5 py-2.5 text-[14px] text-slate-600 transition-colors hover:bg-green-50 hover:text-green-700">
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>

            <div className="flex min-w-0 items-center gap-2">
              {/* Quick access to the profiling wizard — the site's main conversion path. */}
              <span className="hidden 2xl:block">
                <Action href="/profiling" variant="soft" size="sm">
                  <Icon.spark className="size-4" />
                  Cari Produk
                </Action>
              </span>
              <span className="hidden sm:block">
                <Action href={`https://wa.me/${whatsapp}`} external size="sm" className="whitespace-nowrap">
                  <Icon.whatsapp className="size-4" />
                  Hubungi Kami
                </Action>
              </span>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="nav-mobile"
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className="grid size-11 place-items-center rounded-full text-navy-800 transition-colors hover:bg-green-50 hover:text-green-700 xl:hidden"
              >
                <span className="grid gap-[5px]">
                  <span className={`block h-[2px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
                  <span className={`block h-[2px] w-5 rounded-full bg-current transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
                  <span className={`block h-[2px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
                </span>
              </button>
            </div>
          </div>
        </Shell>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <div
        id="nav-mobile"
        className={`fixed inset-x-0 top-[68px] bottom-0 z-40 w-full max-w-[100vw] overflow-y-auto overflow-x-hidden overscroll-contain bg-white transition-[opacity,transform] duration-300 xl:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <Shell className="pb-16 pt-5">
          {/* The two primary actions sit above the menu on mobile, where the
              header has no room for them. */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Action href="/profiling" size="lg" full>
              <Icon.spark className="size-4" />
              Cari Produk yang Cocok
            </Action>
            <Action href={`https://wa.me/${whatsapp}`} external variant="outline" size="lg" full>
              <Icon.whatsapp className="size-4" />
              Hubungi via WhatsApp
            </Action>
          </div>

          <nav aria-label="Navigasi utama seluler" className="mt-6 divide-y divide-line border-y border-line">
            {nav.map((item, i) => (
              <div key={item.href} style={{ animationDelay: `${i * 35}ms` }} className={open ? 'rise' : ''}>
                <Link href={item.href}
                  className={`flex items-center justify-between gap-4 py-3.5 text-[16px] font-semibold ${isActive(item.href) ? 'text-green-700' : 'text-navy-800'}`}>
                  {item.label}
                  <Icon.arrow className="size-4 text-slate-300" />
                </Link>
                {item.children?.length ? (
                  <div className="flex flex-wrap gap-2 pb-3.5">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}
                        className="rounded-full bg-green-50 px-3.5 py-2 text-[13px] font-medium text-green-700">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="mt-7">
            <p className="t-label mb-3">Telepon kantor</p>
            <ul className="grid gap-2">
              {branches.filter((b) => b.phone).map((b) => (
                <li key={b.name}>
                  <a href={telLink(b.phone)}
                    className="surface surface-i flex items-center gap-3 p-3.5">
                    <Tile size="sm" tone="soft"><Icon.phone className="size-4" /></Tile>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-navy-800">{b.name}</span>
                      <span className="tnum block text-[13px] text-green-700">{b.phone}</span>
                    </span>
                    <Icon.arrow className="size-4 shrink-0 text-slate-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Shell>
      </div>
    </header>
  )
}
