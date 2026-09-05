import type { Metadata } from 'next'
import { SITE } from '@/contracts'
import { getSettings } from './api'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/**
 * Single place where every page's metadata is assembled.
 *
 * The audit found titles that were too short, descriptions left empty, and no
 * canonicals. Routing every page through here means those three cannot regress:
 * a missing title falls back to a descriptive default rather than to nothing.
 */
const BRAND_FALLBACK = 'KSP Sari Sedana Bali'

/**
 * The brand shown in page titles and og:site_name comes from the CMS, so
 * renaming the koperasi renames it everywhere. `getSettings` is a tagged,
 * cached fetch, so this costs nothing per page.
 */
async function titleSettings(): Promise<{ brand: string; template: string }> {
  try {
    const settings = await getSettings()
    const site = (settings.site ?? {}) as Record<string, string>
    const brand = (settings.brand ?? {}) as Record<string, string>
    const seo = (settings.seoDefaults ?? {}) as Record<string, string>
    const name = brand.name || site.name || BRAND_FALLBACK
    return { brand: name, template: seo.titleTemplate || `%s | ${name}` }
  } catch {
    return { brand: BRAND_FALLBACK, template: `%s | ${BRAND_FALLBACK}` }
  }
}
const TITLE_MAX = 65
const DESC_MAX = 158

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compose the final title exactly once.
 *
 * The pattern comes from Pengaturan → SEO and is applied here rather than by
 * the layout, because composing twice is what produced
 * "… | KSP Sari Sedana Bali | KSP Sari Sedana Bali"; the route returns an
 * absolute title, which opts out of the layout's own template.
 *
 * A CMS title usually ends in the brand already. That trailing brand is removed
 * before the pattern is applied, so the pattern still governs the title instead
 * of being skipped — skipping it meant an editor could change the pattern in the
 * console and see nothing happen on the pages that needed it most.
 */
function composeTitle(raw: string, brand: string, template: string): string {
  const t = raw.trim().replace(/\s*[|·]\s*$/, '')
  const core = brand ? t.replace(new RegExp(`[\\s|·—–-]*${escapeRe(brand)}\\s*$`, 'i'), '').trim() || t : t
  // The brand sits inside the title rather than at its end ("Lokasi Kantor KSP
  // Sari Sedana Bali di Karangasem"); appending it again would read badly.
  if (brand && core.toLowerCase().includes(brand.toLowerCase())) return t
  const composed = template.includes('%s') ? template.replace('%s', core) : `${core} | ${template}`
  return composed.length <= TITLE_MAX + brand.length ? composed : t
}

/** Hard clamp so no page can ship a description Google will cut mid-sentence. */
function clampDescription(raw: string): string {
  const d = raw.replace(/\s+/g, ' ').trim()
  if (d.length <= DESC_MAX) return d
  const cut = d.slice(0, DESC_MAX - 1)
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '))
  return `${cut.slice(0, lastBreak > DESC_MAX * 0.6 ? lastBreak : cut.length).trimEnd()}…`
}

export async function buildMetadata(input: {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string | null
}): Promise<Metadata> {
  const url = absoluteUrl(input.path)
  const image = input.image || absoluteUrl('/opengraph-image')
  const { brand, template } = await titleSettings()
  const title = composeTitle(input.title, brand, template)
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
      siteName: brand,
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
