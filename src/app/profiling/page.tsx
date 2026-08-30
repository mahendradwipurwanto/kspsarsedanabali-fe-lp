import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getProducts, getBranches } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd } from '@/components/ui'
import { ProfilingWizard } from '@/components/interactive/ProfilingWizard'

export const revalidate = 3600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Cari Produk yang Cocok', path: '/profiling' }]

export const metadata: Metadata = buildMetadata({
  title: 'Cari Produk Koperasi yang Cocok',
  description:
    'Jawab 4 pertanyaan singkat dan KSP Sari Sedana Bali menunjukkan produk simpanan atau pinjaman yang paling sesuai, lengkap dengan simulasi angsuran. Tanpa daftar akun.',
  path: '/profiling',
})

export default async function ProfilingPage() {
  const [products, branches] = await Promise.all([getProducts(), getBranches()])

  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />

      <Band tone="alt">
        <Shell>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-green-600">PANDUAN CEPAT</p>
            <h1 className="t-h1 text-navy-800">
              Temukan Produk yang Paling Sesuai untuk Anda
            </h1>
            <p className="t-lead mt-5">
              Empat pertanyaan singkat, sekitar 30 detik. Kami tunjukkan produk yang cocok beserta perkiraan angsurannya.
            </p>
          </div>

          <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse  bg-slate-200" />}>
            <ProfilingWizard products={products} branches={branches} />
          </Suspense>
        </Shell>
      </Band>
    </>
  )
}
