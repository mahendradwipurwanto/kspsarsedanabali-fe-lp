import Link from 'next/link'
import { SITE, telLink, type MenuItem, type FooterSettings, type BrandSettings } from '@/contracts'
import { Shell, Mark, Icon, Action } from '../ui'
import type { Branch } from '@/lib/api'

/**
 * Footer. Deep navy with the engineering grid, so the page closes on the
 * same surface the hero opened on. Every line of it is editable:
 *   · link columns — Pengaturan → Menu (key "footer"); a top-level item with
 *     children becomes a column, a flat item joins the last column
 *   · the call-to-action band, the bottom note — Pengaturan → Website → Footer
 *   · legal numbers, social links, description — Pengaturan → Website
 */
export function Footer({
  branches, menu, footer, brand, site, legal, social, legalPages = [],
}: {
  branches: Branch[]
  menu: MenuItem[]
  footer: FooterSettings
  brand: BrandSettings
  site: Record<string, string>
  legal: { label: string; value: string; date: string }[]
  social: Record<string, string>
  /** Published CMS pages that may appear in the legal row — never hardcoded. */
  legalPages?: { slug: string; title: string }[]
}) {
  const year = new Date().getFullYear()
  const columns = menu.filter((m) => m.children?.length)
  const loose = menu.filter((m) => !m.children?.length)
  const socials = [
    { key: 'facebook', href: social.facebook, Icon: Icon.facebook, label: 'Facebook' },
    { key: 'instagram', href: social.instagram, Icon: Icon.instagram, label: 'Instagram' },
    { key: 'youtube', href: social.youtube, Icon: Icon.youtube, label: 'YouTube' },
  ].filter((s) => s.href)

  return (
    <footer className="bg-ink-900 text-white/70">
      {/* The closing call. Green on navy, one gold hairline above. */}
      {footer.ctaHeading ? (
        <div className="relative border-b border-white/10 bg-green-700 text-white">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent" />
          <Shell>
            <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between lg:py-12">
              <div className="max-w-[44ch]">
                <p className="t-h2 !text-white">{footer.ctaHeading}</p>
                {footer.ctaBody ? <p className="mt-2 text-[15px] text-white/75">{footer.ctaBody}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {footer.primaryLabel ? (
                  <Action href={footer.primaryHref || '/profiling'} variant="light" size="lg">
                    <Icon.spark className="size-4 text-green-700" />
                    {footer.primaryLabel}
                  </Action>
                ) : null}
                {footer.secondaryLabel ? (
                  <Action href={footer.secondaryHref || '/lokasi'} variant="ghostLight" size="lg">
                    {footer.secondaryLabel}
                  </Action>
                ) : null}
              </div>
            </div>
          </Shell>
        </div>
      ) : null}

      <div className="grid-dark">
        <Shell>
          <div className="grid gap-12 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:gap-16 lg:py-20">
            <div>
              <div className="flex items-center gap-3">
                {brand.logoLight || brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoLight || brand.logo} alt="" className="h-11 w-auto" />
                ) : (
                  <Mark className="h-11 w-auto" />
                )}
                <span className="leading-none">
                  <span className="block text-[17px] font-extrabold tracking-[-0.02em] text-white">{brand.name}</span>
                  <span className="mt-1.5 block text-[11px] font-medium text-white/45">{brand.tagline}</span>
                </span>
              </div>

              <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-white/60">
                {site.description || SITE.description}
              </p>

              {legal.length ? (
                <dl className="mt-7 space-y-3 border-t border-white/10 pt-6">
                  {legal.map((l, i) => (
                    <div key={i} className="text-[12px] leading-relaxed">
                      <dt className="font-semibold text-white/45">{l.label}</dt>
                      <dd className="tnum mt-0.5 text-white/80">
                        {l.value}{l.date ? <span className="text-white/40"> · {l.date}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {socials.length ? (
                <ul className="mt-6 flex gap-2">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                        className="grid size-10 place-items-center rounded-[var(--radius-tile)] text-white/70 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white">
                        <s.Icon className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map((group, gi) => (
                <nav key={group.href || gi} aria-label={group.label}>
                  <h2 className="text-[13px] font-semibold text-white">{group.label}</h2>
                  <span aria-hidden="true" className="mt-2.5 block h-px w-8 bg-gold-400" />
                  <ul className="mt-4 space-y-2.5">
                    {group.children!.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-[14px] text-white/60 transition-colors hover:text-white">{l.label}</Link>
                      </li>
                    ))}
                    {gi === columns.length - 1 ? loose.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-[14px] text-white/60 transition-colors hover:text-white">{l.label}</Link>
                      </li>
                    )) : null}
                  </ul>
                </nav>
              ))}

              {footer.showBranches && branches.length ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <h2 className="text-[13px] font-semibold text-white">Kantor kami</h2>
                  <span aria-hidden="true" className="mt-2.5 block h-px w-8 bg-gold-400" />
                  <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    {branches.map((b) => (
                      <li key={b.id}>
                        <Link href={`/lokasi/${b.slug}`} className="text-[15px] font-semibold text-white transition-colors hover:text-gold-200">
                          {b.name}
                        </Link>
                        <p className="mt-1 text-[13px] leading-relaxed text-white/55">{b.address}</p>
                        {b.phone ? (
                          <a href={telLink(b.phone)} className="tnum mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-300 transition-colors hover:text-gold-200">
                            <Icon.phone className="size-3.5" />
                            {b.phone}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p className="tnum">© {year} {site.legalName || SITE.legalName}{footer.bottomNote ? ` · ${footer.bottomNote}` : ''}</p>
            <div className="flex gap-6">
              {legalPages.map((pg) => (
                <Link key={pg.slug} href={`/${pg.slug}`} className="transition-colors hover:text-white">{pg.title}</Link>
              ))}
            </div>
          </div>
        </Shell>
      </div>
    </footer>
  )
}
