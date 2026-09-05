import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

/**
 * Cache-bust hook called by the API whenever content is published.
 *
 * This is what makes "terbitkan" in the CMS feel instant while everything else
 * stays statically cached — the koperasi's team sees their edit live within
 * seconds, without the site paying a per-request rendering cost.
 */
/** CMS pages whose route is not `/<slug>`. */
const PAGE_ROUTES: Record<string, string> = {
  '/': '/',
  home: '/',
  'produk-simpanan': '/produk/simpanan',
  'produk-pinjaman': '/produk/pinjaman',
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: string[]; paths?: string[] }
  const tags = body.tags ?? []
  const paths = body.paths ?? []

  for (const tag of tags) revalidateTag(tag, 'max')
  for (const path of paths) revalidatePath(path)

  // A page's own route is revalidated by path as well as by tag.
  //
  // Tags reach the routes that were rendered ahead of time, but a page an
  // editor created is rendered on demand, and there the tagged fetch entry
  // survived `revalidateTag` — the API answered 404 for a deleted page while
  // the site went on serving it from cache. Only the affected route is named:
  // revalidating the whole layout instead fixed that case and made every other
  // edit slower to appear, which is the thing this hook exists to prevent.
  for (const tag of tags) {
    if (!tag.startsWith('page:')) continue
    const slug = tag.slice(5)
    revalidatePath(PAGE_ROUTES[slug] ?? `/${slug}`)
  }

  // A page publish should also refresh the homepage lists that embed it.
  if (tags.some((t) => t.startsWith('post:') || t === 'posts')) revalidatePath('/')
  if (tags.includes('sitemap')) revalidatePath('/sitemap.xml')

  return NextResponse.json({ revalidated: true, tags, paths, at: Date.now() })
}
