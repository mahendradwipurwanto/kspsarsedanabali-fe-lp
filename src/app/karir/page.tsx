import type { Metadata } from 'next'
import Link from 'next/link'
import { getJobs } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, itemListLd, jobPostingLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Card, Pill, Icon, Blank, Action , PageIntro } from '@/components/ui'

export const revalidate = 600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Karir', path: '/karir' }]

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  internship: 'Magang',
}

export const metadata: Metadata = buildMetadata({
  title: 'Lowongan Kerja KSP Sari Sedana Bali di Karangasem',
  description:
    'Peluang karir di KSP Sari Sedana Bali, koperasi simpan pinjam di Karangasem. Lihat lowongan yang tersedia dan kirim lamaran Anda secara online.',
  path: '/karir',
})

export default async function CareersPage() {
  const jobs = await getJobs()

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

      <PageIntro
        label="Karir"
        title="Bergabung dan Bertumbuh Bersama Kami"
        lead="KSP Sari Sedana Bali telah melayani anggota di Karangasem sejak 2002. Kami mencari orang-orang yang ingin ikut membangun
              ekonomi kerakyatan di daerahnya sendiri."
      />

      <Band>
        <Shell>
          {jobs.length ? (
            <ul className="grid gap-4">
              {jobs.map((job) => (
                <Card as="li" key={job.id} className="group p-6 transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        <Pill tone="green">{TYPE_LABELS[job.employmentType] ?? job.employmentType}</Pill>
                        {job.department ? <Pill tone="quiet">{job.department}</Pill> : null}
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-navy-800">
                        <Link href={`/karir/${job.slug}`} className="group-hover:text-green-700">{job.title}</Link>
                      </h2>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
                        <Icon.pin className="size-4 text-slate-400" />
                        {job.location ?? job.branchName ?? 'Karangasem, Bali'}
                      </p>
                    </div>
                    <Action href={`/karir/${job.slug}`} variant="outline" className="shrink-0 self-start sm:self-auto">
                      Lihat & Lamar <Icon.arrow />
                    </Action>
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <Blank
              title="Belum ada lowongan saat ini"
              body="Belum ada posisi yang dibuka. Silakan cek kembali secara berkala atau kirim lamaran spontan ke kantor kami."
              action={<Action href="/kontak">Hubungi kami</Action>}
            />
          )}
        </Shell>
      </Band>
    </>
  )
}
