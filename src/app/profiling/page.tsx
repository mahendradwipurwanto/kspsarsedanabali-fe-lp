import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getProducts, getBranches } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, PageIntro } from '@/components/ui'
import { ProfilingWizard } from '@/components/interactive/ProfilingWizard'

export const revalidate = 3600

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Cari Produk yang Cocok', path: '/profiling' }]

export async function generateMetadata(): Promise<Metadata> {
  return await buildMetadata({
  title: 'Cari Produk Koperasi yang Cocok',
  description:
    'Jawab 4 pertanyaan singkat dan KSP Sari Sedana Bali menunjukkan produk simpanan atau pinjaman yang paling sesuai, lengkap dengan simulasi angsuran. Tanpa daftar akun.',
  path: '/profiling',
  })
}

export default async function ProfilingPage() {
  const [products, branches] = await Promise.all([getProducts(), getBranches()])

  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Panduan cepat"
        title="Temukan Produk yang Paling Sesuai untuk Anda"
        lead="Empat pertanyaan singkat, sekitar 30 detik. Kami tunjukkan produk yang cocok beserta perkiraan angsurannya."
      />

      <Band tone="alt">
        <Shell>
          <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-ink-100" />}>
            <ProfilingWizard products={products} branches={branches} />
          </Suspense>
        </Shell>
      </Band>
    </>
  )
}
