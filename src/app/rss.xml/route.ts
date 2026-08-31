import { getPosts } from '@/lib/api'
import { absoluteUrl, SITE_URL } from '@/lib/seo'
import { SITE } from '@/contracts'

export const revalidate = 600

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The root layout advertises this feed in `alternates.types`, so it has to
 * exist — a declared feed that 404s is a crawl error, not a missing nicety.
 */
export async function GET() {
  const res = await getPosts({ limit: 30 })
  const posts = res?.data ?? []
  const updated = posts[0]?.publishedAt ?? new Date().toISOString()

  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/berita/${post.slug}`)
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
      ${post.excerpt ? `<description>${escape(post.excerpt)}</description>` : ''}
      ${post.categoryName ? `<category>${escape(post.categoryName)}</category>` : ''}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(SITE.shortName)} — Berita</title>
    <link>${SITE_URL}</link>
    <description>${escape(SITE.description)}</description>
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
