import type { Metadata } from 'next'
import { getPage, getProducts, getBranches, getPosts, getStats, getTestimonials, getDocuments, getSettings } from '@/lib/api'
import { buildMetadata, describe } from '@/lib/seo'
import { BlockRenderer } from '@/components/blocks'
import { Blank, Shell, Band } from '@/components/ui'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('home')
  return await buildMetadata({
    title: page?.seo?.metaTitle || 'KSP Sari Sedana Bali — Koperasi Simpan Pinjam di Karangasem',
    description: describe(page?.seo?.metaDescription),
    path: '/',
  })
}

export default async function HomePage() {
  const [page, products, branches, postsRes, stats, testimonials, documents, settings] = await Promise.all([
    getPage('home'),
    getProducts(),
    getBranches(),
    getPosts({ limit: 3 }),
    getStats(),
    getTestimonials(6),
    getDocuments(),
    getSettings(),
  ])

  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank
            title="Konten beranda belum tersedia"
            body="Halaman ini dikelola dari dashboard admin dan akan tampil setelah diterbitkan."
          />
        </Shell>
      </Band>
    )
  }

  return (
    <BlockRenderer
      blocks={page.blocks}
      ctx={{ products, branches, posts: postsRes?.data ?? [], stats, testimonials, documents, settings }}
    />
  )
}
