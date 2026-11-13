import { DEFAULT_SEO_TECH, SITE, type SeoTechSettings } from '@/contracts'
import { getPosts, getSettings } from '@/lib/api'
import { absoluteUrl, SITE_URL } from '@/lib/seo'

export const revalidate = 600

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Text that is not markup, wrapped so a feed reader takes the HTML as HTML. */
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

/**
 * The news feed, shaped by Pengaturan → SEO.
 *
 * The root layout advertises this feed in `alternates.types`, so it has to
 * exist — a declared feed that 404s is a crawl error, not a missing nicety.
 * Turned off in the console it answers 410 Gone, which is what tells an
 * aggregator to stop asking rather than to retry tomorrow.
 */
export async function GET() {
  const settings = await getSettings()
  const seo: SeoTechSettings = { ...DEFAULT_SEO_TECH, ...((settings.seoTech ?? {}) as Partial<SeoTechSettings>) }

  if (!seo.rssEnabled) {
    return new Response('Feed dinonaktifkan.', { status: 410, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  const limit = Math.min(Math.max(Math.round(seo.rssLimit) || 30, 1), 50)
  const res = await getPosts({ limit, full: seo.rssFullContent })
  const posts = res?.data ?? []
  const updated = posts[0]?.publishedAt ?? new Date().toISOString()

  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/berita/${post.slug}`)
      // The whole article when the console asks for it, so a reader that renders
      // the feed shows the piece rather than a teaser and a link.
      const body = seo.rssFullContent && post.content ? post.content : post.excerpt
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
      ${body ? `<description>${seo.rssFullContent && post.content ? cdata(body) : escape(body)}</description>` : ''}
      ${post.categoryName ? `<category>${escape(post.categoryName)}</category>` : ''}
    </item>`
    })
    .join('\n')

  const site = (settings.site ?? {}) as Record<string, string>
  const name = seo.rssTitle || `${site.name || SITE.shortName} — Berita`
  const description = seo.rssDescription || site.description || SITE.description

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(name)}</title>
    <link>${SITE_URL}</link>
    <description>${escape(description)}</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
