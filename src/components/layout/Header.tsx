'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { telLink, type MenuItem, type HeaderSettings, type BrandSettings } from '@/contracts'
import { Shell, Wordmark, Action, Icon, Tile } from '../ui'

/**
 * Site header. Everything it shows is editable in the CMS:
 *   · the menu comes from Pengaturan → Menu (key "main")
 *   · the two buttons and the announcement bar from Pengaturan → Website → Header
 *   · the name, tagline and logo from Pengaturan → Website → Identitas
 */
export function Header({
  nav, header, brand, whatsapp, branches,
}: {
  nav: MenuItem[]
  header: HeaderSettings
  brand: BrandSettings
  whatsapp: string
  branches: { name: string; phone: string }[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  // "whatsapp" is a keyword in the settings form, so staff never have to build a wa.me URL.
  const ctaHref = header.ctaHref === 'whatsapp' || !header.ctaHref ? `https://wa.me/${whatsapp}` : header.ctaHref
  const ctaExternal = ctaHref.startsWith('http')

  return (
    <header className="sticky top-0 z-50">
      {header.announcement ? (
        <div className="bg-ink-900 text-white">
          <Shell>
            <p className="flex min-h-[36px] items-center justify-center gap-3 py-1.5 text-center text-[12.5px] font-medium">
              <span aria-hidden="true" className="hidden size-1.5 rounded-full bg-gold-300 sm:block" />
              {header.announcementHref ? (
                <Link href={header.announcementHref} className="underline-offset-4 hover:underline">{header.announcement}</Link>
              ) : header.announcement}
            </p>
          </Shell>
        </div>
      ) : null}

      <div className={`bg-white/92 backdrop-blur-md transition-[box-shadow,border-color] duration-300 border-b ${scrolled ? 'border-line shadow-[0_8px_24px_-20px_rgb(15_27_45/0.35)]' : 'border-transparent'}`}>
        <Shell>
          <div className="flex h-[66px] items-center justify-between gap-4 lg:h-[74px]">
            <Link href="/" aria-label={`${brand.name} — Beranda`} className="min-w-0 flex-1 xl:flex-none">
              <Wordmark name={brand.name} tagline={brand.tagline} logo={brand.logo || undefined} />
            </Link>

            <nav aria-label="Navigasi utama" className="hidden items-center xl:flex">
              {nav.map((item) => (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`relative flex items-center gap-1 whitespace-nowrap px-3 py-2.5 text-[13.5px] font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-[2px] after:h-[2px] after:bg-green-600 after:transition-transform after:duration-300 after:[transition-timing-function:var(--ease-settle)] ${
                      isActive(item.href) ? 'text-ink-900 after:scale-x-100' : 'text-ink-600 after:scale-x-0 hover:text-ink-900 hover:after:scale-x-100'
                    }`}
                  >
                    {item.label}
                    {item.children?.length ? <Icon.chevron className="size-3.5 text-ink-400 transition-transform group-hover:rotate-180" /> : null}
                  </Link>

                  {item.children?.length ? (
                    <div className="invisible absolute left-0 top-full z-10 w-60 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <div className="surface p-1.5 shadow-[var(--shadow-lift)]">
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href}
                            className="flex items-center justify-between rounded-md px-3 py-2.5 text-[14px] text-ink-700 transition-colors hover:bg-paper hover:text-ink-900">
                            {child.label}
                            <Icon.arrowUpRight className="size-3.5 text-ink-300" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>

            <div className="flex min-w-0 items-center gap-2">
              {header.showProfilingShortcut ? (
                <span className="hidden 2xl:block">
                  <Action href="/profiling" variant="quiet" size="sm">
                    <Icon.spark className="size-4 text-green-600" />
                    {header.profilingLabel}
                  </Action>
                </span>
              ) : null}
              <span className="hidden sm:block">
                <Action href={ctaHref} external={ctaExternal} size="sm" className="whitespace-nowrap">
                  {ctaExternal ? <Icon.whatsapp className="size-4" /> : null}
                  {header.ctaLabel}
                </Action>
              </span>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="nav-mobile"
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className="grid size-11 place-items-center rounded-md text-ink-900 transition-colors hover:bg-paper xl:hidden"
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
        className={`fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] overflow-y-auto overflow-x-hidden overscroll-contain bg-white transition-[opacity,transform] duration-300 xl:hidden ${
          header.announcement ? 'top-[102px]' : 'top-[66px]'
        } ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}
      >
        <Shell className="pb-16 pt-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Action href="/profiling" size="lg" full>
              <Icon.spark className="size-4" />
              Cari produk yang cocok
            </Action>
            <Action href={ctaHref} external={ctaExternal} variant="outline" size="lg" full>
              {ctaExternal ? <Icon.whatsapp className="size-4" /> : null}
              {header.ctaLabel}
            </Action>
          </div>

          <nav aria-label="Navigasi utama seluler" className="mt-6 divide-y divide-line border-y border-line">
            {nav.map((item, i) => (
              <div key={item.href} style={{ animationDelay: `${i * 35}ms` }} className={open ? 'rise' : ''}>
                <Link href={item.href}
                  className={`flex items-center justify-between gap-4 py-3.5 text-[16px] font-semibold ${isActive(item.href) ? 'text-green-700' : 'text-ink-900'}`}>
                  {item.label}
                  <Icon.arrow className="size-4 text-ink-300" />
                </Link>
                {item.children?.length ? (
                  <div className="flex flex-wrap gap-2 pb-3.5">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}
                        className="rounded-full bg-paper px-3.5 py-2 text-[13px] font-medium text-ink-700 ring-1 ring-inset ring-line">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          {branches.some((b) => b.phone) ? (
            <div className="mt-7">
              <p className="t-label mb-3">Telepon kantor</p>
              <ul className="grid gap-2">
                {branches.filter((b) => b.phone).map((b) => (
                  <li key={b.name}>
                    <a href={telLink(b.phone)} className="surface flex items-center gap-3 p-3.5">
                      <Tile size="sm" tone="soft"><Icon.phone className="size-4" /></Tile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">{b.name}</span>
                        <span className="tnum block text-[13px] text-green-700">{b.phone}</span>
                      </span>
                      <Icon.arrow className="size-4 shrink-0 text-ink-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Shell>
      </div>
    </header>
  )
}
