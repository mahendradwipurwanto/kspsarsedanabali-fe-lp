import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 3600

const SLUG = 'laporan-keuangan'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Laporan Keuangan', path: '/laporan-keuangan' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Laporan Keuangan & Kinerja KSP Sari Sedana Bali',
    description: describe(page?.seo?.metaDescription),
    path: '/laporan-keuangan',
  })
}

export default async function FinancialReportsPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman laporan belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/kontak">Hubungi kami</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/laporan-keuangan' })

  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
