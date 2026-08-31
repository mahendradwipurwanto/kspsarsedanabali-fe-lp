import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { SITE, NAV_MAIN } from '@/contracts'
import { getBranches, getSettings, getLegalPages } from '@/lib/api'
import { SITE_URL } from '@/lib/seo'
import { organizationLd, websiteLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageViewTracker } from '@/components/interactive/PageViewTracker'
import './globals.css'

/**
 * Plus Jakarta Sans — commissioned for the DKI Jakarta city identity, and the
 * closest match to the geometric wordmark in the cooperative's logo and to the
 * approved homepage design. Used for everything, headings included.
 *
 * next/font self-hosts it at build time: no runtime request to a font CDN, no
 * render-blocking stylesheet, and no layout shift from a fallback swap.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KSP Sari Sedana Bali — Koperasi Simpan Pinjam di Karangasem',
    template: '%s | KSP Sari Sedana Bali',
  },
  description: SITE.description,
  applicationName: SITE.shortName,
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  authors: [{ name: SITE.legalName }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: '/', types: { 'application/rss+xml': `${SITE_URL}/rss.xml` } },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined },
  category: 'finance',
}

export const viewport: Viewport = {
  themeColor: '#4e8b2c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [branches, settings, legalPages] = await Promise.all([getBranches(), getSettings(), getLegalPages()])
  const site = (settings.site ?? {}) as Record<string, string>
  const whatsapp = (site.whatsapp ?? '081337168194').replace(/\D/g, '').replace(/^0/, '62')
  const gaId = process.env.NEXT_PUBLIC_GA4_ID

  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL ?? ''} />
        <JsonLd data={[organizationLd(settings), websiteLd()]} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[100] focus:bg-green-700 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Langsung ke isi halaman
        </a>
        <Header
          nav={NAV_MAIN as unknown as { label: string; href: string; children?: { label: string; href: string }[] }[]}
          whatsapp={whatsapp}
          branches={branches.map((b) => ({ name: b.name, phone: b.phone ?? '' }))}
        />
        <main id="konten" className="flex-1">{children}</main>
        <Footer branches={branches} settings={settings} legalPages={legalPages} />
        <PageViewTracker />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  )
}
