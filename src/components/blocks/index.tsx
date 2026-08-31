import Link from 'next/link'
import { getBlock, telLink } from '@/contracts'
import type { Block, Branch, Product, Post, Stat, Testimonial, DocumentItem } from '@/lib/api'
import { Shell, Band, Heading, Label, Action, Card, Tile, Pill, Icon, Blank, More, Mark, iconByName } from '../ui'
import { Media } from '../ui/Media'
import { HeroCarousel, QuickAccess } from '../interactive/HeroCarousel'
import { LeadForm } from '../interactive/LeadForm'
import { BranchFinder } from '../interactive/BranchFinder'
import { SimulationCalculator } from '../interactive/SimulationCalculator'
import { TestimonialSlider } from '../interactive/TestimonialSlider'
import { Accordion } from '../interactive/Accordion'
import { ProductCard } from '../ProductCard'
import { PostCard } from '../PostCard'
import { BranchCard } from '../BranchCard'

export interface BlockContext {
  branches: Branch[]
  products: Product[]
  posts: Post[]
  stats: Stat[]
  testimonials: Testimonial[]
  documents: DocumentItem[]
  settings: Record<string, unknown>
}

type P = Record<string, unknown>
const s = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const n = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback)
const b = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export function BlockRenderer({ blocks, ctx }: { blocks: Block[]; ctx: BlockContext }) {
  const visible = blocks.filter((block) => block.isVisible && getBlock(block.type))
  const hasHero = visible[0]?.type === 'hero_banner'
  return (
    <>
      {visible.map((block, i) => (
        <BlockSwitch key={block.id ?? i} block={block} ctx={ctx} index={i} />
      ))}
      {/* Quick access appears right after the banner on the homepage only. */}
      {hasHero ? null : null}
    </>
  )
}

