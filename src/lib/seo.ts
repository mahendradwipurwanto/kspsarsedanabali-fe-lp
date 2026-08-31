import type { Metadata } from 'next'
import { SITE } from '@/contracts'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/**
 * Single place where every page's metadata is assembled.
 *
 * The audit found titles that were too short, descriptions left empty, and no
 * canonicals. Routing every page through here means those three cannot regress:
 * a missing title falls back to a descriptive default rather than to nothing.
 */
const BRAND = 'KSP Sari Sedana Bali'
const TITLE_MAX = 65
const DESC_MAX = 158

/**
 * Compose the final title exactly once.
 *
 * The root layout defines a `%s | KSP Sari Sedana Bali` template. CMS-authored
 * titles often already end in the brand, which would produce
 * "… | KSP Sari Sedana Bali | KSP Sari Sedana Bali" and blow past the SERP
 * truncation limit. Returning an absolute title bypasses the template, and the
 * brand is appended here only when it is genuinely missing and there is room.
 */
function composeTitle(raw: string): string {
  const t = raw.trim().replace(/\s*[|·]\s*$/, '')
  if (t.toLowerCase().includes(BRAND.toLowerCase())) return t
  const withBrand = `${t} | ${BRAND}`
  return withBrand.length <= TITLE_MAX + BRAND.length ? withBrand : t
}

/** Hard clamp so no page can ship a description Google will cut mid-sentence. */
function clampDescription(raw: string): string {
  const d = raw.replace(/\s+/g, ' ').trim()
  if (d.length <= DESC_MAX) return d
  const cut = d.slice(0, DESC_MAX - 1)
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '))
  return `${cut.slice(0, lastBreak > DESC_MAX * 0.6 ? lastBreak : cut.length).trimEnd()}…`
}

export function buildMetadata(input: {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string | null
}): Metadata {
  const url = absoluteUrl(input.path)
  const image = input.image || absoluteUrl('/opengraph-image')
  const title = composeTitle(input.title)
  const description = clampDescription(input.description)

  return {
    // `absolute` opts out of the layout's title template — see composeTitle.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: {
      type: input.type ?? 'website',
      url,
      siteName: SITE.shortName,
      title,
      description,
      locale: 'id_ID',
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

/**
 * Meta description fallback chain. Never returns an empty string — an empty
 * description was one of the four critical findings in the technical audit.
 */
export function describe(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    const trimmed = c?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (trimmed && trimmed.length >= 50) return trimmed.length > 158 ? `${trimmed.slice(0, 155).trimEnd()}…` : trimmed
  }
  const first = candidates.find((c) => c?.trim())
  const base = first?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
  const filled = `${base}${base ? ' — ' : ''}KSP Sari Sedana Bali, koperasi simpan pinjam di Karangasem sejak 2002.`
  return filled.length > 158 ? `${filled.slice(0, 155).trimEnd()}…` : filled
}

/** Titles under ~30 chars rank poorly; pad short ones with locality context. */
export function titleFor(raw: string, context?: string): string {
  const t = raw.trim()
  if (t.length >= 30) return t
  return context ? `${t} — ${context}` : `${t} — KSP Sari Sedana Bali Karangasem`
}
