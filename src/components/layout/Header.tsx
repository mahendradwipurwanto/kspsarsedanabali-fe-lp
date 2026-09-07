'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { telLink, mediaSrc, isMenuGroup, type MenuItem, type HeaderSettings, type BrandSettings } from '@/contracts'
import { Shell, Wordmark, Action, Icon, Tile, iconByName } from '../ui'

/**
 * What a dropdown entry shows beside its name: an icon, and one line saying
 * where the link goes.
 *
 * The menu itself is edited in the CMS, which stores a label and an address and
 * nothing else, so this fills in the rest for the addresses the site ships with.
 * An entry staff add later still renders — it falls back to a neutral icon and
 * no second line rather than leaving a hole in the row.
 */
const NAV_DETAIL: Record<string, { icon: string; description: string }> = {
  '/produk': { icon: 'compass', description: 'Semua simpanan dan pinjaman' },
  '/produk/simpanan': { icon: 'piggy-bank', description: 'Simpanan berjangka, harian dan berencana' },
  '/produk/pinjaman': { icon: 'wallet', description: 'Pembiayaan untuk usaha, rumah dan pendidikan' },
  '/tentang-kami': { icon: 'users', description: 'Profil, visi misi dan struktur pengurus' },
  '/laporan-keuangan': { icon: 'chart', description: 'Kinerja dan laporan yang kami terbitkan' },
  '/kantor': { icon: 'map-pin', description: 'Alamat dan jam layanan tiap kantor' },
  '/simulasi': { icon: 'calculator', description: 'Hitung angsuran sebelum mengajukan' },
  '/karir': { icon: 'briefcase', description: 'Lowongan yang sedang dibuka' },
  '/berita': { icon: 'newspaper', description: 'Kabar dan kegiatan terbaru' },
}

