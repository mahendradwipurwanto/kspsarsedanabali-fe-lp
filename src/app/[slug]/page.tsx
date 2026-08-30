import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPage, getProducts, getBranches, getPosts, getStats, getTestimonials, getDocuments, getSettings } from '@/lib/api'
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
  if (!page) return buildMetadata({ title: 'Halaman tidak ditemukan', description: 'Halaman yang Anda cari tidak tersedia.', path: `/${slug}`, noindex: true })

  return buildMetadata({
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

  const [products, branches, postsRes, stats, testimonials, documents, settings] = await Promise.all([
    getProducts(),
    getBranches(),
    getPosts({ limit: 3 }),
    getStats(),
    getTestimonials(6),
    getDocuments(),
    getSettings(),
  ])

  const trail = [{ name: 'Beranda', path: '/' }, { name: page.title, path: `/${page.slug}` }]

  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <Breadcrumbs trail={trail} />
      <BlockRenderer blocks={page.blocks} ctx={{ products, branches, posts: postsRes?.data ?? [], stats, testimonials, documents, settings }} />
    </>
  )
}
