import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatRupiahShort } from '@/contracts'
import { getProduct, getProducts, getBranches } from '@/lib/api'
import { buildMetadata, describe, titleFor } from '@/lib/seo'
import { breadcrumbLd, productLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Action, Card, Pill, Icon, Heading } from '@/components/ui'
import { Media } from '@/components/ui/Media'
import { Accordion } from '@/components/interactive/Accordion'
import { SimulationCalculator } from '@/components/interactive/SimulationCalculator'
import { LeadForm } from '@/components/interactive/LeadForm'
import { ProductCard } from '@/components/ProductCard'

export const revalidate = 600

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map((p) => ({ category: p.category, slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params
  const res = await getProduct(slug)
  if (!res) return buildMetadata({ title: 'Produk tidak ditemukan', description: 'Produk yang Anda cari tidak tersedia.', path: `/produk/${category}/${slug}`, noindex: true })

  const p = res.data
  return buildMetadata({
    title: p.seo?.metaTitle || titleFor(p.name, `${p.tagline ?? 'KSP Sari Sedana Bali'}`),
    description: describe(p.seo?.metaDescription, p.summary, p.tagline),
    path: `/produk/${p.category}/${p.slug}`,
    image: p.image?.startsWith('http') ? p.image : undefined,
  })
}

export default async function ProductDetailPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  const [res, branches, allProducts] = await Promise.all([getProduct(slug), getBranches(), getProducts()])
  if (!res) notFound()

  const p = res.data
  // The URL category must match the product's real category, or two URLs would
  // serve identical content — a duplicate-content problem.
  if (p.category !== category) notFound()

  const trail = [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/produk' },
    { name: p.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan', path: `/produk/${p.category}` },
    { name: p.name, path: `/produk/${p.category}/${p.slug}` },
  ]

  const accordionItems = [
    p.description ? { title: 'Deskripsi Produk', body: `<p>${p.description.replace(/\n\n/g, '</p><p>')}</p>` } : null,
    p.benefits.length ? { title: 'Manfaat', body: `<ul>${p.benefits.map((x) => `<li>${x}</li>`).join('')}</ul>` } : null,
    p.requirements.length ? { title: 'Persyaratan', body: `<ul>${p.requirements.map((x) => `<li>${x}</li>`).join('')}</ul>` } : null,
  ].filter(Boolean) as { title: string; body: string }[]

  const isLoan = p.category === 'pinjaman'
  // No brochure artwork uploaded yet: a 420px 4:5 placeholder is a large piece
  // of nothing beside the terms, so the column collapses and the copy runs at a
  // readable measure instead.
  const hasArtwork = Boolean(p.image)
  const loans = allProducts.filter((x) => x.category === 'pinjaman' && x.isVerified && x.ratePercent != null)

  return (
    <>
      <JsonLd data={[breadcrumbLd(trail), productLd(p)]} />
      <Breadcrumbs trail={trail} />

      <Band className="!pb-10">
        <Shell>
          <div className={`grid gap-10 lg:gap-14 ${hasArtwork ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]' : ''}`}>
            {hasArtwork ? (
              <div className="lg:order-2">
                <Media src={p.image} alt={`Brosur produk ${p.name}`} ratio="4/5" priority sizes="(max-width: 1024px) 100vw, 420px" rounded={false} />
              </div>
            ) : null}

            <div className={hasArtwork ? 'lg:order-1' : 'max-w-[62ch]'}>
              <div className="flex flex-wrap items-center gap-4">
                <Pill tone={isLoan ? 'gold' : 'green'}>{isLoan ? 'Pinjaman' : 'Simpanan'}</Pill>
                {p.rateNote ? <span className="text-[12.5px] text-slate-500">{p.rateNote}</span> : null}
              </div>

              <h1 className="t-h1 mt-5 text-navy-800">{p.name}</h1>
              {p.tagline ? <p className="mt-4 font-display text-[19px] italic text-green-700">{p.tagline}</p> : null}
              {p.summary ? <p className="t-lead mt-5">{p.summary}</p> : null}

              {/* Terms as a ruled rate sheet. */}
              <dl className="tnum mt-9 border-t border-rule">
                {[
                  p.minAmount != null && p.maxAmount != null
                    ? ['Plafon', `${formatRupiahShort(p.minAmount)} – ${formatRupiahShort(p.maxAmount)}`]
                    : null,
                  p.tenorOptions.length
                    ? ['Jangka waktu', `${Math.min(...p.tenorOptions)}–${Math.max(...p.tenorOptions)} bulan`]
                    : null,
                  p.ratePercent != null
                    ? [isLoan ? 'Bunga' : 'Imbal hasil', `${(p.ratePercent / 12).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}% per bulan`]
                    : null,
                ]
                  .filter(Boolean)
                  .map((row) => {
                    const [k, v] = row as [string, string]
                    return (
                      <div key={k} className="flex items-baseline justify-between gap-6 border-b border-rule py-3.5">
                        <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{k}</dt>
                        <dd className="font-display text-[17px] text-navy-800">{v}</dd>
                      </div>
                    )
                  })}
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Action href="#ajukan" size="lg">
                  Ajukan Sekarang
                  <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                </Action>
                {isLoan ? (
                  <Action href="#simulasi" variant="outline" size="lg">
                    <Icon.calculator className="size-4" />
                    Hitung Angsuran
                  </Action>
                ) : null}
              </div>
            </div>
          </div>

          {accordionItems.length ? (
            <div className="mt-14 lg:mt-16">
              <Accordion items={accordionItems} />
            </div>
          ) : null}
        </Shell>
      </Band>

      {isLoan && p.isVerified && p.ratePercent != null ? (
        <Band tone="alt" id="simulasi">
          <Shell>
            <Heading
              title={`Simulasi Angsuran ${p.name}`}
              lead="Geser nominal dan pilih jangka waktu untuk melihat perkiraan angsuran bulanan Anda."
            />
            <SimulationCalculator products={loans} initialProductId={p.id} disclaimer="Simulasi awal, bukan penawaran final. Angka resmi ditentukan setelah pengajuan dan survei." />
          </Shell>
        </Band>
      ) : null}

      <Band id="ajukan">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Heading
                label="LANGKAH BERIKUTNYA"
                title={`Tertarik dengan ${p.name}?`}
                lead="Tinggalkan nama dan nomor WhatsApp Anda. Petugas cabang terdekat akan menghubungi dalam 1×24 jam kerja untuk menjelaskan detailnya."
              />
              <div className="border-l-2 border-gold-500 bg-gold-50 p-5">
                <p className="font-display text-[17px] text-navy-800">Lebih suka datang langsung?</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">
                  Tiga kantor kami di Karangasem melayani Senin–Jumat 08.00–15.00 WITA.
                </p>
                <Link href="/lokasi" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.13em] text-green-700 hover:text-green-900">
                  Lihat kantor terdekat <Icon.arrow className="size-4" />
                </Link>
              </div>
            </div>
            <LeadForm
              askProduct={false}
              askBranch
              defaultProductId={p.id}
              products={allProducts}
              branches={branches}
              successMessage={`Terima kasih. Petugas kami akan menghubungi Anda untuk membahas ${p.name} dalam 1×24 jam kerja.`}
            />
          </div>
        </Shell>
      </Band>

      {res.related.length ? (
        <Band tone="alt">
          <Shell>
            <Heading title="Produk lain yang mungkin cocok" />
            <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
              {res.related.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </ul>
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
