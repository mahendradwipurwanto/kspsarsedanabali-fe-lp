import { Suspense } from 'react'
import Link from 'next/link'
import { getBlock, telLink, getOpenState } from '@/contracts'
import type { Block, Branch, Product, Post, Stat, Testimonial, DocumentItem, Job, Faq } from '@/lib/api'
import { Shell, Band, Heading, Label, Action, Card, Tile, Pill, Icon, Blank, More, Mark, Rule, Stat as Figure, iconByName } from '../ui'
import { Media } from '../ui/Media'
import { HeroCarousel, QuickAccess } from '../interactive/HeroCarousel'
import { LeadForm } from '../interactive/LeadForm'
import { BranchFinder } from '../interactive/BranchFinder'
import { SimulationCalculator } from '../interactive/SimulationCalculator'
import { TestimonialSlider } from '../interactive/TestimonialSlider'
import { Accordion } from '../interactive/Accordion'
import { SimulationTabs } from '../interactive/SimulationTabs'
import { ProfilingWizard } from '../interactive/ProfilingWizard'
import { ProductCard, ProductRow } from '../ProductCard'
import { PostCard } from '../PostCard'
import { BranchCard } from '../BranchCard'
import { Pagination } from '../Pagination'
import { OrgChart } from '../OrgChart'

export interface BlockContext {
  branches: Branch[]
  products: Product[]
  posts: Post[]
  stats: Stat[]
  testimonials: Testimonial[]
  documents: DocumentItem[]
  settings: Record<string, unknown>
  /** Only the pages that render them fetch these. */
  jobs?: Job[]
  faqs?: Faq[]
  /** Paging state for the news index, owned by the route that reads the URL. */
  postsMeta?: { page: number; totalPages: number }
  basePath?: string
  /** Query string the route was opened with, for blocks that preselect from it. */
  query?: { produk?: string; nominal?: string; tenor?: string; jenis?: string }
}

type P = Record<string, unknown>
const s = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const n = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback)
const b = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export function BlockRenderer({ blocks, ctx }: { blocks: Block[]; ctx: BlockContext }) {
  const visible = blocks.filter((block) => block.isVisible && getBlock(block.type))
  // Bands alternate white / paper, counting only the blocks that are bands —
  // full-bleed openers and strips do not take a turn, or the rhythm breaks.
  let bandIndex = 0
  return (
    <>
      {visible.map((block, i) => {
        const isBand = !['hero_banner', 'quick_access', 'legality_bar', 'branch_contact_strip', 'page_header', 'cta_banner'].includes(block.type)
        const tone = isBand ? (bandIndex++ % 2 === 1 ? 'alt' : 'default') : 'default'
        return <BlockSwitch key={block.id ?? i} block={block} ctx={ctx} tone={tone} />
      })}
    </>
  )
}

