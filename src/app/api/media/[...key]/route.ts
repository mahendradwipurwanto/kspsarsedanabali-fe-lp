import { NextResponse, type NextRequest } from 'next/server'

/**
 * Image proxy.
 *
 * The Cloudeka bucket has no public-read policy yet (PROJECT-PLAN.md Blocker 4),
 * so public images are streamed through here with long-lived cache headers.
 * Once the bucket policy lands and STORAGE_PUBLIC_URL is set, the API stops
 * returning `/api/media/...` paths and this route goes quiet on its own.
 */

/** Nothing that failed may be remembered — see the retry note below. */
const failure = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: { 'cache-control': 'no-store' } })

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const objectKey = key.map(decodeURIComponent).join('/')

  // Private prefixes must never be reachable without a signed URL.
  if (objectKey.startsWith('cv/')) return failure(404, 'Not found')

  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return failure(500, 'Not configured')

  /**
   * One go at fetching the object, either from the cached signature or a fresh one.
   *
   * The signature is cached for 240s but only valid for 600s, and Next may
   * serve a cached entry as stale well past its revalidation window. When it
   * does, storage refuses a signature that expired minutes ago, and the browser
   * draws a broken image that only a manual "reload image" would repair. So a
   * refusal is retried once against a signature fetched with the cache
   * bypassed, which is the case that cannot be stale.
   *
   * The same retry covers a busy moment at the API — a cold connection pool
   * answering one signing request out of twenty with a 500 — which was the
   * other way a page full of thumbnails came up half-drawn.
   */
  async function attempt(fresh: boolean) {
    const signed = await fetch(`${api}/v1/public/media-url?key=${encodeURIComponent(objectKey)}`, {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 240 } }),
      signal: AbortSignal.timeout(5000),
    })
    if (!signed.ok) return null

    const { data } = (await signed.json()) as { data: { url: string } }
    const upstream = await fetch(data.url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    return upstream.ok && upstream.body ? upstream : null
  }

  try {
    const upstream = (await attempt(false).catch(() => null)) ?? (await attempt(true))
    if (!upstream) return failure(404, 'Not found')

    // Storage answers with chunked transfer and no content-length; an empty
    // content-length header made Node drop the body, so only forward it when set.
    const headers: Record<string, string> = {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      // The object key contains a ULID, so content at a given key never changes.
      'cache-control': 'public, max-age=31536000, immutable',
    }
    const length = upstream.headers.get('content-length')
    if (length) headers['content-length'] = length
    return new NextResponse(upstream.body, { headers })
  } catch {
    return failure(502, 'Upstream error')
  }
}
