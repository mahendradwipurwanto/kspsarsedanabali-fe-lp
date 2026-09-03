'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateInstallment, formatRupiah, formatRupiahShort } from '@/contracts'
import type { Product } from '@/lib/api'
import { Shell, Action, Icon, Pill, iconByName } from '../ui'
import { Media } from '../ui/Media'

interface Slide {
  image?: string
  heading: string
  subheading?: string
  bullets?: { text: string }[]
  ctaLabel?: string
  ctaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  featuredProduct?: string
}

const perMonth = (annual?: number | null) =>
  annual != null ? `${(annual / 12).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}%` : null

/**
 * The homepage opener. Navy, gridded, and built around one instrument: the
 * featured product's rate card. A koperasi sells numbers — a rate, a ceiling,
 * a term — so the numbers are the picture, set large and tabular where a
 * poster would otherwise go. When a slide carries artwork it sits behind the
 * copy under a navy wash; the card stays.
 *
 * Every string here is CMS-editable through the Banner Utama block.
 */
export function HeroCarousel({
  slides, autoplay, interval = 8, badge, products,
}: {
  slides: Slide[]
  autoplay: boolean
  interval?: number
  badge?: string
  products: Product[]
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
  const slide = slides[index]!
  const product = slide.featuredProduct ? products.find((p) => p.id === slide.featuredProduct) : undefined

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Sorotan produk"
      className="relative isolate overflow-hidden bg-ink-900 text-white grid-dark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slide.image ? (
        <div className="absolute inset-0 -z-10" key={`img-${index}`}>
          <Media src={slide.image} alt="" ratio="auto" rounded={false} priority={index === 0} sizes="100vw"
            className="!absolute inset-0 size-full !rounded-none [&>*]:!object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/92 to-ink-900/55" />
        </div>
      ) : null}

      {/* A faint green glow from the top-left corner: the only soft element, and
          it reads as light on the panel rather than decoration. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[34rem] rounded-full bg-green-500/10 blur-[110px]" />

      <Shell>
        <div className="grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:py-24">
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
              <p className="rise d-3 mt-5 max-w-[48ch] text-[16px] leading-relaxed text-white/70 sm:text-[17px]">{slide.subheading}</p>
            ) : null}

            <div className="rise d-4 mt-8 flex flex-wrap gap-3">
              {slide.ctaLabel && slide.ctaHref ? (
                <Action href={slide.ctaHref} size="lg">
                  {slide.ctaLabel}
                  <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                </Action>
              ) : null}
              {slide.secondaryLabel && slide.secondaryHref ? (
                <Action href={slide.secondaryHref} variant="ghostLight" size="lg">
                  {slide.secondaryLabel}
                </Action>
              ) : null}
            </div>
          </div>

          <div key={`card-${index}`} className="rise d-3">
            {product ? <RateCard product={product} bullets={slide.bullets ?? []} /> : <TermsCard bullets={slide.bullets ?? []} />}
          </div>
        </div>
      </Shell>

      {slides.length > 1 ? (
        <Shell>
          <div className="flex items-center gap-2 pb-8">
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
function RateCard({ product, bullets }: { product: Product; bullets: { text: string }[] }) {
  const verified = product.ratePercent != null
  const annual = product.ratePercent ?? product.ratePercentIndicative ?? null
  const method = verified ? product.rateMethod : (product.rateMethodIndicative ?? product.rateMethod)
  const rate = perMonth(annual)
  const plafon = product.minAmount != null && product.maxAmount != null
    ? `${formatRupiahShort(product.minAmount)}–${formatRupiahShort(product.maxAmount)}` : null
  const tenor = product.tenorOptions.length
    ? `${Math.min(...product.tenorOptions)}–${Math.max(...product.tenorOptions)} bln` : null

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
    <div className="surface-dark relative overflow-hidden p-6 sm:p-7">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/70 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-white/50">{product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'}</p>
          <p className="mt-1 truncate text-[17px] font-bold text-white">{product.name}</p>
        </div>
        <Pill tone={verified ? 'light' : 'gold'}>
          {verified ? 'Suku bunga resmi' : 'Perkiraan'}
        </Pill>
      </div>

      <dl className="tnum mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-6">
        <div>
          <dt className="text-[12px] font-medium text-white/50">Bunga per bulan</dt>
          <dd className="figure mt-1.5 text-[2rem] text-gold-300 sm:text-[2.25rem]">{rate ?? '—'}</dd>
          {rate && !verified ? <dd className="mt-1 text-[11.5px] text-white/45">Mengacu materi publikasi, belum diverifikasi ulang</dd> : null}
        </div>
        <div>
          <dt className="text-[12px] font-medium text-white/50">Angsuran contoh</dt>
          <dd className="figure mt-1.5 text-[1.35rem] text-white sm:text-[1.5rem]">
            {example ? formatRupiah(example.monthly) : '—'}
          </dd>
          {example ? <dd className="mt-1 text-[11.5px] text-white/45">{formatRupiahShort(samplePrincipal)} · {sampleTenor} bln</dd> : null}
        </div>
        <div>
          <dt className="text-[12px] font-medium text-white/50">Plafon</dt>
          <dd className="mt-1.5 text-[15px] font-bold text-white">{plafon ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-medium text-white/50">Jangka waktu</dt>
          <dd className="mt-1.5 text-[15px] font-bold text-white">{tenor ?? '—'}</dd>
        </div>
      </dl>

      {bullets.length ? (
        <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
          {bullets.slice(0, 4).map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-white/80">
              <Icon.check className="mt-[3px] size-3.5 shrink-0 text-gold-300" />
              {b.text}
            </li>
          ))}
        </ul>
      ) : null}

      <Link href={href} className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white transition-colors hover:text-gold-200">
        Syarat &amp; ketentuan lengkap
        <Icon.arrowUpRight className="size-4" />
      </Link>
    </div>
  )
}

/** Fallback when a slide has no product attached: the terms panel from the approved design, in navy. */
function TermsCard({ bullets }: { bullets: { text: string }[] }) {
  if (!bullets.length) return null
  return (
    <div className="surface-dark relative overflow-hidden p-6 sm:p-7">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/70 to-transparent" />
      <p className="text-[12.5px] font-medium text-white/50">Ketentuan</p>
      <ul className="mt-4 divide-y divide-white/10">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 py-3 text-[15px] leading-relaxed text-white/85 first:pt-1 last:pb-0">
            <Icon.checkCircle className="mt-0.5 size-5 shrink-0 text-gold-300" />
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
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-gold-300 transition-colors duration-300 group-hover/qa:bg-green-600 group-hover/qa:text-white">
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
