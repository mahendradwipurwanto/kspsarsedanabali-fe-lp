import {
  getBranches, getDocumentCategories, getDocuments, getFaqs, getJobs, getPosts, getProducts, getPublishedFeedback, getSettings, getSimulations, getStats, getTestimonials,
} from './api'
import type { BlockContext } from '@/components/blocks'

interface BlockLike { type: string; props: Record<string, unknown>; isVisible: boolean }

/** Which records each block needs, so a page fetches only what it draws. */
const NEEDS: Record<string, (keyof Needs)[]> = {
  hero_banner: ['products'],
  quick_access: [],
  legality_bar: [],
  branch_contact_strip: ['branches'],
  stats_counter: ['stats'],
  product_grid: ['products'],
  news_list: ['posts'],
  post_index: ['posts'],
  testimonial_slider: ['testimonials'],
  lead_form: ['products', 'branches'],
  feedback_form: ['branches', 'publishedFeedback'],
  branch_finder: ['branches'],
  contact_cards: ['branches'],
  document_list: ['documents', 'documentCategories'],
  org_chart: ['settings'],
  job_list: ['jobs'],
  faq_index: ['faqs'],
  simulation_calculator: ['simulations'],
  simulation_tabs: ['simulations'],
  profiling_wizard: ['products', 'branches'],
  media_text: [],
  steps: [],
  timeline: [],
  video_embed: [],
  logo_cloud: [],
  app_download: ['settings'],
}

interface Needs {
  products: boolean
  simulations: boolean
  branches: boolean
  posts: boolean
  stats: boolean
  testimonials: boolean
  publishedFeedback: boolean
  documents: boolean
  documentCategories: boolean
  settings: boolean
  jobs: boolean
  faqs: boolean
}

/**
 * Load exactly the data a page's blocks ask for.
 *
 * Every route renders whatever the editor put on the page, so the data cannot
 * be decided by the route. Reading it from the block list keeps a page that
 * shows only text from fetching nine collections it never draws.
 */
export async function getBlockContext(
  blocks: BlockLike[],
  opts: {
    page?: number
    basePath?: string
    query?: BlockContext['query']
  } = {},
): Promise<BlockContext> {
  const need = {} as Needs
  for (const block of blocks) {
    if (!block.isVisible) continue
    for (const key of NEEDS[block.type] ?? []) need[key] = true
  }
  // Settings feed the org chart and are cheap and shared; always load them.
  need.settings = true

  const postIndex = blocks.find((b) => b.type === 'post_index' && b.isVisible)
  const perPage = typeof postIndex?.props.perPage === 'number' ? postIndex.props.perPage : 9
  const newsList = blocks.find((b) => b.type === 'news_list' && b.isVisible)
  const teaserLimit = typeof newsList?.props.limit === 'number' ? newsList.props.limit : 3
  // The block's own limit, not a constant: a fixed six meant a section asking
  // for ten quietly showed six, and the carousel had fewer pages than the
  // editor had entries.
  const testimonialBlock = blocks.find((b) => b.type === 'testimonial_slider' && b.isVisible)
  const testimonialLimit = typeof testimonialBlock?.props.limit === 'number' ? testimonialBlock.props.limit : 3
  // The suggestion box shows the entries the pengurus chose, as many as its
  // editor asked for, and fetches none when that list is switched off.
  const feedbackBlock = blocks.find((b) => b.type === 'feedback_form' && b.isVisible)
  const feedbackLimit = typeof feedbackBlock?.props.publishedLimit === 'number' ? feedbackBlock.props.publishedLimit : 4
  const showsPublished = !!feedbackBlock && feedbackBlock.props.showPublished !== false

  const [products, simulations, branches, postsRes, stats, testimonials, documents, documentCategories, settings, jobs, faqs, publishedFeedback] = await Promise.all([
    need.products ? getProducts() : Promise.resolve([]),
    need.simulations ? getSimulations() : Promise.resolve([]),
    need.branches ? getBranches() : Promise.resolve([]),
    need.posts ? getPosts(postIndex ? { page: opts.page ?? 1, limit: perPage } : { limit: teaserLimit }) : Promise.resolve(null),
    need.stats ? getStats() : Promise.resolve([]),
    need.testimonials ? getTestimonials(testimonialLimit) : Promise.resolve([]),
    need.documents ? getDocuments() : Promise.resolve([]),
    need.documentCategories ? getDocumentCategories() : Promise.resolve([]),
    getSettings(),
    need.jobs ? getJobs() : Promise.resolve([]),
    need.faqs ? getFaqs() : Promise.resolve([]),
    need.publishedFeedback && showsPublished ? getPublishedFeedback(feedbackLimit) : Promise.resolve([]),
  ])

  return {
    products,
    simulations,
    branches,
    posts: postsRes?.data ?? [],
    stats,
    testimonials,
    documents,
    documentCategories,
    settings,
    jobs,
    faqs,
    publishedFeedback,
    postsMeta: postsRes?.meta ? { page: postsRes.meta.page, totalPages: postsRes.meta.totalPages } : undefined,
    basePath: opts.basePath,
    query: opts.query,
  }
}
