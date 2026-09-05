import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Breadcrumbs, JsonLd } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 300

/**
 * Catch-all for pages built in the CMS.
 *
 * Fixed routes (/produk, /berita, …) take precedence in the App Router, so this
 * only ever handles slugs the koperasi created themselves.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return await buildMetadata({ title: 'Halaman tidak ditemukan', description: 'Halaman yang Anda cari tidak tersedia.', path: `/${slug}`, noindex: true })

  return await buildMetadata({
    title: page.seo?.metaTitle || page.title,
    description: describe(page.seo?.metaDescription),
    path: `/${page.slug}`,
    noindex: Boolean(page.seo?.noindex),
  })
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const ctx = await getBlockContext(page.blocks)

  const trail = [{ name: 'Beranda', path: '/' }, { name: page.title, path: `/${page.slug}` }]

  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <Breadcrumbs trail={trail} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
