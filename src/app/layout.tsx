import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import {
  SITE, NAV_MAIN, DEFAULT_HEADER, DEFAULT_FOOTER, DEFAULT_BRAND, DEFAULT_FOOTER_MENU,
  type MenuItem, type HeaderSettings, type FooterSettings, type BrandSettings,
} from '@/contracts'
import { getBranches, getSettings, getLegalPages, getMenu } from '@/lib/api'
import { SITE_URL } from '@/lib/seo'
import { organizationLd, websiteLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageViewTracker } from '@/components/interactive/PageViewTracker'
import './globals.css'

/**
 * Plus Jakarta Sans — the closest match to the geometric wordmark in the
 * cooperative's logo. One family for everything, headings included; the
 * figures are the same face with tabular numerals turned on.
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
  themeColor: '#0f1b2d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

/** A settings group merged over its defaults, so a half-filled form never blanks the site. */
const group = <T extends object>(raw: unknown, defaults: T): T =>
  ({ ...defaults, ...((raw && typeof raw === 'object' ? raw : {}) as Partial<T>) })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [branches, settings, legalPages, mainMenu, footerMenu] = await Promise.all([
    getBranches(),
    getSettings(),
    getLegalPages(),
    getMenu('main'),
    getMenu('footer'),
  ])

  const site = (settings.site ?? {}) as Record<string, string>
  const header = group<HeaderSettings>(settings.header, DEFAULT_HEADER)
  const footer = group<FooterSettings>(settings.footer, DEFAULT_FOOTER)
  const brand = group<BrandSettings>(settings.brand, { ...DEFAULT_BRAND, name: site.name || DEFAULT_BRAND.name, tagline: site.tagline || DEFAULT_BRAND.tagline })
  const legal = (Array.isArray(settings.legal) ? settings.legal : SITE.legal) as { label: string; value: string; date: string }[]
  const social = (settings.social ?? {}) as Record<string, string>
  // Menus fall back to the shipped defaults only when nothing has ever been saved.
  const nav = (mainMenu.length ? mainMenu : NAV_MAIN) as MenuItem[]
  const footerLinks = (footerMenu.length ? footerMenu : DEFAULT_FOOTER_MENU) as MenuItem[]

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
          nav={nav}
          header={header}
          brand={brand}
          whatsapp={whatsapp}
          branches={branches.map((b) => ({ name: b.name, phone: b.phone ?? '' }))}
        />
        <main id="konten" className="flex-1">{children}</main>
        <Footer
          branches={branches}
          menu={footerLinks}
          footer={footer}
          brand={brand}
          site={site}
          legal={legal}
          social={social}
          legalPages={legalPages}
        />
        <PageViewTracker />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  )
}
