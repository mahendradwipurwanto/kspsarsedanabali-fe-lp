import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Heading, Breadcrumbs, JsonLd, Action, Icon, Blank , PageIntro } from '@/components/ui'
import { ProductRow } from '@/components/ProductCard'

export const revalidate = 600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/produk' }]

export const metadata: Metadata = buildMetadata({
  title: 'Produk Simpanan & Pinjaman KSP Sari Sedana Bali',
  description:
    'Lihat seluruh produk KSP Sari Sedana Bali: simpanan berjangka SIJAKOP, SIMAPAN, SIPURA, SIGEMAS, serta pinjaman bunga murah, mikro, pensiunan, dan Pinjaman 1 Pohon.',
  path: '/produk',
})

export default async function ProductsPage() {
  const products = await getProducts()
  const simpanan = products.filter((p) => p.category === 'simpanan')
  const pinjaman = products.filter((p) => p.category === 'pinjaman')

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(TRAIL),
          itemListLd(products.map((p) => ({ name: p.name, path: `/produk/${p.category}/${p.slug}` })), 'Produk KSP Sari Sedana Bali'),
        ]}
      />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Layanan Kami"
        title="Produk Simpanan dan Pinjaman untuk Warga Karangasem"
        lead={<>Sembilan produk untuk kebutuhan menabung maupun pembiayaan usaha. Belum yakin yang mana?{' '}
              <Link href="/profiling" className="font-semibold text-green-700 underline underline-offset-4">
                Jawab 4 pertanyaan singkat
              </Link>{' '}
              dan kami tunjukkan yang paling sesuai.</>}
      />

      {pinjaman.length ? (
        <Band id="pinjaman">
          <Shell>
            <Heading
              label="PEMBIAYAAN"
              title="Produk Pinjaman"
              lead="Pembiayaan untuk modal usaha, renovasi rumah, pendidikan, upacara adat, dan kebutuhan lainnya."
              action={
                <Action href="/simulasi" variant="outline" className="self-start sm:self-auto">
                  Hitung simulasi angsuran <Icon.arrow />
                </Action>
              }
            />
            <ul className="grid gap-3">
              {pinjaman.map((p, i) => (
                <ProductRow key={p.id} product={p} index={i + 1} />
              ))}
            </ul>
          </Shell>
        </Band>
      ) : null}

      {simpanan.length ? (
        <Band tone="alt" id="simpanan">
          <Shell>
            <Heading label="MENABUNG" title="Produk Simpanan" lead="Simpanan berjangka maupun harian, dengan imbal hasil yang kompetitif dan dana yang aman." />
            <ul className="grid gap-3">
              {simpanan.map((p, i) => (
                <ProductRow key={p.id} product={p} index={i + 1} />
              ))}
            </ul>
          </Shell>
        </Band>
      ) : null}

      {!products.length ? (
        <Band>
          <Shell>
            <Blank title="Produk belum tersedia" body="Daftar produk sedang diperbarui oleh tim koperasi." action={<Action href="/kontak">Hubungi kami</Action>} />
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
