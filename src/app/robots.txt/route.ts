import { AI_CRAWLERS, DEFAULT_SEO_TECH, type SeoTechSettings } from '@/contracts'
import { getSettings } from '@/lib/api'
import { absoluteUrl } from '@/lib/seo'

export const revalidate = 600

/**
 * robots.txt, assembled from Pengaturan → SEO.
 *
 * Written by hand rather than through Next's `robots.ts` helper because that
 * helper models only the directives it knows about, and this file has to carry
 * whatever the koperasi's own SEO consultant asks for — the "baris tambahan"
 * box goes through verbatim.
 *
 * The three built-in Disallow rules stay whatever the console says: result
 * pages carry a visitor's own answers, /pratinjau serves unpublished drafts by
 * token, and neither is an editor's decision to reverse from a settings form.
 */
export async function GET() {
  const settings = await getSettings()
  const seo: SeoTechSettings = { ...DEFAULT_SEO_TECH, ...((settings.seoTech ?? {}) as Partial<SeoTechSettings>) }

  const lines: string[] = []

  if (!seo.indexable) {
    // Closed to everyone, and nothing else in the file matters: announcing a
    // sitemap of pages nobody may fetch would only be contradictory.
    lines.push('User-agent: *', 'Disallow: /')
  } else {
    const clean = (list: unknown) =>
      (Array.isArray(list) ? list : [])
        .map((p) => String(p ?? '').trim())
        .filter((p) => p.startsWith('/') || p.startsWith('*'))

    lines.push('User-agent: *')
    for (const path of ['/', ...clean(seo.robotsAllow)]) lines.push(`Allow: ${path}`)
    for (const path of ['/profiling/hasil', '/pratinjau/', '/api/', '/_next/', '/*?utm_*', ...clean(seo.robotsDisallow)]) {
      lines.push(`Disallow: ${path}`)
    }
    if (seo.crawlDelay > 0) lines.push(`Crawl-delay: ${Math.round(seo.crawlDelay)}`)

    // The model trainers and answer engines, named one agent per group: a
    // wildcard rule does not reach them, and several read only their own
    // section.
    const blocked =
      seo.aiCrawlers === 'block'
        ? AI_CRAWLERS.map((c) => c.agent)
        : seo.aiCrawlers === 'custom'
          ? AI_CRAWLERS.map((c) => c.agent).filter((a) => (seo.aiCrawlersBlocked ?? []).includes(a))
          : []

    for (const agent of blocked) lines.push('', `User-agent: ${agent}`, 'Disallow: /')

    if (seo.sitemapEnabled && seo.sitemapInRobots) lines.push('', `Sitemap: ${absoluteUrl('/sitemap.xml')}`)
  }

  const extra = String(seo.robotsExtra ?? '').trim()
  if (extra) lines.push('', extra)

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
