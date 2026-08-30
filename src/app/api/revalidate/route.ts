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

  // Next 16 requires a cacheLife profile; `max` expires the entry immediately
  // rather than waiting out the remaining ISR window.
  for (const tag of tags) revalidateTag(tag, 'max')
  for (const path of paths) revalidatePath(path)

  // A page publish should also refresh the homepage lists that embed it.
  if (tags.some((t) => t.startsWith('post:') || t === 'posts')) revalidatePath('/')
  if (tags.includes('sitemap')) revalidatePath('/sitemap.xml')

  return NextResponse.json({ revalidated: true, tags, paths, at: Date.now() })
}
