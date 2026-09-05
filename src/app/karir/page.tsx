import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, itemListLd, jobPostingLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 600

const SLUG = 'karir'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Karir', path: '/karir' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Lowongan Kerja KSP Sari Sedana Bali di Karangasem',
    description: describe(page?.seo?.metaDescription),
    path: '/karir',
  })
}

export default async function CareersPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman karir belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/kontak">Hubungi kami</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/karir' })
  const jobs = ctx.jobs ?? []

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(TRAIL),
          itemListLd(jobs.map((j) => ({ name: j.title, path: `/karir/${j.slug}` })), 'Lowongan KSP Sari Sedana Bali'),
          ...jobs.map(jobPostingLd),
        ]}
      />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
