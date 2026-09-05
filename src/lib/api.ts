import 'server-only'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

export const REVALIDATE_SECONDS = 300

/**
 * Server-side fetch against the API with ISR tags.
 *
 * Tags let the CMS bust exactly the pages a publish affected (`revalidateTag`),
 * so content appears immediately while everything else stays statically cached.
 */
/**
 * A render must never wait on the API long, because a visitor is watching. A
 * build can afford to: the shared cluster occasionally takes longer than the
 * API's own 15s statement timeout to answer even a nine-row query, and giving
 * up at 8s there just fails the build over a slow moment.
 */
const API_TIMEOUT_MS = 8000
const BUILD_TIMEOUT_MS = 20_000

/**
 * True only while `next build` is prerendering. The distinction matters: at
 * build time a failed fetch becomes a page baked into the deployment, so it has
 * to stop the build; at request time the same failure should degrade quietly and
 * be retried on the next revalidation.
 */
const isBuilding = process.env.NEXT_PHASE === 'phase-production-build'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Backoff between attempts. Longer during a build, where the cost of giving up
 *  is a failed deploy rather than one slow page. */
const RETRY_DELAYS_MS = [600, 2500, 6000]

/**
 * Server-side fetch against the API with ISR tags.
 *
 * A 404 means the row genuinely is not there and returns null, which callers
 * turn into a not-found page. Anything else — 5xx, a timeout, a dead socket —
 * is an upstream fault and must never be mistaken for "this product does not
 * exist": doing so once baked permanent 404s for nine real products into a
 * build that still reported success. So a fault is retried once, and if it
 * persists it throws during a build and returns null at request time.
 */
export async function apiGet<T>(
  path: string,
  opts: { tags?: string[]; revalidate?: number; throwOn404?: boolean } = {},
): Promise<T | null> {
  const url = `${API}/v1/public${path}`
  let lastFault = ''
  const attempts = isBuilding ? 4 : 2
  const timeout = isBuilding ? BUILD_TIMEOUT_MS : API_TIMEOUT_MS

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1] ?? 6000)
    try {
      const res = await fetch(url, {
        next: { tags: opts.tags ?? [], revalidate: opts.revalidate ?? REVALIDATE_SECONDS },
        headers: { accept: 'application/json' },
        // Without this a stalled API hangs the page render and the production
        // build indefinitely, instead of degrading to the empty state.
        signal: AbortSignal.timeout(timeout),
      })
      if (res.status === 404) return null
      if (res.ok) return (await res.json()) as T
      lastFault = `HTTP ${res.status}`
    } catch (err) {
      lastFault = (err as Error).message
    }
  }

  const message = `API fault for ${path}: ${lastFault}`
  if (isBuilding) {
    // Fail the build rather than ship a page whose content silently vanished.
    throw new Error(`${message} — refusing to prerender against a failing API.`)
  }
  console.error(message)
  return null
}

export interface Branch {
  id: string; name: string; slug: string; type: string; address: string
  village?: string | null; district?: string | null; regency: string; province: string
  phone?: string | null; whatsapp?: string | null; email?: string | null
  latitude: number; longitude: number; mapsUrl?: string | null; image?: string
  hours: { day: number; opensAt: string | null; closesAt: string | null }[]
  seo: Record<string, string>
}

export interface Product {
  id: string; name: string; slug: string; category: 'simpanan' | 'pinjaman'
  tagline?: string | null; summary?: string | null; description?: string | null
  benefits: string[]; requirements: string[]; image?: string
  rateMethod: 'flat' | 'annuity' | 'effective' | 'none'
  ratePercent?: number | null; rateNote?: string | null
  /**
   * The figure on record, whether or not the koperasi has signed it off. Only
   * the installment calculator may read these, and only while labelling the
   * result an unverified estimate — everything that presents terms as fact uses
   * the gated `ratePercent` / `rateMethod` above.
   */
  ratePercentIndicative?: number | null
  rateMethodIndicative?: 'flat' | 'annuity' | 'effective' | 'none'
  minAmount?: number | null; maxAmount?: number | null
  tenorOptions: number[]; purposes: string[]
  /** False until the koperasi signs the figures off; the API blanks the rate. */
  isVerified: boolean
  seo: Record<string, string>
}

export interface Post {
  id: string; title: string; slug: string; excerpt?: string | null; content?: string | null
  coverImage?: string; publishedAt: string | null; readMinutes: number
  categoryName?: string | null; categorySlug?: string | null
  seo: Record<string, string>
}

export interface Job {
  id: string; title: string; slug: string; department?: string | null
  employmentType: string; location?: string | null; description?: string | null
  requirements: string[]; closesAt: string | null; branchName?: string | null
  branchAddress?: string | null; createdAt: string; seo: Record<string, string>
}

export interface Block { id: string; type: string; props: Record<string, unknown>; isVisible: boolean }

/** A page as it stands in the CMS editor right now, including unsaved changes. */
export interface PreviewPage { title: string; slug: string; seo: Record<string, string>; blocks: Block[] }
export interface Page { id: string; title: string; slug: string; seo: Record<string, string>; blocks: Block[]; updatedAt: string }
export interface Stat { id: string; label: string; value: string; icon?: string | null }
export interface Testimonial { id: string; name: string; role?: string | null; location?: string | null; quote: string; rating: number; avatar?: string }
export interface Faq { id: string; question: string; answer: string; category?: string | null }
export interface DocumentItem { id: string; title: string; category: string; year?: number | null; url: string; fileSize?: number | null }

