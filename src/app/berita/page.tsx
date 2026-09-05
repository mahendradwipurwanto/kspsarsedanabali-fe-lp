import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 300

const SLUG = 'berita'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Berita', path: '/berita' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Berita & Informasi Terbaru KSP Sari Sedana Bali',
    description: describe(page?.seo?.metaDescription),
    path: '/berita',
  })
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [page, sp] = await Promise.all([getPage(SLUG), searchParams])
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman berita belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/">Kembali ke beranda</Action>} />
        </Shell>
      </Band>
    )
  }

  const current = Math.max(Number(sp.page ?? 1) || 1, 1)
  const ctx = await getBlockContext(page.blocks, { page: current, basePath: '/berita' })

  return (
    <>
      <JsonLd data={[breadcrumbLd(TRAIL), itemListLd(ctx.posts.map((p) => ({ name: p.title, path: `/berita/${p.slug}` })), 'Berita KSP Sari Sedana Bali')]} />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
