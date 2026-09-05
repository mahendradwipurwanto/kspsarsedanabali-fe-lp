import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 600

/**
 * The two category pages are CMS pages like the rest, edited in Halaman →
 * Produk Simpanan and Produk Pinjaman. The route maps its segment to a slug and
 * supplies the breadcrumb and structured data; every heading, paragraph and
 * search-result snippet comes from the console.
 *
 * They used to carry their copy in this file, interest rates included, which
 * meant a rate could change at the koperasi and stay wrong on the site until
 * someone edited the code.
 */
const CATEGORIES = {
  simpanan: { label: 'Simpanan', slug: 'produk-simpanan' },
  pinjaman: { label: 'Pinjaman', slug: 'produk-pinjaman' },
} as const

type Category = keyof typeof CATEGORIES

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const meta = CATEGORIES[category as Category]
  if (!meta) {
    return await buildMetadata({ title: 'Produk tidak ditemukan', description: 'Halaman produk yang Anda cari tidak tersedia.', path: '/produk', noindex: true })
  }

  const page = await getPage(meta.slug)
  return await buildMetadata({
    title: page?.seo?.metaTitle || page?.title || `Produk ${meta.label} KSP Sari Sedana Bali`,
    description: describe(page?.seo?.metaDescription),
    path: `/produk/${category}`,
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const meta = CATEGORIES[category as Category]
  if (!meta) notFound()

  const page = await getPage(meta.slug)
  const trail = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/produk' }, { name: meta.label, path: `/produk/${category}` }]

  if (!page) {
    return (
      <>
        <Breadcrumbs trail={trail} />
        <Band>
          <Shell>
            <Blank
              title={`Halaman produk ${meta.label.toLowerCase()} belum tersedia`}
              body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan."
              action={<Action href="/kontak">Hubungi kami</Action>}
            />
          </Shell>
        </Band>
      </>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: `/produk/${category}` })
  const listed = ctx.products.filter((p) => p.category === category)

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(trail),
          itemListLd(listed.map((p) => ({ name: p.name, path: `/produk/${category}/${p.slug}` })), `Produk ${meta.label}`),
        ]}
      />
      <Breadcrumbs trail={trail} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
