import { NextResponse, type NextRequest } from 'next/server'

/**
 * Database-driven redirects for the WordPress migration.
 *
 * Keeping the map in the `redirects` table rather than `next.config.ts` means the
 * koperasi can add a redirect from the CMS without a deploy — important during
 * the weeks after launch when 404s surface in Search Console.
 *
 * The table is fetched once per edge instance and cached; a miss simply falls
 * through to normal routing, so a slow API can never take the site down.
 */
interface Redirect { fromPath: string; toPath: string; statusCode: number }

let cache: { at: number; rules: Map<string, Redirect> } | null = null
const TTL_MS = 5 * 60_000

async function loadRedirects(): Promise<Map<string, Redirect>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/public/redirects`, {
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 300, tags: ['redirects'] },
    })
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { data: Redirect[] }
    const rules = new Map(json.data.map((r) => [r.fromPath.replace(/\/$/, '') || '/', r]))
    cache = { at: Date.now(), rules }
    return rules
  } catch {
    return cache?.rules ?? new Map()
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/$/, '') || '/'

  const rules = await loadRedirects()
  const rule = rules.get(path)
  if (!rule) return NextResponse.next()

  // Guard against a self-redirect. A row where from === to would otherwise loop
  // until the browser gives up, taking the page down completely.
  if ((rule.toPath.replace(/\/$/, '') || '/') === path && rule.statusCode !== 410) {
    return NextResponse.next()
  }

  // 410 Gone tells Google to drop the URL rather than keep retrying it. Used for
  // the old WordPress admin paths flagged in the security audit.
  if (rule.statusCode === 410) {
    return new NextResponse('Halaman ini sudah tidak tersedia.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
    })
  }

  const destination = rule.toPath.startsWith('http') ? rule.toPath : new URL(rule.toPath, req.url).toString()
  return NextResponse.redirect(destination, rule.statusCode === 302 ? 302 : 301)
}

export const config = {
  // Skip static assets and Next internals — they can never be redirect targets.
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff2?)$).*)'],
}
