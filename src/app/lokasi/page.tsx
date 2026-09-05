import type { Metadata } from 'next'
import { getBranches } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, localBusinessLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd , PageIntro } from '@/components/ui'
import { BranchFinder } from '@/components/interactive/BranchFinder'

export const revalidate = 3600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Lokasi Kantor', path: '/lokasi' }]

export async function generateMetadata(): Promise<Metadata> {
  return await buildMetadata({
  title: 'Lokasi Kantor KSP Sari Sedana Bali di Karangasem',
  description:
    'Tiga kantor KSP Sari Sedana Bali di Karangasem: Kantor Pusat Selat, Cabang Rendang, dan Cabang Karangasem. Lihat alamat, jam buka, nomor telepon, dan petunjuk arah.',
  path: '/lokasi',
  })
}

export default async function LocationsPage() {
  const branches = await getBranches()

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(TRAIL),
          itemListLd(branches.map((b) => ({ name: b.name, path: `/lokasi/${b.slug}` })), 'Kantor KSP Sari Sedana Bali'),
          ...branches.map(localBusinessLd),
        ]}
      />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Lokasi Kantor"
        title="Temukan Kantor KSP Sari Sedana Bali Terdekat"
        lead="Tiga kantor kami tersebar di Kabupaten Karangasem. Izinkan lokasi Anda dan kami urutkan dari yang paling dekat, lengkap dengan
              status buka-tutup dan petunjuk arah."
      />

      <Band>
        <Shell>
          <BranchFinder branches={branches} />
        </Shell>
      </Band>
    </>
  )
}
