import type { MetadataRoute } from 'next'
import { DEFAULT_SEO_TECH, type SeoTechSettings } from '@/contracts'
import { getSettings, getSitemapData } from '@/lib/api'
import { absoluteUrl } from '@/lib/seo'

export const revalidate = 600

/**
 * Sitemap generated from the database, so a page published in the CMS appears
 * here within the revalidation window without anyone touching a file.
 * `lastModified` is the real row timestamp — Google ignores fabricated dates.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings()
  const seo: SeoTechSettings = { ...DEFAULT_SEO_TECH, ...((settings.seoTech ?? {}) as Partial<SeoTechSettings>) }

  // Switched off in the console, the file is served empty rather than removed:
  // a 404 on a URL already announced to Google reads as a broken site, an empty
  // <urlset> reads as "nothing to crawl right now".
  if (!seo.sitemapEnabled) return []

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/tentang-kami'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/produk'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/produk/simpanan'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/produk/pinjaman'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/simulasi'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/lokasi'), changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/berita'), changeFrequency: 'daily', priority: 0.7 },
    { url: absoluteUrl('/karir'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/laporan-keuangan'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/faq'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/kontak'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/aplikasi'), changeFrequency: 'monthly', priority: 0.5 },
    // Legal pages are NOT hardcoded here. They are ordinary CMS pages and reach
    // the sitemap through `data.pages` below once published — listing them
    // unconditionally put two 404s in the sitemap.
  ]

  /**
   * CMS pages whose route is not `/<slug>`.
   *
   * The two product categories are edited as pages but live under /produk, and
   * their slugs are redirect sources left over from WordPress. Emitting the slug
   * put a URL in the sitemap that answers 301.
   */
  const ROUTE_BY_SLUG: Record<string, string> = {
    '/': '/',
    home: '/',
    'produk-simpanan': '/produk/simpanan',
    'produk-pinjaman': '/produk/pinjaman',
  }
  const covered = new Set(staticEntries.map((e) => e.url))

  const data = await getSitemapData()
  if (!data) return staticEntries

  // Each collection is listed only if the console asks for it. A koperasi that
  // has emptied its careers page would rather not advertise it.
  const dynamic: MetadataRoute.Sitemap = [
    ...(seo.sitemapProducts ? data.products : []).map((p) => ({
      url: absoluteUrl(`/produk/${p.category}/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...(seo.sitemapBranches ? data.branches : []).map((b) => ({
      url: absoluteUrl(`/lokasi/${b.slug}`),
      lastModified: new Date(b.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...(seo.sitemapPosts ? data.posts : []).map((p) => ({
      url: absoluteUrl(`/berita/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...(seo.sitemapJobs ? data.jobs : []).map((j) => ({
      url: absoluteUrl(`/karir/${j.slug}`),
      lastModified: new Date(j.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    // CMS pages, at the route they actually answer on and only once: a page
    // already listed above would otherwise appear twice.
    ...(seo.sitemapPages ? data.pages : [])
      .map((p) => ({ page: p, url: absoluteUrl(ROUTE_BY_SLUG[p.slug] ?? `/${p.slug}`) }))
      .filter(({ url }) => !covered.has(url))
      .map(({ page, url }) => ({
        url,
        lastModified: new Date(page.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
  ]

  return [...staticEntries, ...dynamic]
}
