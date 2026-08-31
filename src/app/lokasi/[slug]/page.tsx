import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DAY_NAMES_ID, telLink, waLink, directionsLink } from '@/contracts'
import { getBranch, getBranches, getProducts } from '@/lib/api'
import { buildMetadata, describe, titleFor } from '@/lib/seo'
import { breadcrumbLd, localBusinessLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Action, Card, Icon, Heading } from '@/components/ui'
import { OpenBadge } from '@/components/BranchCard'
import { LeadForm } from '@/components/interactive/LeadForm'

export const revalidate = 3600

export async function generateStaticParams() {
  const branches = await getBranches()
  return branches.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const branch = await getBranch(slug)
  if (!branch) return buildMetadata({ title: 'Kantor tidak ditemukan', description: 'Kantor yang Anda cari tidak tersedia.', path: `/lokasi/${slug}`, noindex: true })

  return buildMetadata({
    title: branch.seo?.metaTitle || titleFor(branch.name, `KSP Sari Sedana Bali ${branch.district ?? branch.regency}`),
    description: describe(
      branch.seo?.metaDescription,
      `Alamat ${branch.name}: ${branch.address}. Jam buka Senin–Jumat 08.00–15.00 WITA. Telepon ${branch.phone ?? ''}. Layanan simpanan dan pinjaman KSP Sari Sedana Bali.`,
    ),
    path: `/lokasi/${branch.slug}`,
  })
}

export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [branch, branches, products] = await Promise.all([getBranch(slug), getBranches(), getProducts()])
  if (!branch) notFound()

  const trail = [
    { name: 'Beranda', path: '/' },
    { name: 'Lokasi Kantor', path: '/lokasi' },
    { name: branch.name, path: `/lokasi/${branch.slug}` },
  ]
  const others = branches.filter((b) => b.id !== branch.id)
  const area = branch.district ?? branch.regency

  return (
    <>
      {/* LocalBusiness with structured opening hours is what puts "Buka · tutup 15.00"
          directly into the Google result for this branch. */}
      <JsonLd data={[breadcrumbLd(trail), localBusinessLd(branch)]} />
      <Breadcrumbs trail={trail} />

      <Band className="!pb-8">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-green-600">
                {branch.type === 'pusat' ? 'KANTOR PUSAT' : 'KANTOR CABANG'}
              </p>
              <h1 className="t-h1 text-navy-800">
                {branch.name}
              </h1>
              <p className="t-lead mt-5">
                Melayani warga {area} dan sekitarnya untuk produk simpanan dan pinjaman KSP Sari Sedana Bali. Datang langsung, telepon, atau
                hubungi kami lewat WhatsApp.
              </p>

              <dl className="mt-8 space-y-5">
                <div className="flex gap-3">
                  <Icon.pin className="mt-1 size-5 shrink-0 text-green-600" />
                  <div>
                    <dt className="text-sm font-semibold text-navy-800">Alamat lengkap</dt>
                    <dd className="mt-0.5 leading-relaxed text-slate-600">
                      {branch.address}
                      <br />
                      {[branch.district, branch.regency, branch.province].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                </div>

                {branch.phone ? (
                  <div className="flex gap-3">
                    <Icon.phone className="mt-1 size-5 shrink-0 text-green-600" />
                    <div>
                      <dt className="text-sm font-semibold text-navy-800">Telepon</dt>
                      <dd className="mt-0.5">
                        {/* Tappable — the audit found numbers written as one unclickable string. */}
                        <a href={telLink(branch.phone)} className="tnum font-medium text-green-700 hover:underline">
                          {branch.phone}
                        </a>
                      </dd>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Icon.clock className="mt-1 size-5 shrink-0 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-sm font-semibold text-navy-800">Jam operasional</dt>
                    <dd className="mt-1.5">
                      <OpenBadge branch={branch} />
                      <ul className="tnum mt-3 max-w-xs space-y-1 text-sm text-slate-600">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                          const h = branch.hours.find((x) => x.day === day)
                          return (
                            <li key={day} className="flex justify-between gap-4 border-b border-slate-200 pb-1">
                              <span>{DAY_NAMES_ID[day]}</span>
                              <span className={h?.opensAt ? 'font-medium text-navy-800' : 'text-slate-400'}>
                                {h?.opensAt ? `${h.opensAt} – ${h.closesAt} WITA` : 'Tutup'}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                {branch.phone ? (
                  <Action href={telLink(branch.phone)} external variant="outline">
                    <Icon.phone className="size-4" /> Telepon
                  </Action>
                ) : null}
                <Action href={waLink(branch.whatsapp || branch.phone || '', `Halo ${branch.name}, saya ingin bertanya tentang produk koperasi.`)} external>
                  <Icon.whatsapp className="size-4" /> WhatsApp
                </Action>
                <Action href={branch.mapsUrl || directionsLink(branch.latitude, branch.longitude, branch.name)} external variant="outline">
                  <Icon.compass className="size-4" /> Petunjuk Arah
                </Action>
              </div>
            </div>

            <div>
              <Card className="overflow-hidden">
                <iframe
                  title={`Peta lokasi ${branch.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-72 w-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${branch.longitude - 0.012}%2C${branch.latitude - 0.008}%2C${branch.longitude + 0.012}%2C${branch.latitude + 0.008}&layer=mapnik&marker=${branch.latitude}%2C${branch.longitude}`}
                />
                <div className="p-5">
                  <p className="text-sm font-semibold text-navy-800">Koordinat</p>
                  <p className="tnum mt-1 text-sm text-slate-500">
                    {branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)}
                  </p>
                  <Action href={directionsLink(branch.latitude, branch.longitude, branch.name)} external className="mt-4 w-full">
                    Buka di aplikasi peta <Icon.arrow />
                  </Action>
                </div>
              </Card>
            </div>
          </div>
        </Shell>
      </Band>

      <Band tone="alt">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Heading
                label="HUBUNGI KAMI"
                title={`Minta dihubungi petugas ${branch.name}`}
                lead="Isi formulir ini dan petugas kantor ini yang akan menghubungi Anda, bukan kantor lain."
              />
            </div>
            <LeadForm
              askProduct
              askBranch={false}
              products={products}
              branches={[branch]}
              successMessage={`Terima kasih. Petugas ${branch.name} akan menghubungi Anda dalam 1×24 jam kerja.`}
            />
          </div>
        </Shell>
      </Band>

      {others.length ? (
        <Band>
          <Shell>
            <Heading title="Kantor kami yang lain" />
            <ul className="grid gap-5 sm:grid-cols-2">
              {others.map((b) => (
                <Card as="li" key={b.id} className="p-5">
                  <h3 className="font-bold text-navy-800">
                    <a href={`/lokasi/${b.slug}`} className="hover:text-green-700 hover:underline">{b.name}</a>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{b.address}</p>
                  <div className="mt-3">
                    <OpenBadge branch={b} />
                  </div>
                </Card>
              ))}
            </ul>
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
