import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, localBusinessLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 3600

const SLUG = 'lokasi'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Lokasi Kantor', path: '/lokasi' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Lokasi Kantor KSP Sari Sedana Bali di Karangasem',
    description: describe(page?.seo?.metaDescription),
    path: '/lokasi',
  })
}

export default async function LocationsPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman lokasi belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/kontak">Hubungi kami</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/lokasi' })

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(TRAIL),
          itemListLd(ctx.branches.map((b) => ({ name: b.name, path: `/lokasi/${b.slug}` })), 'Kantor KSP Sari Sedana Bali'),
          ...ctx.branches.map(localBusinessLd),
        ]}
      />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
