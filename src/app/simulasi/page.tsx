import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, faqLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 600

const SLUG = 'simulasi'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Simulasi Angsuran', path: '/simulasi' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Simulasi Angsuran & Hasil Simpanan Koperasi',
    description: describe(page?.seo?.metaDescription),
    path: '/simulasi',
  })
}

export default async function SimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; produk?: string; nominal?: string; tenor?: string }>
}) {
  const [page, sp] = await Promise.all([getPage(SLUG), searchParams])
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman simulasi belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/kontak">Hubungi kami</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/simulasi', query: sp })
  const faqs = (ctx.faqs ?? []).filter((f) => f.category === 'pinjaman' || f.category === 'simpanan')

  return (
    <>
      <JsonLd data={[breadcrumbLd(TRAIL), ...(faqs.length ? [faqLd(faqs)] : [])]} />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