type Wrapped<T> = { data: T }
type Paged<T> = { data: T; meta: { page: number; limit: number; total: number; totalPages: number } }

export const getPage = (slug: string) =>
  // Tagged with `pages` as well as the slug: the home page is fetched as
  // "home" but stored with slug "/", so a slug-only tag never matched it and
  // publishing the home page left the cached copy in place.
  apiGet<Wrapped<Page>>(`/pages/${slug}`, { tags: [`page:${slug}`, 'pages'] }).then((r) => r?.data ?? null)

export const getProducts = (category?: string, limit = 50) =>
  apiGet<Wrapped<Product[]>>(`/products?category=${category ?? 'all'}&limit=${limit}`, { tags: ['products'] }).then((r) => r?.data ?? [])

export const getProduct = (slug: string) =>
  apiGet<{ data: Product; related: Product[] }>(`/products/${slug}`, { tags: [`product:${slug}`, 'products'] })

export const getBranches = () => apiGet<Wrapped<Branch[]>>('/branches', { tags: ['branches'] }).then((r) => r?.data ?? [])

export const getBranch = (slug: string) =>
  apiGet<Wrapped<Branch>>(`/branches/${slug}`, { tags: [`branch:${slug}`, 'branches'] }).then((r) => r?.data ?? null)

export const getPosts = (params: { page?: number; limit?: number; category?: string } = {}) =>
  apiGet<Paged<Post[]>>(
    `/posts?page=${params.page ?? 1}&limit=${params.limit ?? 9}${params.category ? `&category=${params.category}` : ''}`,
    { tags: ['posts'] },
  )

export const getPost = (slug: string) =>
  apiGet<{ data: Post; related: Post[] }>(`/posts/${slug}`, { tags: [`post:${slug}`, 'posts'] })

export const getJobs = () => apiGet<Wrapped<Job[]>>('/jobs', { tags: ['jobs'] }).then((r) => r?.data ?? [])
export const getJob = (slug: string) => apiGet<Wrapped<Job>>(`/jobs/${slug}`, { tags: [`job:${slug}`, 'jobs'] }).then((r) => r?.data ?? null)
export const getStats = () => apiGet<Wrapped<Stat[]>>('/stats', { tags: ['stats'] }).then((r) => r?.data ?? [])
export const getTestimonials = (limit = 12) =>
  apiGet<Wrapped<Testimonial[]>>(`/testimonials?limit=${limit}`, { tags: ['testimonials'] }).then((r) => r?.data ?? [])
export const getFaqs = () => apiGet<Wrapped<Faq[]>>('/faqs', { tags: ['faqs'] }).then((r) => r?.data ?? [])
export const getDocuments = (category?: string) =>
  apiGet<Wrapped<DocumentItem[]>>(`/documents${category ? `?category=${category}` : ''}`, { tags: ['documents'] }).then((r) => r?.data ?? [])
export const getSettings = () => apiGet<Wrapped<Record<string, unknown>>>('/settings', { tags: ['settings'] }).then((r) => r?.data ?? {})
export const getMenu = (key: string) => apiGet<Wrapped<unknown[]>>(`/menus/${key}`, { tags: ['menus'] }).then((r) => r?.data ?? [])

export const getSitemapData = () =>
  apiGet<Wrapped<{
    pages: { slug: string; updatedAt: string }[]
    products: { slug: string; category: string; updatedAt: string }[]
    posts: { slug: string; updatedAt: string }[]
    branches: { slug: string; updatedAt: string }[]
    jobs: { slug: string; updatedAt: string }[]
  }>>('/sitemap-data', { revalidate: 600 }).then((r) => r?.data ?? null)

/**
 * Published CMS pages that are not backed by a fixed route — the footer's legal
 * row is built from these, so a link only appears once the page really exists.
 */
export const getLegalPages = async () => {
  const data = await getSitemapData()
  if (!data) return []
  const FIXED = new Set(['/', 'tentang-kami', 'kontak'])
  const TITLES: Record<string, string> = {
    'kebijakan-privasi': 'Kebijakan Privasi',
    'syarat-ketentuan': 'Syarat & Ketentuan',
  }
  return data.pages
    .filter((pg) => !FIXED.has(pg.slug) && pg.slug in TITLES)
    .map((pg) => ({ slug: pg.slug, title: TITLES[pg.slug]! }))
}

/**
 * Fetch an editor's unsaved draft by preview token.
 *
 * Deliberately uncached and never retried into a build failure: a preview is a
 * short-lived, per-request thing, and an expired token is a normal outcome that
 * the route turns into a "link expired" page rather than an error.
 */
export async function getPreview(token: string): Promise<PreviewPage | null> {
  try {
    const res = await fetch(`${API}/v1/public/preview/${encodeURIComponent(token)}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const body = (await res.json()) as Wrapped<PreviewPage>
    return body?.data ?? null
  } catch {
    return null
  }
}

export const apiBase = API
