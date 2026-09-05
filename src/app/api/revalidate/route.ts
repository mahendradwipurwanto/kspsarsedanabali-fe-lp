import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

/**
 * Cache-bust hook called by the API whenever content is published.
 *
 * This is what makes "terbitkan" in the CMS feel instant while everything else
 * stays statically cached — the koperasi's team sees their edit live within
 * seconds, without the site paying a per-request rendering cost.
 */
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

  // Tags alone were not enough. A page deleted in the console went on being
  // served from the data cache — the API answered 404 while the site still
  // rendered the page at its own URL — because the tagged fetch entry survived
  // `revalidateTag`, and Next 16 has no single-argument form to fall back on.
  // Revalidating the root layout expires every route under it, which is correct
  // whatever changed; on a site of this size the cost is one re-render per page
  // on its next visit, and only when an editor actually saves something.
  if (tags.length) revalidatePath('/', 'layout')

  // A page publish should also refresh the homepage lists that embed it.
  if (tags.some((t) => t.startsWith('post:') || t === 'posts')) revalidatePath('/')
  if (tags.includes('sitemap')) revalidatePath('/sitemap.xml')

  return NextResponse.json({ revalidated: true, tags, paths, at: Date.now() })
}
