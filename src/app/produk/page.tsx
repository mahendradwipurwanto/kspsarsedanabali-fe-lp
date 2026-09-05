import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 600

const SLUG = 'produk'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/produk' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Produk Simpanan & Pinjaman KSP Sari Sedana Bali',
    description: describe(page?.seo?.metaDescription),
    path: '/produk',
  })
}

/**
 * The product index is a CMS page like any other: its sections, order and copy
 * are edited in Halaman → Produk. The route only supplies the data those blocks
 * ask for, the breadcrumb and the structured data.
 */
export default async function ProductsPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank
            title="Halaman produk belum tersedia"
            body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan."
            action={<Action href="/kontak">Hubungi kami</Action>}
          />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/produk' })

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(TRAIL),
          itemListLd(ctx.products.map((p) => ({ name: p.name, path: `/produk/${p.category}/${p.slug}` })), 'Produk KSP Sari Sedana Bali'),
        ]}
      />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
