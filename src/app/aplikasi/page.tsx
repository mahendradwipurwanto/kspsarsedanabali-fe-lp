import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/api'
import { appSettings, isCrawler, platformOf, storeFor } from '@/lib/apps'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Label } from '@/components/ui'
import { StoreBadges } from '@/components/AppDownload'
import { DeepLinkOpener } from '@/components/interactive/DeepLinkOpener'

/**
 * The smart link: one address for brochures and QR codes.
 *
 * It reads the phone and sends it to its own store; a desktop, a crawler or a
 * device whose store is not set gets a page with every badge instead. Rendered
 * per request because the answer depends on the user agent.
 */
export const dynamic = 'force-dynamic'

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Unduh Aplikasi', path: '/aplikasi' }]

export async function generateMetadata(): Promise<Metadata> {
  const apps = appSettings(await getSettings())
  return buildMetadata({
    title: `Unduh ${apps.appName}`,
    description: `Pasang ${apps.appName} dari App Store atau Google Play: cek saldo, ajukan pinjaman, dan pantau angsuran dari ponsel.`,
    path: '/aplikasi',
  })
}

export default async function AppLinkPage() {
  const [settings, h] = await Promise.all([getSettings(), headers()])
  const apps = appSettings(settings)
  const userAgent = h.get('user-agent') ?? ''
  const store = storeFor(platformOf(userAgent), apps)
  const send = apps.autoRedirect && Boolean(store) && !isCrawler(userAgent)

  // Without a deep link there is nothing for the browser to try first.
  if (send && !apps.deepLink.trim()) redirect(store)

  const hasStore = Boolean(apps.appStoreUrl.trim() || apps.playStoreUrl.trim())

  return (
    <>
      {send ? <DeepLinkOpener deepLink={apps.deepLink.trim()} fallback={store} /> : null}
      <JsonLd data={breadcrumbLd(TRAIL)} />
      <Breadcrumbs trail={TRAIL} />
      <Band>
        <Shell>
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center"><Label>Aplikasi</Label></div>
            <h1 className="t-h1 mt-3">{apps.appName}</h1>
            <p className="t-lead mt-4">
              {send
                ? 'Membuka aplikasi… Bila tidak terbuka dalam beberapa detik, pilih toko di bawah.'
                : hasStore ? apps.note : 'Aplikasi sedang disiapkan dan belum tersedia di toko. Silakan kembali lagi nanti.'}
            </p>
            {hasStore ? <StoreBadges apps={apps} mode="stores" on="light" className="mt-8 justify-center" /> : null}
          </div>
        </Shell>
      </Band>
    </>
  )
}
