import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getJob, getJobs } from '@/lib/api'
import { buildMetadata, describe, titleFor } from '@/lib/seo'
import { breadcrumbLd, jobPostingLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Card, Pill, Icon } from '@/components/ui'
import { JobApplicationForm } from '@/components/interactive/JobApplicationForm'

export const revalidate = 600

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Penuh Waktu', part_time: 'Paruh Waktu', contract: 'Kontrak', internship: 'Magang',
}

export async function generateStaticParams() {
  const jobs = await getJobs()
  return jobs.map((j) => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const job = await getJob(slug)
  if (!job) return buildMetadata({ title: 'Lowongan tidak ditemukan', description: 'Lowongan yang Anda cari tidak tersedia.', path: `/karir/${slug}`, noindex: true })

  return buildMetadata({
    title: job.seo?.metaTitle || titleFor(`Lowongan ${job.title}`, `${job.location ?? 'Karangasem'} — KSP Sari Sedana Bali`),
    description: describe(
      job.seo?.metaDescription,
      `Lowongan ${job.title} di KSP Sari Sedana Bali, ${job.location ?? 'Karangasem'}. ${job.requirements.slice(0, 3).join('. ')}. Kirim lamaran online sekarang.`,
    ),
    path: `/karir/${job.slug}`,
  })
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const job = await getJob(slug)
  if (!job) notFound()

  const trail = [{ name: 'Beranda', path: '/' }, { name: 'Karir', path: '/karir' }, { name: job.title, path: `/karir/${job.slug}` }]

  return (
    <>
      {/* JobPosting makes this eligible for Google Jobs, which the old site never was. */}
      <JsonLd data={[breadcrumbLd(trail), jobPostingLd(job)]} />
      <Breadcrumbs trail={trail} />

      <Band>
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Pill tone="green">{TYPE_LABELS[job.employmentType] ?? job.employmentType}</Pill>
                {job.department ? <Pill tone="quiet">{job.department}</Pill> : null}
              </div>

              <h1 className="t-h1 text-ink-900">{job.title}</h1>

              <p className="mt-3 flex items-center gap-1.5 text-ink-600">
                <Icon.pin className="size-4 text-ink-400" />
                {job.location ?? job.branchName ?? 'Karangasem, Bali'}
              </p>

              {job.description ? (
                <div className="prose-ksp mt-8" dangerouslySetInnerHTML={{ __html: job.description }} />
              ) : null}

              {job.requirements.length ? (
                <div className="mt-8">
                  <h2 className="t-h3">Kualifikasi</h2>
                  <ul className="mt-4 space-y-2.5">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex gap-3 text-ink-700">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] bg-ink-900 text-gold-300">
                          <Icon.check className="size-3.5" />
                        </span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {job.closesAt ? (
                <Card className="relative mt-8 overflow-hidden p-4 pl-5">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-gold-300" />
                  <p className="tnum flex items-center gap-2 text-[13.5px] font-medium text-ink-700">
                    <Icon.calendar className="size-4" />
                    Lamaran ditutup {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(job.closesAt))}
                  </p>
                </Card>
              ) : null}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <JobApplicationForm jobId={job.id} jobTitle={job.title} />
            </div>
          </div>
        </Shell>
      </Band>
    </>
  )
}