function BlockSwitch({ block, ctx, index }: { block: Block; ctx: BlockContext; index: number }) {
  const p = block.props as P
  const tone = index % 2 === 1 ? 'alt' : 'default'

  switch (block.type) {
    /* ─────────────────────────── page openers ─────────────────────────── */
    case 'page_header':
      return (
        <div className="relative overflow-hidden border-b border-line bg-gradient-to-b from-green-50/70 to-white">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-green-100/40 blur-3xl" />
          <Shell>
            <div className={`relative py-12 sm:py-16 lg:py-20 ${s(p.align) === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-[56ch]'}`}>
              {s(p.eyebrow) ? <Label>{s(p.eyebrow)}</Label> : null}
              <h1 className="t-h1 mt-2.5">{s(p.heading)}</h1>
              {s(p.subheading) ? <p className="t-lead mt-4">{s(p.subheading)}</p> : null}
            </div>
          </Shell>
        </div>
      )

    case 'hero_banner':
      return (
        <>
          <HeroCarousel slides={arr(p.slides)} autoplay={b(p.autoplay, true)} />
          {/* The two new features get a shortcut immediately below the banner. */}
          <QuickAccess />
        </>
      )

    /* ─────────────────────────── trust devices ────────────────────────── */
    case 'legality_bar': {
      const items = arr<{ label: string; value: string }>(p.items)
      const logos = arr<{ image: string; alt: string }>(p.partnerLogos)
      if (!items.length && !logos.length) return null
      return (
        <div className="bg-gradient-to-r from-green-50 via-[#f3f4e4] to-green-50">
          <Shell>
            <div className="flex flex-col items-center gap-5 py-5 text-center md:flex-row md:gap-8 md:text-left lg:gap-10">
              <div className="flex shrink-0 items-center gap-4">
                <Mark className="h-11 w-auto sm:h-12" />
                <span className="leading-tight">
                  <span className="block text-[17px] font-extrabold tracking-[-0.02em] text-green-600 sm:text-[19px]">
                    KSP Sari Sedana Bali
                  </span>
                  <span className="block text-[12px] font-medium tracking-[0.1em] text-slate-400">Untuk kita</span>
                </span>
              </div>

              <div aria-hidden="true" className="hidden h-12 w-px bg-green-200 md:block" />

              <dl className="min-w-0 flex-1 space-y-0.5">
                {items.map((item, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-center gap-x-2 md:justify-start">
                    <dt className="text-[13px] font-semibold text-navy-800 sm:text-[14.5px]">{item.label} :</dt>
                    <dd className="tnum text-[13px] text-navy-700 sm:text-[14.5px]">{item.value}</dd>
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
        <div className="relative bg-gradient-to-b from-green-500 to-green-600 text-white">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent" />
          <Shell>
            <ul className="grid divide-y divide-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {list.map((branch, i) => (
                <li key={branch.id} className={`py-5 ${i === 0 ? 'sm:pr-6' : i === list.length - 1 ? 'sm:pl-6' : 'sm:px-6'}`}>
                  <p className="flex items-center gap-2 text-[15px] font-bold text-gold-300">
                    <Icon.pin className="size-4 shrink-0" />
                    {branch.name}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-snug text-white/85">{branch.address}</p>
                  {branch.phone ? (
                    <a href={telLink(branch.phone)} className="tnum mt-2 inline-flex items-center gap-2 text-[15px] font-semibold text-white transition-colors hover:text-gold-200">
                      <Icon.phone className="size-4 text-gold-300" />
                      {branch.phone}
                    </a>
                  ) : null}
                </li>
              ))}
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
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label={s(p.eyebrow, 'Pencapaian Kami')} title={s(p.heading)} lead={s(p.subtext)} align="center" />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4 [&>li]:flex [&>li]:flex-col [&>li]:items-center">
              {items.map((item, i) => {
                const IconCmp = iconByName(item.icon)
                return (
                  <Card as="li" key={i} hover className="group/stat relative overflow-hidden p-5 text-center">
                    {/* A gold seam along the top edge, revealed on hover — the
                        only ornament on the card, and it earns attention. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[2px] origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-300 to-transparent transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/stat:scale-x-100"
                    />
                    <span className="mx-auto">
                      <Tile size="md" tone="soft">
                        <IconCmp className="size-5" />
                      </Tile>
                    </span>
                    <p className="figure mt-4 text-[19px] text-navy-800 sm:text-[21px]">{item.value}</p>
                    <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">{item.label}</p>
                  </Card>
                )
              })}
            </ul>
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
              alignAction="end"
              action={
                s(p.ctaLabel) ? (
                  <Action href={s(p.ctaHref, '/produk')}>
                    {s(p.ctaLabel)}
                    <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                  </Action>
                ) : undefined
              }
            />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 3} />)}
            </ul>
          </Shell>
        </Band>
      )
    }

    /* ─────────────────────────────── CTA ──────────────────────────────── */
    case 'cta_banner':
      return (
        <section className="relative isolate overflow-hidden bg-green-700">
          <div className="absolute inset-0 -z-10">
            <Media src={s(p.image)} alt="" ratio="auto" rounded={false} sizes="100vw" className="!absolute inset-0 size-full [&>*]:!object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-green-900/96 via-green-700/90 to-green-600/55" />
            <Mark className="pointer-events-none absolute -right-10 -bottom-16 hidden h-[22rem] w-auto opacity-[0.07] lg:block" />
          </div>
          <Shell>
            <div className="flex flex-col gap-7 py-14 sm:py-18 lg:flex-row lg:items-center lg:justify-between lg:py-20">
              <div className="max-w-[44ch]">
                {s(p.eyebrow) ? <Label tone="gold">{s(p.eyebrow)}</Label> : null}
                <h2 className="t-h1 mt-2.5 !text-white">{s(p.heading)}</h2>
                {s(p.body) ? <p className="mt-4 text-[16px] leading-relaxed text-white/85">{s(p.body)}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {s(p.ctaLabel) ? (
                  <Action href={s(p.ctaHref, '/kontak')} variant="light" size="lg">
                    {s(p.ctaLabel)}
                    <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                  </Action>
                ) : null}
                <Action href="/profiling" variant="ghostLight" size="lg">
                  <Icon.spark className="size-4" />
                  Cari Produk
                </Action>
              </div>
            </div>
          </Shell>
        </section>
      )

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
              alignAction="end"
              action={
                <Action href="/berita">
                  {s(p.ctaLabel, 'Lihat Semua Berita')}
                  <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                </Action>
              }
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
            <Heading label={s(p.eyebrow)} title={s(p.heading)} lead={s(p.subtext)} align="center" />
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
                  <Card as="li" key={i} hover className="group/feat relative overflow-hidden p-6">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-green-400 to-green-600 transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/feat:scale-y-100"
                    />
                    <div className="flex items-start justify-between gap-4">
                      <Tile tone="soft"><IconCmp className="size-5" /></Tile>
                      <span className="tnum text-[11px] font-bold tracking-[0.16em] text-slate-200 transition-colors duration-300 group-hover/feat:text-gold-300">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="t-h3 mt-4">{item.title}</h3>
                    {item.body ? <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">{item.body}</p> : null}
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
      if (!groups.length) return null
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label="Tata Kelola" title={s(p.heading, 'Struktur Organisasi')} align="center" />
            {/* Structured text rather than a flat image — readable by Google and
                by a phone, unlike the JPEG on the old site. */}
            <div className="grid gap-5 lg:grid-cols-3">
              {groups.map((group, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center gap-3">
                    <Tile size="sm" tone="soft"><Icon.users className="size-4" /></Tile>
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.11em] text-green-700">{group.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-4">
                    {group.members.map((m, j) => (
                      <li key={j} className="border-l-2 border-green-100 pl-3.5">
                        <p className="text-[15.5px] font-bold text-navy-800">{m.name}</p>
                        {m.role ? <p className="mt-0.5 text-[12.5px] text-slate-400">{m.role}</p> : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
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
                    {img.caption ? <figcaption className="mt-2.5 text-[13px] text-slate-400">{img.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </Shell>
        </Band>
      )
    }

    case 'document_list': {
      const list = ctx.documents.filter((d) => !s(p.category) || d.category === s(p.category))
      return (
        <Band tone={tone}>
          <Shell>
            {s(p.heading) ? <Heading label="Unduhan" title={s(p.heading)} /> : null}
            {list.length ? (
              <ul className="grid gap-3">
                {list.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="surface surface-i group/doc flex items-center gap-4 p-4 sm:p-5">
                      <Tile tone="soft"><Icon.download className="size-5" /></Tile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-navy-800 transition-colors group-hover/doc:text-green-700">{doc.title}</span>
                        {doc.year ? <span className="tnum mt-0.5 block text-[13px] text-slate-400">Tahun buku {doc.year}</span> : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-green-700">
                        Unduh
                        <Icon.arrow className="size-3.5 transition-transform duration-300 group-hover/doc:translate-x-0.5" />
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
            <Card tone="soft" className="relative overflow-hidden p-7 sm:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 size-52 rounded-full bg-green-100/70 blur-2xl" />
              <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[48ch]">
                  <div className="flex items-center gap-3">
                    <Tile><Icon.spark className="size-5" /></Tile>
                    <Label>Panduan Cepat</Label>
                  </div>
                  <h2 className="t-h2 mt-4">{s(p.heading)}</h2>
                  {s(p.body) ? <p className="t-lead mt-3">{s(p.body)}</p> : null}
                </div>
                <div className="shrink-0">
                  <Action href="/profiling" size="lg" className="w-full sm:w-auto">
                    {s(p.ctaLabel, 'Mulai')}
                    <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                  </Action>
                  {s(p.note) ? <p className="mt-2.5 text-center text-[12.5px] text-slate-400">{s(p.note)}</p> : null}
                </div>
              </div>
            </Card>
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
                <h2 className="t-h2 mt-2.5">
                  {s(p.heading)}
                  {s(p.headingAccent) ? <> <span className="text-green-600">{s(p.headingAccent)}</span></> : null}
                </h2>
                {s(p.body) ? <p className="t-lead mt-3.5 max-w-[46ch]">{s(p.body)}</p> : null}

                <ul className="mt-8 grid gap-3">
                  {arr<{ title: string; body?: string }>(p.benefits).map((benefit, i) => (
                    <Card as="li" key={i} className="flex items-start gap-3.5 p-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green-50 text-green-600">
                        <Icon.checkCircle className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-bold text-navy-800">{benefit.title}</span>
                        {benefit.body ? <span className="mt-0.5 block text-[13.5px] leading-relaxed text-slate-500">{benefit.body}</span> : null}
                      </span>
                    </Card>
                  ))}
                </ul>

                {/* The green figure card from the design — social proof beside the form. */}
                {s(p.statValue) ? (
                  <div className="relative mt-4 overflow-hidden rounded-[var(--radius-card)] bg-green-600 p-6 text-white">
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-8 size-40 rounded-full bg-white/10" />
                    <Icon.quote className="relative size-7 text-white/70" />
                    <p className="tnum relative mt-4 text-[26px] font-extrabold tracking-[-0.02em]">{s(p.statValue)}</p>
                    <p className="relative mt-0.5 text-[14.5px] font-semibold">{s(p.statLabel)}</p>
                    {s(p.statNote) ? <p className="relative mt-1.5 max-w-[36ch] text-[12.5px] leading-relaxed text-white/75">{s(p.statNote)}</p> : null}
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
            <Heading label="Kantor Kami" title={s(p.heading, 'Kantor Terdekat dari Anda')} lead={s(p.body)} />
            <BranchFinder branches={ctx.branches} showMap={b(p.showMap, true)} />
          </Shell>
        </Band>
      )

    case 'contact_cards':
      return (
        <Band tone={tone}>
          <Shell>
            <Heading label="Kontak" title={s(p.heading, 'Hubungi Kantor Kami')} />
            <ul className="grid gap-5 lg:grid-cols-3">
              {ctx.branches.map((branch) => <BranchCard key={branch.id} branch={branch} showHours={b(p.showHours, true)} />)}
            </ul>
          </Shell>
        </Band>
      )

    case 'simulation_calculator': {
      const chosen = s(p.product)
      // Only products whose figures the koperasi has confirmed may be calculated.
      const loans = ctx.products.filter((x) => x.category === 'pinjaman' && x.isVerified && x.ratePercent != null)
      const preselected = loans.find((x) => x.id === chosen)
      return (
        <Band tone={tone} id="simulasi">
          <Shell>
            <Heading label="Kalkulator" title={s(p.heading, 'Simulasi Angsuran')} lead={s(p.body)} />
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

    default:
      return null
  }
}

export { Link, More, Pill, Card }
