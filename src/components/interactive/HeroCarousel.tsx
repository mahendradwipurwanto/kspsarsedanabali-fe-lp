'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateInstallment, formatRate, formatRupiah, formatRupiahShort, formatTerm, isExternalHref, productAmountLabel, productRatePeriod, productTerm, LOAN_RATE_METHOD, PRODUCT_RATE_PERIOD_LABELS } from '@/contracts'
import type { Product } from '@/lib/api'
import { Shell, Action, Icon, Pill, iconByName, RichText } from '../ui'
import { Media } from '../ui/Media'
import { buttonPaint, cardPaint, type CardPaint } from './hero-style'

interface Slide {
  /** `image`: the artwork alone — no copy, no card, no wash. */
  display?: 'content' | 'image'
  image?: string
  /** Image-only slides: where the whole picture leads. */
  link?: string
  heading: string
  subheading?: string
  bullets?: { text: string }[]
  ctaLabel?: string
  ctaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  featuredProduct?: string
}


/**
 * The homepage opener. Navy, gridded, and built around one instrument: the
 * featured product's rate card. A koperasi sells numbers — a rate, a ceiling,
 * a term — so the numbers are the picture, set large and tabular where a
 * poster would otherwise go. When a slide carries artwork it sits behind the
 * copy under a navy wash; the card stays. A slide shown as the picture alone
 * drops the wash and the buttons, and the whole picture can be the link.
 *
 * Every string here is CMS-editable through the Banner Utama block.
 */
/** The banner's height from laptop width up, the same for every slide. Literal classes, so Tailwind sees them. */
const HERO_HEIGHTS = { short: 'lg:h-[600px]', standard: 'lg:h-[680px]', tall: 'lg:h-[760px]' } as const
export type HeroHeight = keyof typeof HERO_HEIGHTS

