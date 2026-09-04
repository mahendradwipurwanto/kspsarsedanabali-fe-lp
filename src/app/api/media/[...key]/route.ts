import { NextResponse, type NextRequest } from 'next/server'

/**
 * Image proxy.
 *
 * The Cloudeka bucket has no public-read policy yet (PROJECT-PLAN.md Blocker 4),
 * so public images are streamed through here with long-lived cache headers.
 * Once the bucket policy lands and STORAGE_PUBLIC_URL is set, the API stops
 * returning `/api/media/...` paths and this route goes quiet on its own.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const objectKey = key.map(decodeURIComponent).join('/')

  // Private prefixes must never be reachable without a signed URL.
  if (objectKey.startsWith('cv/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const signed = await fetch(`${api}/v1/public/media-url?key=${encodeURIComponent(objectKey)}`, {
      next: { revalidate: 240 },
      signal: AbortSignal.timeout(5000),
    })
    if (!signed.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data } = (await signed.json()) as { data: { url: string } }
    const upstream = await fetch(data.url, { signal: AbortSignal.timeout(15000) })
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  }
}
