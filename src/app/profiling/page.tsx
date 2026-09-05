import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 3600

const SLUG = 'profiling'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Cari Produk yang Cocok', path: '/profiling' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Cari Produk Koperasi yang Cocok',
    description: describe(page?.seo?.metaDescription),
    path: '/profiling',
  })
}

export default async function ProfilingPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman profiling belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/produk">Lihat produk</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/profiling' })

  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
