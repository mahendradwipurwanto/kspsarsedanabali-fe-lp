import Link from 'next/link'
import { SITE, telLink } from '@/contracts'
import { Shell, Mark, Icon, Action } from '../ui'
import type { Branch } from '@/lib/api'

const LINKS = [
  {
    title: 'Produk',
    items: [
      { label: 'Simpanan', href: '/produk/simpanan' },
      { label: 'Pinjaman', href: '/produk/pinjaman' },
      { label: 'Simulasi Angsuran', href: '/simulasi' },
      { label: 'Cari Produk yang Cocok', href: '/profiling' },
    ],
  },
  {
    title: 'Koperasi',
    items: [
      { label: 'Tentang Kami', href: '/tentang-kami' },
      { label: 'Laporan Keuangan', href: '/laporan-keuangan' },
      { label: 'Berita & Artikel', href: '/berita' },
      { label: 'Karir', href: '/karir' },
    ],
  },
  {
    title: 'Bantuan',
    items: [
      { label: 'Lokasi Kantor', href: '/lokasi' },
      { label: 'Tanya Jawab', href: '/faq' },
      { label: 'Kontak Kami', href: '/kontak' },
    ],
  },
]

export function Footer({
  branches, settings, legalPages = [],
}: {
  branches: Branch[]
  settings: Record<string, unknown>
  /** Published CMS pages that may appear in the legal row — never hardcoded. */
  legalPages?: { slug: string; title: string }[]
}) {
  const site = (settings.site ?? {}) as Record<string, string>
  const legal = (settings.legal ?? SITE.legal) as { label: string; value: string; date: string }[]
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-surface-alt text-slate-500">
      {/* Closing call — gold rule above, the one place gold covers real area. */}
      <div className="border-b border-line bg-green-600 text-white">
        <Shell>
          <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between lg:py-12">
            <div>
              <p className="t-h2 !text-white">Ada yang bisa kami bantu?</p>
              <p className="mt-2 text-[15px] text-green-200/75">
                Petugas kami siap membantu, tanpa biaya konsultasi.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Action href="/profiling" variant="light" size="lg">
                <Icon.spark className="size-4" />
                Cari produk yang cocok
              </Action>
              <Action href="/lokasi" variant="ghostLight" size="lg">
                Kunjungi kantor
              </Action>
            </div>
          </div>
        </Shell>
      </div>

      <Shell>
        <div className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] lg:gap-16 lg:py-16">
          <div>
            <div className="flex items-center gap-3">
              <Mark className="h-11 w-auto" />
              <span className="leading-none">
                <span className="block text-[17px] font-extrabold text-green-600">KSP Sari Sedana Bali</span>
                <span className="mt-1 block text-[10px] font-medium tracking-[0.18em] text-slate-400">Untuk kita</span>
              </span>
            </div>

            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-slate-600">
              {site.description ??
                'Koperasi simpan pinjam di Karangasem sejak 2002. Dipercaya Kementerian Koperasi menyalurkan dana LPDB dan PIP Kementerian Keuangan.'}
            </p>

            <dl className="mt-6 space-y-3 border-t border-line pt-6">
              {legal.map((l, i) => (
                <div key={i} className="text-[12px] leading-relaxed">
                  <dt className="font-bold uppercase tracking-[0.12em] text-green-600">{l.label}</dt>
                  <dd className="tnum mt-0.5 text-slate-600">
                    {l.value} <span className="text-slate-400">· {l.date}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-600">{group.title}</h2>
                <div className="rule-gold mt-2.5" />
                <ul className="mt-4 space-y-2.5">
                  {group.items.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[14px] text-slate-600 transition-colors hover:text-green-700">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div className="sm:col-span-2 lg:col-span-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-600">Kantor Kami</h2>
              <div className="rule-gold mt-2.5" />
              <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((b) => (
                  <li key={b.id}>
                    <Link href={`/lokasi/${b.slug}`} className="text-[15px] font-semibold text-navy-700 hover:text-green-700">
                      {b.name}
                    </Link>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{b.address}</p>
                    {b.phone ? (
                      <a href={telLink(b.phone)} className="tnum mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-700 transition-colors hover:text-green-800">
                        <Icon.phone className="size-3.5" />
                        {b.phone}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE.legalName}</p>
          <div className="flex gap-6">
            <Link href="/kebijakan-privasi" className="transition-colors hover:text-green-700">Kebijakan Privasi</Link>
            <Link href="/syarat-ketentuan" className="transition-colors hover:text-green-700">Syarat &amp; Ketentuan</Link>
          </div>
        </div>
      </Shell>
    </footer>
  )
}