function BlockSwitch({ block, ctx, tone }: { block: Block; ctx: BlockContext; tone: 'default' | 'alt' }) {
  const p = block.props as P

  switch (block.type) {
    /* ─────────────────────────── page openers ─────────────────────────── */
    case 'page_header':
      return (
        <div className="relative overflow-hidden bg-ink-900 text-white grid-dark">
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
          <Shell>
            <div className={`relative py-12 sm:py-16 lg:py-20 ${s(p.align) === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-[56ch]'}`}>
              {s(p.eyebrow) ? (
                <div className={s(p.align) === 'center' ? 'flex justify-center' : ''}><Label tone="gold">{s(p.eyebrow)}</Label></div>
              ) : null}
              <h1 className="t-h1 mt-3 !text-white">{s(p.heading)}</h1>
              {s(p.subheading) ? <p className="t-lead mt-4 text-white/70">{s(p.subheading)}</p> : null}
            </div>
          </Shell>
        </div>
      )

    case 'hero_banner':
      return (
        <HeroCarousel
          slides={arr(p.slides)}
          autoplay={b(p.autoplay, true)}
          interval={n(p.interval, 8)}
          badge={s(p.badge)}
          products={ctx.products}
        />
      )

    case 'quick_access':
      return <QuickAccess items={arr(p.items)} />

    /* ─────────────────────────── trust devices ────────────────────────── */
    case 'legality_bar': {
      const items = arr<{ label: string; value: string }>(p.items)
      const logos = arr<{ image: string; alt: string }>(p.partnerLogos)
      if (!items.length && !logos.length) return null
      return (
        <div className="border-b border-line bg-paper">
          <Shell>
            <div className="flex flex-col items-center gap-5 py-5 text-center md:flex-row md:gap-8 md:text-left lg:gap-10">
              <div className="flex shrink-0 items-center gap-3">
                <Mark className="h-10 w-auto" />
                <span className="leading-tight">
                  <span className="block text-[16px] font-extrabold tracking-[-0.02em] text-ink-900">KSP Sari Sedana Bali</span>
                  <span className="block text-[11.5px] font-medium text-ink-400">Untuk kita</span>
                </span>
              </div>
              <div aria-hidden="true" className="hidden h-10 w-px bg-line md:block" />
              <dl className="tnum min-w-0 flex-1 space-y-0.5">
                {items.map((item, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-center gap-x-2 md:justify-start">
                    <dt className="text-[13px] font-semibold text-ink-700">{item.label}</dt>
                    <dd className="text-[13px] text-ink-500">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {logos.length ? (
                <ul className="flex shrink-0 items-center gap-5">
                  {logos.map((logo, i) => (
                    <li key={i}><Media src={logo.image} alt={logo.alt} ratio="3/1" className="w-24 sm:w-28" rounded={false} /></li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Shell>
        </div>
      )
    }

    case 'branch_contact_strip': {
      const chosen = arr<string>(p.branches)
      const list = chosen.length ? ctx.branches.filter((x) => chosen.includes(x.id)) : ctx.branches
      if (!list.length) return null
      return (
        <div className="border-b border-line bg-ink-900 text-white">
          <Shell>
            <ul className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {list.map((branch, i) => {
                const state = getOpenState(branch.hours)
                return (
                  <li key={branch.id} className={`py-5 ${i === 0 ? 'sm:pr-6' : i === list.length - 1 ? 'sm:pl-6' : 'sm:px-6'}`}>
                    <p className="flex items-center gap-2 text-[14.5px] font-bold text-white">
                      <span aria-hidden="true" className={`size-1.5 rounded-full ${state.isOpen ? 'bg-green-400' : 'bg-gold-300'}`} />
                      {branch.name}
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-white/55">{branch.address}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                      <span className="text-white/50">{state.label}</span>
                      {branch.phone ? (
                        <a href={telLink(branch.phone)} className="tnum inline-flex items-center gap-1.5 font-semibold text-gold-300 hover:text-gold-200">
                          <Icon.phone className="size-3.5" />
                          {branch.phone}
                        </a>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Shell>
        </div>
      )
    }

    /* ───────────────────────────── statistics ─────────────────────────── */
    case 'stats_counter': {
      const custom = arr<{ icon?: string; value: string; label: string }>(p.items)
      const items = custom.length ? custom : ctx.stats.map((x) => ({ value: x.value, label: x.label, icon: x.icon ?? undefined }))
      if (!items.length) return null
      const ledger = s(p.layout, 'ledger') === 'ledger'
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label={s(p.eyebrow)} title={s(p.heading)} lead={s(p.subtext)} />
            {ledger ? (
              /* A ledger row: figures on hairlines, no boxes. This is the
                 shape a financial statement has, and it is the one place the
                 site shows its numbers together. */
              <div className="surface overflow-hidden">
                <ul className="grid grid-cols-2 divide-y divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
                  {items.map((item, i) => (
                    <li key={i} className={`p-5 lg:p-6 ${i % 2 === 1 ? 'border-l border-line sm:border-l-0' : ''} ${i >= 2 && i < 3 ? 'sm:border-l' : ''}`}>
                      <Figure value={item.value} label={item.label} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
                {items.map((item, i) => {
                  const IconCmp = iconByName(item.icon)
                  return (
                    <Card as="li" key={i} className="p-5">
                      <Tile size="sm" tone="soft"><IconCmp className="size-4" /></Tile>
                      <p className="figure mt-4 text-[1.5rem] text-ink-900">{item.value}</p>
                      <p className="mt-1.5 text-[12.5px] font-semibold text-ink-500">{item.label}</p>
                    </Card>
                  )
                })}
              </ul>
            )}
          </Shell>
        </Band>
      )
    }

    /* ───────────────────────────── products ───────────────────────────── */
    case 'product_grid': {
      const category = s(p.category, 'all')
      const limit = n(p.limit, 6)
      const list = (category === 'all' ? ctx.products : ctx.products.filter((x) => x.category === category)).slice(0, limit)
      if (!list.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <Heading
              label={s(p.eyebrow)}
              title={s(p.heading)}
              lead={s(p.subtext)}
              action={s(p.ctaLabel) ? <Action href={s(p.ctaHref, '/produk')} variant="outline">{s(p.ctaLabel)}<Icon.arrow className="size-4" /></Action> : undefined}
            />
            {s(p.layout, 'cards') === 'rows' ? (
              <ul className="grid gap-3">
                {list.map((product, i) => <ProductRow key={product.id} product={product} index={i + 1} />)}
              </ul>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 3} />)}
              </ul>
            )}
          </Shell>
        </Band>
      )
    }

    /* ─────────────────────────────── CTA ──────────────────────────────── */
    case 'cta_banner': {
      const solid = s(p.variant, 'image') === 'solid' || !s(p.image)
      return (
        <section className={`relative isolate overflow-hidden text-white ${solid ? 'bg-ink-900 grid-dark' : 'bg-ink-900'}`}>
          {!solid ? (
            <div className="absolute inset-0 -z-10">
              <Media src={s(p.image)} alt="" ratio="auto" rounded={false} sizes="100vw" className="!absolute inset-0 size-full !rounded-none [&>*]:!object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/90 to-ink-900/50" />
            </div>
          ) : (
            <Mark className="pointer-events-none absolute -right-10 -bottom-16 hidden h-[22rem] w-auto opacity-[0.06] lg:block" />
          )}
          <Shell>
            <div className="flex flex-col gap-7 py-14 lg:flex-row lg:items-center lg:justify-between lg:py-20">
              <div className="max-w-[44ch]">
                {s(p.eyebrow) ? <Label tone="gold">{s(p.eyebrow)}</Label> : null}
                <h2 className="t-h1 mt-3 !text-white">{s(p.heading)}</h2>
                {s(p.body) ? <p className="mt-4 text-[16px] leading-relaxed text-white/70">{s(p.body)}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {s(p.ctaLabel) ? (
                  <Action href={s(p.ctaHref, '/kontak')} variant="light" size="lg">
                    {s(p.ctaLabel)}
                    <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                  </Action>
                ) : null}
                {s(p.secondaryLabel) ? (
                  <Action href={s(p.secondaryHref, '/profiling')} variant="ghostLight" size="lg">{s(p.secondaryLabel)}</Action>
                ) : null}
              </div>
            </div>
          </Shell>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
        </section>
      )
    }

    /* ──────────────────────────────  news  ────────────────────────────── */
    case 'news_list': {
      const list = ctx.posts.slice(0, n(p.limit, 3))
      if (!list.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <Heading
              label={s(p.eyebrow)}
              title={s(p.heading)}
              lead={s(p.subtext)}
              action={<Action href={s(p.ctaHref, '/berita')} variant="outline">{s(p.ctaLabel, 'Lihat Semua Berita')}<Icon.arrow className="size-4" /></Action>}
            />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((post, i) => <PostCard key={post.id} post={post} priority={i === 0} />)}
            </ul>
          </Shell>
        </Band>
      )
    }

    case 'testimonial_slider': {
      const list = ctx.testimonials.slice(0, n(p.limit, 3))
      if (!list.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label={s(p.eyebrow)} title={s(p.heading)} lead={s(p.subtext)} />
            <TestimonialSlider items={list} />
          </Shell>
        </Band>
      )
    }

    /* ────────────────────────────── content ───────────────────────────── */
    case 'feature_grid': {
      const items = arr<{ icon?: string; title: string; body?: string }>(p.items)
      if (!items.length) return null
      const cols = { '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-2 lg:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' }[s(p.columns, '3')] ?? 'sm:grid-cols-2 lg:grid-cols-3'
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) ? <Heading label={s(p.eyebrow)} title={s(p.heading)} /> : null}
            <ul className={`grid gap-5 ${cols}`}>
              {items.map((item, i) => {
                const IconCmp = iconByName(item.icon)
                return (
                  <Card as="li" key={i} className="p-6">
                    <Tile tone="dark"><IconCmp className="size-5" /></Tile>
                    <h3 className="t-h3 mt-5">{item.title}</h3>
                    {item.body ? <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{item.body}</p> : null}
                  </Card>
                )
              })}
            </ul>
          </Shell>
        </Band>
      )
    }

    case 'rich_text':
      return (
        <Band tone={tone}>
          <Shell>
            <div className={`prose-ksp ${s(p.width, 'narrow') === 'narrow' ? 'mx-auto max-w-[68ch]' : ''}`}
              dangerouslySetInnerHTML={{ __html: s(p.body) }} />
          </Shell>
        </Band>
      )

    case 'accordion': {
      const items = arr<{ title: string; body: string }>(p.items)
      if (!items.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <div className="mx-auto max-w-3xl">
              {s(p.heading) ? <Heading title={s(p.heading)} align="center" /> : null}
              <Accordion items={items} />
            </div>
          </Shell>
        </Band>
      )
    }

    case 'org_chart': {
      const fromProps = arr<{ title: string; members: { name: string; role?: string }[] }>(p.groups)
      const groups = fromProps.length ? fromProps : arr<{ title: string; members: { name: string; role?: string }[] }>(ctx.settings.organization)
      const units = arr<{ title: string; roles?: { name: string }[] }>(p.units)
      if (!groups.length && !units.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label={s(p.eyebrow, 'Tata kelola')} title={s(p.heading, 'Struktur Organisasi')} />
            <OrgChart
              groups={groups}
              apex={s(p.apex, '')}
              audit={s(p.audit, '')}
              operationsLead={s(p.operationsLead, '')}
              units={units}
            />
          </Shell>
        </Band>
      )
    }

    case 'image_gallery': {
      const images = arr<{ image: string; caption?: string }>(p.images)
      if (!images.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) ? <Heading title={s(p.heading)} /> : null}
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, i) => (
                <li key={i}>
                  <figure>
                    <Media src={img.image} alt={img.caption ?? ''} ratio="4/3" sizes="(max-width: 640px) 100vw, 33vw" />
                    {img.caption ? <figcaption className="mt-2.5 text-[13px] text-ink-400">{img.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </Shell>
        </Band>
      )
    }

    case 'document_list': {
      const category = s(p.category, 'all')
      const list = ctx.documents.filter((d) => category === 'all' || d.category === category)
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) ? <Heading label={s(p.eyebrow, 'Unduhan')} title={s(p.heading)} /> : null}
            {list.length ? (
              <ul className="surface divide-y divide-line overflow-hidden">
                {list.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="group/doc flex items-center gap-4 p-4 transition-colors hover:bg-paper sm:p-5">
                      <Tile tone="outline"><Icon.fileText className="size-5" /></Tile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-ink-900 transition-colors group-hover/doc:text-green-700">{doc.title}</span>
                        {doc.year ? <span className="tnum mt-0.5 block text-[13px] text-ink-400">Tahun buku {doc.year}</span> : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-green-700">
                        Unduh <Icon.download className="size-4" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Blank title="Belum ada dokumen" body="Dokumen akan tersedia di sini setelah diunggah oleh pengurus koperasi." />
            )}
          </Shell>
        </Band>
      )
    }

    /* ───────────────────────────── conversion ─────────────────────────── */
    case 'profiling_cta':
      return (
        <Band tone={tone} className="!py-10 sm:!py-14">
          <Shell>
            <div className="surface-dark relative overflow-hidden p-7 text-white sm:p-9">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/60 to-transparent" />
              <div className="grid-dark absolute inset-0 -z-0 opacity-60" aria-hidden="true" />
              <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[48ch]">
                  {s(p.eyebrow) ? <Label tone="gold">{s(p.eyebrow)}</Label> : null}
                  <h2 className="t-h2 mt-3 !text-white">{s(p.heading)}</h2>
                  {s(p.body) ? <p className="mt-3 text-[16px] leading-relaxed text-white/70">{s(p.body)}</p> : null}
                </div>
                <div className="shrink-0">
                  <Action href={s(p.ctaHref, '/profiling')} variant="light" size="lg" className="w-full sm:w-auto">
                    {s(p.ctaLabel, 'Mulai')}
                    <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                  </Action>
                  {s(p.note) ? <p className="mt-2.5 text-center text-[12.5px] text-white/50">{s(p.note)}</p> : null}
                </div>
              </div>
            </div>
          </Shell>
        </Band>
      )

    case 'lead_form':
      return (
        <Band tone={tone} id="hubungi">
          <Shell>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
              <div>
                {s(p.eyebrow) ? <Label>{s(p.eyebrow)}</Label> : null}
                <h2 className="t-h2 mt-3">
                  {s(p.heading)}
                  {s(p.headingAccent) ? <> <span className="text-green-700">{s(p.headingAccent)}</span></> : null}
                </h2>
                {s(p.body) ? <p className="t-lead mt-4 max-w-[46ch]">{s(p.body)}</p> : null}

                {arr(p.benefits).length ? (
                  <ul className="mt-8 divide-y divide-line border-y border-line">
                    {arr<{ title: string; body?: string }>(p.benefits).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3.5 py-4">
                        <Icon.checkCircle className="mt-0.5 size-5 shrink-0 text-green-600" />
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-bold text-ink-900">{benefit.title}</span>
                          {benefit.body ? <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-500">{benefit.body}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {s(p.statValue) ? (
                  <div className="surface-dark relative mt-6 overflow-hidden p-6 text-white">
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/60 to-transparent" />
                    <p className="figure text-[2.25rem] text-gold-300">{s(p.statValue)}</p>
                    <p className="mt-2 text-[14.5px] font-semibold">{s(p.statLabel)}</p>
                    {s(p.statNote) ? <p className="mt-1 max-w-[36ch] text-[12.5px] leading-relaxed text-white/55">{s(p.statNote)}</p> : null}
                  </div>
                ) : null}
              </div>

              <LeadForm
                title={s(p.formTitle, 'Kirim Permintaan')}
                askProduct={b(p.askProduct, true)}
                askBranch={b(p.askBranch, true)}
                successMessage={s(p.successMessage, 'Terima kasih. Petugas kami akan menghubungi Anda.')}
                products={ctx.products}
                branches={ctx.branches}
              />
            </div>
          </Shell>
        </Band>
      )

    case 'branch_finder':
      return (
        <Band tone={tone} id="lokasi">
          <Shell>
            <Heading label={s(p.eyebrow, 'Kantor kami')} title={s(p.heading, 'Kantor Terdekat dari Anda')} lead={s(p.body)} />
            <BranchFinder branches={ctx.branches} showMap={b(p.showMap, true)} />
          </Shell>
        </Band>
      )

    case 'contact_cards':
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label={s(p.eyebrow, 'Kontak')} title={s(p.heading, 'Hubungi Kantor Kami')} />
            <ul className="grid gap-5 lg:grid-cols-3">
              {ctx.branches.map((branch) => <BranchCard key={branch.id} branch={branch} showHours={b(p.showHours, true)} />)}
            </ul>
          </Shell>
        </Band>
      )

    case 'simulation_calculator': {
      const chosen = s(p.product)
      const loans = ctx.products.filter((x) => x.category === 'pinjaman' && (x.ratePercent ?? x.ratePercentIndicative) != null)
      const preselected = loans.find((x) => x.id === chosen)
      return (
        <Band tone={tone} id="simulasi">
          <Shell>
            <Heading label={s(p.eyebrow, 'Kalkulator')} title={s(p.heading, 'Simulasi Angsuran')} lead={s(p.body)} />
            {loans.length ? (
              <SimulationCalculator products={loans} initialProductId={preselected?.id} disclaimer={s(p.disclaimer, 'Simulasi awal, bukan penawaran final.')} />
            ) : (
              <Blank
                title="Simulasi belum tersedia"
                body="Suku bunga terbaru sedang dikonfirmasi pengurus koperasi. Hubungi kantor terdekat untuk perhitungan angsuran yang berlaku saat ini."
                action={<Action href="/kontak">Hubungi kami</Action>}
              />
            )}
          </Shell>
        </Band>
      )
    }

    /* ────────────────────── full-page section blocks ───────────────────── */
    case 'post_index': {
      const list = ctx.posts
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) || s(p.eyebrow) ? <Heading label={s(p.eyebrow)} title={s(p.heading)} lead={s(p.subtext)} /> : null}
            {list.length ? (
              <>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((post, i) => <PostCard key={post.id} post={post} priority={i < 3} />)}
                </ul>
                {ctx.postsMeta && ctx.postsMeta.totalPages > 1 ? (
                  <Pagination page={ctx.postsMeta.page} totalPages={ctx.postsMeta.totalPages} basePath={ctx.basePath ?? '/berita'} />
                ) : null}
              </>
            ) : (
              <Blank
                title={s(p.emptyTitle, 'Belum ada berita')}
                body={s(p.emptyBody, 'Berita dan informasi terbaru akan tampil di sini.')}
                action={<Action href="/">Kembali ke beranda</Action>}
              />
            )}
          </Shell>
        </Band>
      )
    }

    case 'job_list': {
      const jobs = ctx.jobs ?? []
      const TYPES: Record<string, string> = { full_time: 'Penuh Waktu', part_time: 'Paruh Waktu', contract: 'Kontrak', internship: 'Magang' }
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) || s(p.eyebrow) ? <Heading label={s(p.eyebrow)} title={s(p.heading)} lead={s(p.subtext)} /> : null}
            {jobs.length ? (
              <ul className="grid gap-4">
                {jobs.map((job) => (
                  <Card as="li" key={job.id} hover className="group p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2.5 flex flex-wrap gap-2">
                          <Pill tone="green">{TYPES[job.employmentType] ?? job.employmentType}</Pill>
                          {job.department ? <Pill tone="quiet">{job.department}</Pill> : null}
                        </div>
                        <h3 className="t-h3">
                          <Link href={`/karir/${job.slug}`} className="transition-colors group-hover:text-green-700">{job.title}</Link>
                        </h3>
                        <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink-600">
                          <Icon.pin className="size-4 text-ink-400" />
                          {job.location ?? job.branchName ?? 'Karangasem, Bali'}
                        </p>
                      </div>
                      <Action href={`/karir/${job.slug}`} variant="outline" className="shrink-0 self-start sm:self-auto">
                        Lihat dan lamar <Icon.arrow className="size-4" />
                      </Action>
                    </div>
                  </Card>
                ))}
              </ul>
            ) : (
              <Blank
                title={s(p.emptyTitle, 'Belum ada lowongan saat ini')}
                body={s(p.emptyBody, 'Silakan cek kembali secara berkala atau kirim lamaran spontan ke kantor kami.')}
                action={<Action href="/kontak">Hubungi kami</Action>}
              />
            )}
          </Shell>
        </Band>
      )
    }

    case 'faq_index': {
      const category = s(p.category, 'all')
      const faqs = (ctx.faqs ?? []).filter((f) => category === 'all' || f.category === category)
      if (!faqs.length) return null
      const LABELS: Record<string, string> = { umum: 'Umum', keanggotaan: 'Keanggotaan', simpanan: 'Simpanan', pinjaman: 'Pinjaman' }
      const groups = b(p.grouped, true)
        ? Object.entries(faqs.reduce<Record<string, typeof faqs>>((acc, f) => {
            const key = f.category ?? 'umum'
            ;(acc[key] ??= []).push(f)
            return acc
          }, {}))
        : [['', faqs] as [string, typeof faqs]]

      return (
        <Band tone={tone}>
          <Shell>
            <div className="mx-auto max-w-3xl">
              {s(p.heading) || s(p.eyebrow) ? <Heading label={s(p.eyebrow)} title={s(p.heading)} align="center" /> : null}
              <div className="grid gap-10">
                {groups.map(([key, items]) => (
                  <div key={key || 'all'}>
                    {key ? <h3 className="t-h3 mb-4">{LABELS[key] ?? key}</h3> : null}
                    <Accordion items={items.map((f) => ({ title: f.question, body: `<p>${f.answer}</p>` }))} defaultOpen={-1} />
                  </div>
                ))}

                {s(p.ctaHeading) ? (
                  <div className="surface-dark relative overflow-hidden p-7 text-center text-white sm:p-8">
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/60 to-transparent" />
                    <h3 className="t-h3 !text-white">{s(p.ctaHeading)}</h3>
                    {s(p.ctaBody) ? <p className="mt-2 text-[15px] text-white/65">{s(p.ctaBody)}</p> : null}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {s(p.primaryLabel) ? (
                        <Action href={s(p.primaryHref, '/kontak')} variant="light">{s(p.primaryLabel)}<Icon.arrow className="size-4" /></Action>
                      ) : null}
                      {s(p.secondaryLabel) ? (
                        <Action href={s(p.secondaryHref, '/lokasi')} variant="ghostLight">{s(p.secondaryLabel)}</Action>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Shell>
        </Band>
      )
    }

    case 'simulation_tabs': {
      const loans = ctx.products.filter((x) => x.category === 'pinjaman' && (x.ratePercent ?? x.ratePercentIndicative) != null)
      const savings = ctx.products.filter((x) => x.category === 'simpanan')
      const preselected = loans.find((x) => x.slug === ctx.query?.produk)
      const plan = ['sigemas', 'simapan', 'sipura'].find((slug) => slug === ctx.query?.produk)
      return (
        <Band tone={tone} id="simulasi">
          <Shell>
            <SimulationTabs
              loanProducts={loans}
              savingsProducts={savings}
              initialTab={plan || ctx.query?.jenis === 'simpanan' ? 'simpanan' : (s(p.defaultTab, 'pinjaman') as 'pinjaman' | 'simpanan')}
              initialPlan={plan as 'sigemas' | 'simapan' | 'sipura' | undefined}
              initialProductId={preselected?.id}
              initialAmount={ctx.query?.nominal ? Number(ctx.query.nominal) : undefined}
              initialTenor={ctx.query?.tenor ? Number(ctx.query.tenor) : undefined}
              disclaimer={s(p.disclaimer, 'Simulasi awal, bukan penawaran final.')}
            />
          </Shell>
        </Band>
      )
    }

    case 'profiling_wizard':
      return (
        <Band tone={tone}>
          <Shell>
            {/* The wizard keeps its step in the URL, so it needs a boundary to
                prerender the page around it. */}
            <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-ink-100" />}>
              <ProfilingWizard products={ctx.products} branches={ctx.branches} />
            </Suspense>
          </Shell>
        </Band>
      )

    default:
      return null
  }
}

export { Link, More, Pill, Card, Rule }