const detailFor = (href: string) => NAV_DETAIL[href.replace(/\/+$/, '') || '/'] ?? null

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
  // Desktop dropdowns open on hover and keyboard focus through CSS alone. Two
  // things CSS cannot do: fold a dropdown away after a click in it (the cursor
  // is still over it, and the clicked link keeps focus), and open a group that
  // has no address of its own on a touch screen. `dismissed` hides a dropdown
  // until the cursor leaves it; `opened` is the tapped-open group — a touch
  // tap only, never a mouse click, which would pin one menu open beside the
  // next one the cursor reached.
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [opened, setOpened] = useState<string | null>(null)

  useEffect(() => { setOpen(false); setOpened(null) }, [pathname])

  useEffect(() => {
    if (!opened) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('[data-nav-group]')) return
      setOpened(null)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close) }
  }, [opened])

  /** After choosing an entry: hide the dropdown until the cursor leaves, and drop focus so the focus rule lets go too. */
  const settle = (key: string, el: HTMLElement) => { setDismissed(key); setOpened(null); el.blur() }

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
              <Wordmark name={brand.name} tagline={brand.tagline} logo={brand.logo ? mediaSrc(brand.logo) : undefined} />
            </Link>

            {/* The bar's own height is the nav's height, so an item's indicator
                sits on the header's bottom edge and its dropdown opens flush
                against it. */}
            <nav aria-label="Navigasi utama" className="hidden items-stretch self-stretch xl:flex xl:flex-1 xl:justify-center">
              {nav.map((item) => {
                const key = item.href || item.label
                const state = opened === key ? '!visible !translate-y-0 !opacity-100' : dismissed === key ? '!invisible !opacity-0' : ''
                // A group is current when the page you are on sits inside it,
                // whether or not the group itself leads anywhere.
                const current = (item.href ? isActive(item.href) : false) || Boolean(item.children?.some((c) => c.href && isActive(c.href)))
                const held = current || opened === key
                const hasMenu = Boolean(item.children?.length)
                // Green says one of two things: this is the page you are on, or
                // this menu is open. Plain items darken instead, so the colour
                // never fires on a pointer merely passing over.
                const label = `whitespace-nowrap px-4 text-[14px] font-medium tracking-[-0.005em] transition-colors duration-200 ${
                  held ? 'text-green-700' : hasMenu ? 'text-ink-600 group-hover:text-green-700' : 'text-ink-600 hover:text-ink-900'
                }`
                // The indicator, on the header's bottom edge: full green on the
                // page you are reading, a paler one that grows from the centre
                // under whatever the cursor is over.
                const rule = `after:absolute after:inset-x-4 after:bottom-0 after:h-[2px] after:rounded-full after:transition-transform after:duration-300 after:[transition-timing-function:var(--ease-settle)] ${
                  held ? 'after:scale-x-100 after:bg-green-600' : 'after:scale-x-0 after:bg-green-200 group-hover:after:scale-x-100'
                }`
                return (
                <div key={key} data-nav-group className="group relative flex items-stretch" onMouseLeave={() => setDismissed((d) => (d === key ? null : d))}>
                  {/* A group without an address opens its dropdown and leads
                      nowhere itself, so it is a button rather than a link. A tap
                      toggles it, for screens wide enough for this menu but
                      without a cursor to hover. */}
                  {isMenuGroup(item) ? (
                    <button
                      type="button"
                      aria-expanded={opened === key}
                      /* A mouse must leave nothing behind here. Hovering already
                         shows the dropdown, and a click that latched it open —
                         or merely left focus on the button — kept it on screen
                         while the next group opened beside it, two menus at
                         once with a focus ring stuck on the first. Preventing
                         the mousedown keeps focus off it; only a tap toggles. */
                      onMouseDown={(e) => e.preventDefault()}
                      onPointerUp={(e) => {
                        if (e.pointerType === 'mouse') return
                        setDismissed(null)
                        setOpened((o) => (o === key ? null : key))
                      }}
                      className={`relative flex h-full items-center gap-1.5 ${label} ${rule}`}
                    >
                      {item.label}
                      <Icon.chevron className={`size-3.5 transition-[transform,color] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:rotate-180 ${held ? 'text-green-600' : 'text-ink-400 group-hover:text-green-600'} ${opened === key ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={(e) => { if (item.children?.length) settle(key, e.currentTarget) }}
                    className={`relative flex h-full items-center gap-1.5 ${label} ${rule}`}
                  >
                    {item.label}
                    {item.children?.length ? (
                      <Icon.chevron className={`size-3.5 transition-[transform,color] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:rotate-180 ${held ? 'text-green-600' : 'text-ink-400 group-hover:text-green-600'}`} />
                    ) : null}
                  </Link>
                  )}

                  {/* Absolutely positioned and mounted at all times, so opening
                      it moves nothing on the page. */}
                  {item.children?.length ? (
                    <div
                      className={`invisible absolute left-0 top-full z-20 w-[25rem] max-w-[calc(100vw-2*var(--gutter))] -translate-y-1 pt-2 opacity-0 transition-[opacity,transform,visibility] duration-200 [transition-timing-function:var(--ease-settle)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100 ${state}`}
                    >
                      <div className="rounded-[14px] border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
                        {item.children.map((child) => {
                          const detail = detailFor(child.href)
                          const Glyph = iconByName(detail?.icon)
                          const here = Boolean(child.href) && isActive(child.href)
                          return (
                            <Link
                              key={child.href || child.label}
                              href={child.href}
                              aria-current={here ? 'page' : undefined}
                              onClick={(e) => settle(key, e.currentTarget)}
                              className={`group/row flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-200 ${here ? 'bg-green-50' : 'hover:bg-green-50/70'}`}
                            >
                              <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] ring-1 ring-inset transition-colors duration-200 ${
                                here
                                  ? 'bg-green-100 text-green-700 ring-green-200'
                                  : 'bg-paper text-ink-500 ring-line group-hover/row:bg-green-100 group-hover/row:text-green-700 group-hover/row:ring-green-200'
                              }`}>
                                <Glyph className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-[14px] font-semibold leading-snug ${here ? 'text-green-800' : 'text-ink-900'}`}>{child.label}</span>
                                {/* ink-500, not the lighter grey: at 12.5px the paler one falls under 4.5:1 on white. */}
                                {detail ? <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-ink-500">{detail.description}</span> : null}
                              </span>
                              <Icon.arrow className={`size-4 shrink-0 transition-[transform,color] duration-200 group-hover/row:translate-x-0.5 ${here ? 'text-green-600' : 'text-ink-300 group-hover/row:text-green-600'}`} />
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                )
              })}
            </nav>

            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              {header.showProfilingShortcut ? (
                <span className="hidden 2xl:block">
                  <Action href="/profiling" variant="quiet" size="sm" className="font-medium">
                    <Icon.spark className="size-4 text-green-600" />
                    {header.profilingLabel}
                  </Action>
                </span>
              ) : null}
              <span className="hidden sm:block">
                {/* One size up from the old button: at 14px it reads level with
                    the nav beside it rather than as an afterthought. */}
                <Action href={ctaHref} external={ctaExternal} size="md" className="whitespace-nowrap">
                  {ctaExternal ? <Icon.whatsapp className="size-[17px]" /> : null}
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
              <div key={item.href || item.label} style={{ animationDelay: `${i * 35}ms` }} className={open ? 'rise' : ''}>
                {isMenuGroup(item) ? (
                  <p className="py-3.5 text-[16px] font-semibold text-ink-900">{item.label}</p>
                ) : (
                <Link href={item.href}
                  className={`flex items-center justify-between gap-4 py-3.5 text-[16px] font-semibold ${isActive(item.href) ? 'text-green-700' : 'text-ink-900'}`}>
                  {item.label}
                  <Icon.arrow className="size-4 text-ink-300" />
                </Link>
                )}
                {item.children?.length ? (
                  <div className="flex flex-wrap gap-2 pb-3.5">
                    {item.children.map((child) => {
                      const here = Boolean(child.href) && isActive(child.href)
                      return (
                        <Link
                          key={child.href || child.label}
                          href={child.href}
                          aria-current={here ? 'page' : undefined}
                          className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-[13.5px] font-medium ring-1 ring-inset transition-colors ${
                            here ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-paper text-ink-700 ring-line'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
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
