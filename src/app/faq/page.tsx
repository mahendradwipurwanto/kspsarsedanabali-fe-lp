import type { Metadata } from 'next'
import { getFaqs } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, faqLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action, Icon , PageIntro } from '@/components/ui'
import { Accordion } from '@/components/interactive/Accordion'

export const revalidate = 3600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Tanya Jawab', path: '/faq' }]

const CATEGORY_LABELS: Record<string, string> = {
  umum: 'Umum',
  keanggotaan: 'Keanggotaan',
  simpanan: 'Simpanan',
  pinjaman: 'Pinjaman',
}

export async function generateMetadata(): Promise<Metadata> {
  return await buildMetadata({
  title: 'Tanya Jawab Seputar KSP Sari Sedana Bali',
  description:
    'Jawaban atas pertanyaan yang paling sering diajukan: cara menjadi anggota, syarat pinjaman, lama proses pencairan, keamanan simpanan, jam buka, dan lokasi kantor.',
  path: '/faq',
  })
}

export default async function FaqPage() {
  const faqs = await getFaqs()
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, f) => {
    const key = f.category ?? 'umum'
    ;(acc[key] ??= []).push(f)
    return acc
  }, {})

  return (
    <>
      {/* FAQPage markup can win an answer box for queries like
          "syarat pinjaman koperasi Karangasem". */}
      <JsonLd data={[breadcrumbLd(TRAIL), ...(faqs.length ? [faqLd(faqs)] : [])]} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Tanya Jawab"
        title="Pertanyaan yang Sering Diajukan"
        lead="Jawaban singkat untuk hal-hal yang paling sering ditanyakan calon anggota. Belum terjawab? Hubungi kantor terdekat."
      />

      <Band>
        <Shell>
          {faqs.length ? (
            <div className="mx-auto max-w-3xl space-y-10">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <h2 className="t-h3 mb-4">{CATEGORY_LABELS[category] ?? category}</h2>
                  <Accordion items={items.map((f) => ({ title: f.question, body: `<p>${f.answer}</p>` }))} defaultOpen={-1} />
                </div>
              ))}

              <div className="surface-dark relative overflow-hidden p-7 text-center text-white sm:p-8">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/60 to-transparent" />
                <h2 className="t-h3 !text-white">Masih ada yang ingin ditanyakan?</h2>
                <p className="mt-2 text-[15px] text-white/65">Petugas kami siap membantu lewat telepon, WhatsApp, atau di kantor cabang terdekat.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Action href="/kontak" variant="light">Hubungi kami <Icon.arrow className="size-4" /></Action>
                  <Action href="/lokasi" variant="ghostLight">Lihat kantor terdekat</Action>
                </div>
              </div>
            </div>
          ) : (
            <Blank title="Belum ada tanya jawab" body="Daftar pertanyaan sedang disusun." action={<Action href="/kontak">Hubungi kami</Action>} />
          )}
        </Shell>
      </Band>
    </>
  )
}
