import type { Metadata } from 'next'
import { getDocuments, getStats } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Tile, Icon, Blank, Action, Heading, PageIntro, Stat } from '@/components/ui'

export const revalidate = 3600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Laporan Keuangan', path: '/laporan-keuangan' }]

export async function generateMetadata(): Promise<Metadata> {
  return await buildMetadata({
  title: 'Laporan Keuangan & Kinerja KSP Sari Sedana Bali',
  description:
    'Transparansi kinerja KSP Sari Sedana Bali: laporan keuangan tahunan, hasil Rapat Anggota Tahunan, dan ringkasan pencapaian koperasi di Karangasem.',
  path: '/laporan-keuangan',
  })
}

export default async function FinancialReportsPage() {
  const [documents, stats] = await Promise.all([getDocuments(), getStats()])
  const reports = documents.filter((d) => d.category === 'keuangan' || d.category === 'laporan')

  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Transparansi"
        title="Laporan Keuangan KSP Sari Sedana Bali"
        lead="Sebagai koperasi yang dipercaya menyalurkan dana pemerintah dari LPDB-KUMKM dan PIP Kementerian Keuangan, kami membuka kinerja
              keuangan kepada anggota dan masyarakat."
      />

      {stats.length ? (
        <Band>
          <Shell>
            <Heading title="Ringkasan Kinerja" lead="Angka-angka pokok yang menggambarkan posisi koperasi saat ini." />
            <div className="surface overflow-hidden">
              <ul className="grid grid-cols-2 divide-y divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
                {stats.map((stat, i) => (
                  <li key={stat.id} className={`p-5 lg:p-6 ${i % 2 === 1 ? 'border-l border-line sm:border-l-0' : ''}`}>
                    <Stat value={stat.value} label={stat.label} />
                  </li>
                ))}
              </ul>
            </div>
          </Shell>
        </Band>
      ) : null}

      <Band tone="alt">
        <Shell>
          <Heading title="Dokumen Laporan" lead="Unduh laporan tahunan dan hasil Rapat Anggota Tahunan." />
          {reports.length ? (
            <ul className="grid gap-3">
              {reports.map((doc) => (
                <li key={doc.id}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="surface surface-i group/doc flex items-center justify-between gap-4 p-4 sm:p-5">
                    <span className="flex min-w-0 items-center gap-4">
                      <Tile tone="outline"><Icon.fileText className="size-5" /></Tile>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-ink-900 transition-colors group-hover/doc:text-green-700">{doc.title}</span>
                        {doc.year ? <span className="tnum mt-0.5 block text-[13px] text-ink-400">Tahun buku {doc.year}</span> : null}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-green-700">
                      Unduh PDF
                      <Icon.download className="size-4" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <Blank
              title="Dokumen belum tersedia"
              body="Laporan keuangan akan diunggah setelah disahkan dalam Rapat Anggota Tahunan. Anggota dapat meminta salinannya di kantor."
              action={<Action href="/kontak">Hubungi kami</Action>}
            />
          )}
        </Shell>
      </Band>
    </>
  )
}
