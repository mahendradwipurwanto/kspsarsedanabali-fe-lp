import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts, getFaqs } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, faqLd } from '@/lib/jsonld'
import { SAVINGS_TABLE_SLUGS, type SavingsTableSlug } from '@/contracts'
import { Shell, Band, Breadcrumbs, JsonLd, Heading, PageIntro } from '@/components/ui'
import { SimulationTabs } from '@/components/interactive/SimulationTabs'
import { Accordion } from '@/components/interactive/Accordion'

export const revalidate = 600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Simulasi Angsuran', path: '/simulasi' }]

export const metadata: Metadata = buildMetadata({
  title: 'Simulasi Angsuran & Hasil Simpanan Koperasi',
  description:
    'Hitung angsuran pinjaman dan hasil simpanan KSP Sari Sedana Bali. Tabel resmi SIGEMAS, SIMAPAN, dan SIPURA, lengkap dengan bunga dan reward yang berlaku.',
  path: '/simulasi',
})

export default async function SimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; produk?: string; nominal?: string; tenor?: string }>
}) {
  const [allLoans, savings, faqs, sp] = await Promise.all([
    getProducts('pinjaman'),
    getProducts('simpanan'),
    getFaqs(),
    searchParams,
  ])
  // The calculator runs on a signed-off rate where one exists, and otherwise on
  // the figure the koperasi already publishes, labelled as an unverified
  // estimate inside the result panel. Product pages stay strictly gated.
  const products = allLoans.filter((p) => (p.ratePercent ?? p.ratePercentIndicative) != null)
  const preselected = products.find((p) => p.slug === sp.produk)
  // A savings slug in the URL opens the savings side on that plan, so a product
  // page can link straight to its own table.
  const plan = SAVINGS_TABLE_SLUGS.find((slug) => slug === sp.produk)
  const tab = plan || sp.jenis === 'simpanan' ? 'simpanan' : 'pinjaman'
  const simFaqs = faqs.filter((f) => f.category === 'pinjaman' || f.category === 'simpanan')

  return (
    <>
      <JsonLd data={[breadcrumbLd(TRAIL), ...(simFaqs.length ? [faqLd(simFaqs)] : [])]} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Kalkulator"
        title="Simulasi Angsuran dan Hasil Simpanan"
        lead={<>Hitung angsuran pinjaman, atau lihat hasil simpanan SIGEMAS, SIMAPAN, dan SIPURA menurut tabel resmi koperasi. Belum tahu produk mana
              yang cocok?{' '}
              <Link href="/profiling" className="font-semibold text-green-700 underline underline-offset-4">
                Jawab 4 pertanyaan singkat
              </Link>
              .</>}
      />

      <Band>
        <Shell>
          <SimulationTabs
            loanProducts={products}
            savingsProducts={savings}
            initialTab={tab}
            initialPlan={plan as SavingsTableSlug | undefined}
            initialProductId={preselected?.id}
            initialAmount={sp.nominal ? Number(sp.nominal) : undefined}
            initialTenor={sp.tenor ? Number(sp.tenor) : undefined}
            disclaimer="Simulasi awal, bukan penawaran final. Angka resmi ditentukan setelah pengajuan dan survei oleh petugas."
          />
        </Shell>
      </Band>

      {simFaqs.length ? (
        <Band>
          <Shell>
            <div className="mx-auto max-w-3xl">
              <Heading label="Tanya jawab" title="Pertanyaan seputar pinjaman dan simpanan" align="center" />
              <Accordion items={simFaqs.map((f) => ({ title: f.question, body: `<p>${f.answer}</p>` }))} defaultOpen={-1} />
            </div>
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
