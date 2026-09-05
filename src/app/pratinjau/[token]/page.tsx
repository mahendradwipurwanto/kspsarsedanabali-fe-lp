import type { Metadata } from 'next'
import Link from 'next/link'
import { getPreview } from '@/lib/api'
import { getBlockContext } from '@/lib/blocks-data'
import { Shell } from '@/components/ui'
import { BlockRenderer } from '@/components/blocks'

/**
 * Renders an editor's unsaved draft using the production components, so the
 * preview is the page rather than an impression of it. A CMS-side re-implementation
 * would drift from the real thing exactly when it matters — right before publishing.
 *
 * Never cached and never prerendered: the token is short-lived and each preview
 * is a distinct snapshot.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  // Belt and braces alongside the API's X-Robots-Tag. A draft must never be
  // indexed, and this page is reachable by anyone holding the link.
  return {
    title: 'Pratinjau halaman',
    robots: { index: false, follow: false, nocache: true },
  }
}

function Expired() {
  return (
    <Shell>
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="t-h2 text-ink-900">Tautan pratinjau sudah kedaluwarsa</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
          Tautan pratinjau hanya berlaku 30 menit. Buka halaman ini lagi dari CMS untuk membuat tautan baru.
        </p>
        <Link href="/" className="mt-8 inline-block text-[14px] font-semibold text-green-700 underline underline-offset-4">
          Kembali ke beranda
        </Link>
      </div>
    </Shell>
  )
}

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const page = await getPreview(token)
  if (!page) return <Expired />

  const ctx = await getBlockContext(page.blocks)

  return (
    <>
      {/* Unmistakable, and fixed so it survives scrolling — the whole risk of a
          pixel-accurate preview is mistaking it for the live site. */}
      <div className="sticky top-0 z-[60] bg-gold-300 px-4 py-2 text-center text-[12.5px] font-bold text-ink-900">
        Pratinjau · belum terbit · tautan berlaku 30 menit
      </div>

      <BlockRenderer
        blocks={page.blocks}
        ctx={ctx}
      />
    </>
  )
}
