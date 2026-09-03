import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts, getFaqs } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, faqLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Heading, Card, Tile, Icon, PageIntro, Blank, Action } from '@/components/ui'
import { SimulationCalculator } from '@/components/interactive/SimulationCalculator'
import { Accordion } from '@/components/interactive/Accordion'

export const revalidate = 600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Simulasi Angsuran', path: '/simulasi' }]

export const metadata: Metadata = buildMetadata({
  title: 'Simulasi Angsuran Pinjaman Koperasi',
  description:
    'Hitung perkiraan angsuran bulanan pinjaman KSP Sari Sedana Bali. Pilih produk, geser nominal, dan tentukan jangka waktu untuk melihat estimasi cicilan Anda.',
  path: '/simulasi',
})

export default async function SimulationPage({ searchParams }: { searchParams: Promise<{ produk?: string; nominal?: string; tenor?: string }> }) {
  const [allLoans, faqs, sp] = await Promise.all([getProducts('pinjaman'), getFaqs(), searchParams])
  // The calculator runs on a signed-off rate where one exists, and otherwise on
  // the figure the koperasi already publishes, labelled as an unverified
  // estimate inside the result panel. Product pages stay strictly gated.
  const products = allLoans.filter((p) => (p.ratePercent ?? p.ratePercentIndicative) != null)
  const preselected = products.find((p) => p.slug === sp.produk)
  const loanFaqs = faqs.filter((f) => f.category === 'pinjaman')

  return (
    <>
      <JsonLd data={[breadcrumbLd(TRAIL), ...(loanFaqs.length ? [faqLd(loanFaqs)] : [])]} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Kalkulator"
        title="Simulasi Angsuran Pinjaman KSP Sari Sedana Bali"
        lead={<>Pilih produk, tentukan nominal dan jangka waktu, lalu lihat perkiraan angsuran bulanan Anda seketika. Belum tahu produk mana
              yang cocok?{' '}
              <Link href="/profiling" className="font-semibold text-green-700 underline underline-offset-4">
                Jawab 4 pertanyaan singkat
              </Link>
              .</>}
      />

      <Band>
        <Shell>
          {products.length ? (
            <SimulationCalculator
              products={products}
              initialProductId={preselected?.id}
              initialAmount={sp.nominal ? Number(sp.nominal) : undefined}
              initialTenor={sp.tenor ? Number(sp.tenor) : undefined}
              disclaimer="Simulasi awal, bukan penawaran final. Angka resmi ditentukan setelah pengajuan dan survei oleh petugas."
            />
          ) : (
            <Blank
              title="Simulasi belum tersedia"
              body="Suku bunga terbaru sedang dikonfirmasi pengurus koperasi. Hubungi kantor terdekat dan petugas kami akan menghitungkan angsuran yang berlaku saat ini."
              action={<Action href="/kontak">Hubungi kami</Action>}
            />
          )}
        </Shell>
      </Band>

      {/* Three parallel definitions read as a row, not a stack beside an
          unrelated accordion — the old two-column split left both halves ragged. */}
      <Band tone="alt">
        <Shell>
          <Heading
            label="Metode bunga"
            title="Cara membaca hasil simulasi"
            lead="Angsuran yang sama besarnya bisa dihitung dengan tiga cara. Metode yang dipakai selalu tertera di panel hasil."
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {[
              { n: '01', title: 'Bunga flat', body: 'Bunga dihitung dari pokok pinjaman awal, tetap sepanjang masa angsuran. Angsuran bulanan sama besar setiap bulan.' },
              { n: '02', title: 'Anuitas', body: 'Angsuran bulanan tetap, tetapi porsi bunga mengecil dan porsi pokok membesar seiring waktu.' },
              { n: '03', title: 'Efektif menurun', body: 'Bunga dihitung dari sisa pokok, sehingga angsuran mengecil setiap bulan. Total bunga paling ringan.' },
            ].map((item) => (
              <Card as="li" key={item.title} hover className="p-5 sm:p-6">
                <Tile tone="dark" size="sm"><span className="tnum text-[12px] font-bold text-gold-300">{item.n}</span></Tile>
                <h3 className="t-h3 mt-4">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{item.body}</p>
              </Card>
            ))}
          </ul>

          <Card className="relative mt-4 overflow-hidden p-5 pl-6">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-gold-300" />
            <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-600">
              <Icon.info className="mt-0.5 size-4 shrink-0" />
              Hasil simulasi ini adalah perkiraan awal. Nominal angsuran resmi ditentukan setelah proses pengajuan, verifikasi berkas,
              dan survei oleh petugas koperasi.
            </p>
          </Card>
        </Shell>
      </Band>

      {loanFaqs.length ? (
        <Band>
          <Shell>
            <div className="mx-auto max-w-3xl">
              <Heading label="Tanya jawab" title="Pertanyaan seputar pinjaman" align="center" />
              <Accordion items={loanFaqs.map((f) => ({ title: f.question, body: `<p>${f.answer}</p>` }))} defaultOpen={-1} />
            </div>
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
