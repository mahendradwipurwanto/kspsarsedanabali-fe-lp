import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
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
  const page = await getPage('home')

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

  const ctx = await getBlockContext(page.blocks)

  return <BlockRenderer blocks={page.blocks} ctx={ctx} />
}
