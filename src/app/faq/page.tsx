import type { Metadata } from 'next'
import { getPage } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { buildMetadata, describe } from '@/lib/seo'
import { breadcrumbLd, faqLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

export const revalidate = 3600

const SLUG = 'faq'
const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Tanya Jawab', path: '/faq' }]

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  return buildMetadata({
    title: page?.seo?.metaTitle || page?.title || 'Tanya Jawab Seputar KSP Sari Sedana Bali',
    description: describe(page?.seo?.metaDescription),
    path: '/faq',
  })
}

export default async function FaqPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <Band>
        <Shell>
          <Blank title="Halaman tanya jawab belum tersedia" body="Halaman ini dikelola dari konsol dan akan tampil setelah diterbitkan." action={<Action href="/kontak">Hubungi kami</Action>} />
        </Shell>
      </Band>
    )
  }

  const ctx = await getBlockContext(page.blocks, { basePath: '/faq' })
  const faqs = ctx.faqs ?? []

  return (
    <>
      {/* FAQPage markup can win an answer box for queries like
          "syarat pinjaman koperasi Karangasem". */}
      <JsonLd data={[breadcrumbLd(TRAIL), ...(faqs.length ? [faqLd(faqs)] : [])]} />
      <Breadcrumbs trail={TRAIL} />
      <BlockRenderer blocks={page.blocks} ctx={ctx} />
    </>
  )
}
