import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import {
  SITE, NAV_MAIN, DEFAULT_HEADER, DEFAULT_FOOTER, DEFAULT_BRAND, DEFAULT_FOOTER_MENU,
  DEFAULT_ANALYTICS, DEFAULT_SEO_TECH, GA_ID_RULE,
  type MenuItem, type HeaderSettings, type FooterSettings, type BrandSettings,
  type AnalyticsSettings, type SeoTechSettings,
} from '@/contracts'
import { getBranches, getSettings, getLegalPages, getMenu } from '@/lib/api'
import { SITE_URL } from '@/lib/seo'
import { organizationLd, websiteLd, extraLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/ui'
import { TagManager, TagManagerNoScript } from '@/components/TagManager'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
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

/**
 * Site-wide metadata from the CMS: the koperasi's name, description and SEO
 * defaults are editable, so this is generated per request rather than frozen
 * into a constant at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const site = (settings.site ?? {}) as Record<string, string>
  const seo = (settings.seoDefaults ?? {}) as Record<string, string>
  const seoTech: SeoTechSettings = { ...DEFAULT_SEO_TECH, ...((settings.seoTech ?? {}) as Partial<SeoTechSettings>) }
  const name = site.name || SITE.shortName
  const legalName = site.legalName || SITE.legalName

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.defaultTitle || `${name} — Koperasi Simpan Pinjam di Karangasem`,
      template: seo.titleTemplate || `%s | ${name}`,
    },
    description: seo.defaultDescription || site.description || SITE.description,
    applicationName: name,
    icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
    authors: [{ name: legalName }],
    creator: legalName,
    publisher: legalName,
    formatDetection: { telephone: true, address: true, email: true },
    alternates: {
      canonical: '/',
      // Advertised only while the feed is on; a declared feed that answers 410
      // is a crawl error rather than a nicety.
      ...(seoTech.rssEnabled ? { types: { 'application/rss+xml': `${SITE_URL}/rss.xml` } } : {}),
    },
    // One switch in the console closes the whole site: robots.txt refuses the
    // crawl and every page carries noindex, because a page already in the index
    // is only removed by the meta tag, never by robots.txt alone.
    robots: seoTech.indexable
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
        }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined },
    category: 'finance',
  }
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

  const analytics: AnalyticsSettings = { ...DEFAULT_ANALYTICS, ...((settings.analytics ?? {}) as Partial<AnalyticsSettings>) }
  const seoTech: SeoTechSettings = { ...DEFAULT_SEO_TECH, ...((settings.seoTech ?? {}) as Partial<SeoTechSettings>) }
  // The container id from the console wins; the build-time variable stays as
  // the fallback so nothing goes dark the moment this ships. GA4 only loads on
  // its own when no container is set — inside GTM, the container owns it, and
  // both at once double-counts every page view.
  const gtmId = analytics.gtmId || process.env.NEXT_PUBLIC_GTM_ID || ''
  const rawGaId = gtmId ? '' : analytics.gaId || process.env.NEXT_PUBLIC_GA4_ID || ''
  // Checked before it reaches a script tag, for the same reason the container
  // id is: it comes from a text box someone else fills in.
  const gaId = GA_ID_RULE.test(rawGaId) ? rawGaId : ''

  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL ?? ''} />
        {seoTech.schemaEnabled ? (
          <JsonLd
            data={[
              organizationLd(settings),
              ...(seoTech.schemaWebsite ? [websiteLd(settings)] : []),
              ...extraLd(settings),
            ]}
          />
        ) : null}
        <TagManager id={gtmId} consentMode={analytics.consentMode} dataLayer={analytics.dataLayer} />
      </head>
      <body className={`flex min-h-screen flex-col ${header.showBottomNav && header.bottomNav.length >= 2 ? 'pb-14 md:pb-0' : ''}`}>
        <TagManagerNoScript id={gtmId} />
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
        {header.showBottomNav ? <MobileNav items={header.bottomNav} /> : null}
        <PageViewTracker />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  )
}
