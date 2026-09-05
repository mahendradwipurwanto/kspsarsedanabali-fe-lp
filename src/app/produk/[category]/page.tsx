import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProducts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Action, Blank, PageIntro } from '@/components/ui'
import { ProductRow } from '@/components/ProductCard'

export const revalidate = 600

const CATEGORIES = {
  simpanan: {
    label: 'Simpanan',
    h1: 'Produk Simpanan KSP Sari Sedana Bali di Karangasem',
    intro:
      'Simpanan berjangka dan simpanan harian dengan imbal hasil kompetitif. Dana Anda aman di koperasi berbadan hukum resmi yang dipercaya menyalurkan dana pemerintah.',
    title: 'Produk Simpanan Koperasi di Karangasem',
    description:
      'Pilihan produk simpanan KSP Sari Sedana Bali: SIJAKOP berjangka bunga 4–6% per tahun, SIMAPAN berencana, SIPURA hari raya, SIGEMAS berhadiah, dan Simpanan Sukarela harian.',
  },
  pinjaman: {
    label: 'Pinjaman',
    h1: 'Produk Pinjaman KSP Sari Sedana Bali di Karangasem',
    intro:
      'Pembiayaan dengan bunga ringan mulai 0,9% menurun per bulan untuk modal usaha, renovasi rumah, pendidikan, upacara adat, dan kebutuhan lainnya.',
    title: 'Produk Pinjaman Koperasi di Karangasem',
    description:
      'Pilihan produk pinjaman KSP Sari Sedana Bali Karangasem: Bunga Murah 1,3% per bulan, Pinjaman Mikro untuk UMKM, Pinjaman Pensiunan, dan Pinjaman 1 Pohon bersama BPDLH.',
  },
} as const

type Category = keyof typeof CATEGORIES

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const meta = CATEGORIES[category as Category]
  if (!meta) return await buildMetadata({ title: 'Produk tidak ditemukan', description: 'Halaman produk yang Anda cari tidak tersedia.', path: '/produk', noindex: true })
  return await buildMetadata({ title: meta.title, description: meta.description, path: `/produk/${category}` })
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const meta = CATEGORIES[category as Category]
  if (!meta) notFound()

  const products = await getProducts(category)
  const trail = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/produk' }, { name: meta.label, path: `/produk/${category}` }]

  return (
    <>
      <JsonLd
        data={[breadcrumbLd(trail), itemListLd(products.map((p) => ({ name: p.name, path: `/produk/${category}/${p.slug}` })), `Produk ${meta.label}`)]}
      />
      <Breadcrumbs trail={trail} />

      <PageIntro label={`Produk ${meta.label.toLowerCase()}`} title={meta.h1} lead={meta.intro} />

      <Band>
        <Shell>
          {products.length ? (
            <ul className="grid gap-3">
              {products.map((p, i) => (
                <ProductRow key={p.id} product={p} index={i + 1} />
              ))}
            </ul>
          ) : (
            <Blank title={`Produk ${meta.label.toLowerCase()} belum tersedia`} body="Silakan hubungi kantor terdekat untuk informasi terbaru." action={<Action href="/kontak">Hubungi kami</Action>} />
          )}
        </Shell>
      </Band>
    </>
  )
}