export function HeroCarousel({
  slides, autoplay, interval = 8, badge, products, height = 'standard', look = {},
}: {
  slides: Slide[]
  autoplay: boolean
  interval?: number
  badge?: string
  products: Product[]
  height?: HeroHeight
  /** The block's style options for the card and buttons (see hero-style.ts). */
  look?: Record<string, unknown>
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback((next: number) => setIndex(((next % slides.length) + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (!autoplay || paused || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), Math.max(3, interval) * 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [autoplay, paused, slides.length, interval])

  if (!slides.length) return null
  const card = cardPaint(look)
  const primary = buttonPaint(look, 'primary')
  const secondary = buttonPaint(look, 'secondary')
  const shape = look.buttonShape === 'rect' ? 'rect' : 'pill'
  const slide = slides[index]!
  const product = slide.featuredProduct ? products.find((p) => p.id === slide.featuredProduct) : undefined
  // Only with artwork: an image-only slide without one would be an empty panel.
  const imageOnly = slide.display === 'image' && !!slide.image

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Sorotan produk"
      className={`relative isolate overflow-hidden bg-night-900 text-white grid-dark ${HERO_HEIGHTS[height] ?? HERO_HEIGHTS.standard}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Every picture stays mounted, stacked, and a change is a cross-fade.
          Swapping the one <img> in and out showed the frame's pale background
          while the next file decoded: a white blink between slides. Each
          picture carries its own wash, so the wash fades with it. */}
      {slides.map((s, i) => (s.image ? (
        <div
          key={i}
          aria-hidden={i !== index}
          className={`absolute inset-0 -z-10 overflow-hidden transition-opacity duration-700 [transition-timing-function:var(--ease-settle)] ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <Media src={s.image} alt="" ratio="auto" rounded={false} priority={i === 0} sizes="100vw"
            className="!absolute inset-0 size-full !rounded-none !bg-night-900 [&>*]:!object-cover [&>*]:!object-center" />
          {s.display === 'image' ? null : <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/92 to-night-900/55" />}
        </div>
      ) : null))}
      {imageOnly && slide.link ? (
        isExternalHref(slide.link)
          ? <a href={slide.link} target="_blank" rel="noopener noreferrer" aria-label={slide.heading} className="absolute inset-0 z-0" />
          : <Link href={slide.link} aria-label={slide.heading} className="absolute inset-0 z-0" />
      ) : null}

      {/* A faint green glow from the top-left corner: the only soft element, and
          it reads as light on the panel rather than decoration. */}
      {imageOnly ? null : <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[34rem] rounded-full bg-green-500/10 blur-[110px]" />}

      {/* An image-only slide is a fixed-height frame per screen size, the
          artwork centred in it and cropped at the edges; from laptop width it
          takes the banner's set height like every slide. Its heading stays as
          the H1 for Google and screen readers. */}
      {imageOnly ? (
        <>
          <h1 className="sr-only">{slide.heading}</h1>
          <div aria-hidden="true" className="h-[240px] w-full sm:h-[360px] md:h-[440px] lg:hidden" />
        </>
      ) : (
      // From laptop width the copy and card sit centred in the banner's fixed
      // height, clear of the dots at the bottom; overflow stays hidden.
      <Shell className="lg:absolute lg:inset-x-0 lg:top-0 lg:bottom-14 lg:flex lg:items-center">
        <div className="grid w-full gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:py-8">
          <div key={`copy-${index}`} className="max-w-[46ch]">
            {badge ? (
              <div className="rise d-1">
                <Pill tone="light">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-300" />
                  {badge}
                </Pill>
              </div>
            ) : null}

            <h1 className="t-display rise d-2 mt-5 !text-white">{slide.heading}</h1>

            {slide.subheading ? (
              <RichText value={slide.subheading} className="rise d-3 mt-5 max-w-[48ch] text-[16px] leading-relaxed text-white/70 sm:text-[17px]" />
            ) : null}

            <div className="rise d-4 mt-8 flex flex-wrap gap-3">
              {slide.ctaLabel && slide.ctaHref ? (
                <Action href={slide.ctaHref} external={isExternalHref(slide.ctaHref)} size="lg" shape={shape} style={primary.style} className={primary.className}>
                  {slide.ctaLabel}
                  <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                </Action>
              ) : null}
              {slide.secondaryLabel && slide.secondaryHref ? (
                <Action href={slide.secondaryHref} external={isExternalHref(slide.secondaryHref)} variant="ghostLight" size="lg" shape={shape} style={secondary.style} className={secondary.className}>
                  {slide.secondaryLabel}
                </Action>
              ) : null}
            </div>
          </div>

          <div key={`card-${index}`} className="rise d-3">
            {product ? <RateCard product={product} bullets={slide.bullets ?? []} paint={card} /> : <TermsCard bullets={slide.bullets ?? []} paint={card} />}
          </div>
        </div>
      </Shell>
      )}

      {slides.length > 1 ? (
        <Shell className={imageOnly ? 'absolute inset-x-0 bottom-0' : 'lg:absolute lg:inset-x-0 lg:bottom-0'}>
          {/* Over bare artwork the dots sit on a small dark pill, or a light picture swallows them. */}
          <div className={`relative z-10 flex w-fit items-center gap-2 ${imageOnly ? 'mb-6 rounded-full bg-black/35 px-3 py-2 backdrop-blur-sm' : 'pb-8'}`}>
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}: ${s.heading}`}
                aria-current={i === index}
                className={`h-[3px] rounded-full transition-all duration-500 [transition-timing-function:var(--ease-settle)] ${
                  i === index ? 'w-10 bg-gold-300' : 'w-5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </Shell>
      ) : null}

      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />
      <span aria-live="polite" className="sr-only">Slide {index + 1} dari {slides.length}: {slide.heading}</span>
    </section>
  )
}

/**
 * The rate card. Four figures a member actually shops on, in the order they
 * ask about them. A signed-off rate is shown as published; otherwise the card
 * falls back to the figure from the koperasi's own brochure, the same policy
 * as the calculator, and labels it an estimate rather than showing a dash.
 */
function RateCard({ product, bullets, paint }: { product: Product; bullets: { text: string }[]; paint: CardPaint }) {
  const verified = product.ratePercent != null
  const annual = product.ratePercent ?? product.ratePercentIndicative ?? null
  // Every loan is bunga menurun; a savings product has no instalment to show.
  const method = product.category === 'pinjaman' ? LOAN_RATE_METHOD : 'none'
  const rate = formatRate(annual, product.ratePeriod)
  const plafon = product.minAmount != null && product.maxAmount != null
    ? `${formatRupiahShort(product.minAmount)}–${formatRupiahShort(product.maxAmount)}` : null
  const tenor = formatTerm(productTerm(product))

  // A worked example, so the card answers "so what would I pay?" before the
  // visitor opens the calculator. Middle of the tenor range, a round principal.
  const sampleTenor = product.tenorOptions.length ? product.tenorOptions[Math.floor(product.tenorOptions.length / 2)]! : 36
  const samplePrincipal = product.minAmount != null && product.maxAmount != null
    ? Math.min(Math.max(25_000_000, product.minAmount), product.maxAmount) : 25_000_000
  const example = annual != null && method !== 'none'
    ? calculateInstallment({ principal: samplePrincipal, annualRatePercent: annual, months: sampleTenor, method })
    : null

  const href = `/produk/${product.category}/${product.slug}`

  return (
    <div className="hero-card relative overflow-hidden p-6 sm:p-7" style={paint.style}>
      <span aria-hidden="true" className="hc-topline absolute inset-x-0 top-0 h-[2px]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="hc-muted text-[12.5px] font-medium">{product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'}</p>
          <p className="hc-fg mt-1 truncate text-[17px] font-bold">{product.name}</p>
        </div>
        <Pill tone={verified ? (paint.light ? 'green' : 'light') : 'gold'}>
          {verified ? 'Suku bunga resmi' : 'Perkiraan'}
        </Pill>
      </div>

      <dl className="hc-rule tnum mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6">
        <div>
          <dt className="hc-muted text-[12px] font-medium">Bunga {PRODUCT_RATE_PERIOD_LABELS[productRatePeriod(product)]}</dt>
          <dd className="hc-accent figure mt-1.5 text-[2rem] sm:text-[2.25rem]">{rate ?? '—'}</dd>
          {rate && !verified ? <dd className="hc-faint mt-1 text-[11.5px]">Mengacu materi publikasi, belum diverifikasi ulang</dd> : null}
        </div>
        <div>
          <dt className="hc-muted text-[12px] font-medium">Angsuran contoh</dt>
          <dd className="hc-fg figure mt-1.5 text-[1.35rem] sm:text-[1.5rem]">
            {example ? formatRupiah(example.monthly) : '—'}
          </dd>
          {example ? <dd className="hc-faint mt-1 text-[11.5px]">{formatRupiahShort(samplePrincipal)} · {sampleTenor} bln</dd> : null}
        </div>
        <div>
          <dt className="hc-muted text-[12px] font-medium">{productAmountLabel(product.category)}</dt>
          <dd className="hc-fg mt-1.5 text-[15px] font-bold">{plafon ?? '—'}</dd>
        </div>
        <div>
          <dt className="hc-muted text-[12px] font-medium">Jangka waktu</dt>
          <dd className="hc-fg mt-1.5 text-[15px] font-bold">{tenor ?? '—'}</dd>
        </div>
      </dl>

      {bullets.length ? (
        <ul className="hc-rule mt-6 space-y-2.5 border-t pt-5">
          {bullets.slice(0, 4).map((b, i) => (
            <li key={i} className="hc-soft flex items-start gap-2.5 text-[13.5px] leading-snug">
              <Icon.check className="hc-accent mt-[3px] size-3.5 shrink-0" />
              {b.text}
            </li>
          ))}
        </ul>
      ) : null}

      <Link href={href} className="hc-link mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
        Syarat &amp; ketentuan lengkap
        <Icon.arrowUpRight className="size-4" />
      </Link>
    </div>
  )
}

/** Fallback when a slide has no product attached: the terms panel from the approved design, in navy. */
function TermsCard({ bullets, paint }: { bullets: { text: string }[]; paint: CardPaint }) {
  if (!bullets.length) return null
  return (
    <div className="hero-card relative overflow-hidden p-6 sm:p-7" style={paint.style}>
      <span aria-hidden="true" className="hc-topline absolute inset-x-0 top-0 h-[2px]" />
      <p className="hc-muted text-[12.5px] font-medium">Ketentuan</p>
      <ul className="mt-4">
        {bullets.map((b, i) => (
          <li key={i} className="hc-soft hc-rule flex items-start gap-3 border-t py-3 text-[15px] leading-relaxed first:border-t-0 first:pt-1 last:pb-0">
            <Icon.checkCircle className="hc-accent mt-0.5 size-5 shrink-0" />
            {b.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The shortcut row under the banner. Items come from the Akses Cepat block,
 * so the koperasi can reorder them, rename them, or add a fourth.
 */
export function QuickAccess({ items }: { items: { icon?: string; title: string; body?: string; href: string }[] }) {
  if (!items.length) return null
  return (
    <div className="border-b border-line bg-paper ground-texture">
      <Shell>
        <ul className={`grid gap-3 py-6 lg:gap-4 lg:py-7 ${items.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {items.map((item) => {
            const IconCmp = iconByName(item.icon)
            return (
              <li key={item.href + item.title}>
                <Link href={item.href} className="surface surface-i group/qa flex h-full items-center gap-4 p-4 lg:p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-night-900 text-gold-300 transition-colors duration-300 group-hover/qa:bg-green-600 group-hover/qa:text-white">
                    <IconCmp className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold text-ink-900">{item.title}</span>
                    {item.body ? <span className="block truncate text-[12.5px] text-ink-400">{item.body}</span> : null}
                  </span>
                  <Icon.arrowUpRight className="size-4 shrink-0 text-ink-300 transition-all duration-300 group-hover/qa:text-green-600" />
                </Link>
              </li>
            )
          })}
        </ul>
      </Shell>
    </div>
  )
}
