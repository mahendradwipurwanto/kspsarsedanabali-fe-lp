'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Shell, Action, Icon, Pill } from '../ui'
import { Media } from '../ui/Media'

interface Slide {
  image?: string
  heading: string
  subheading?: string
  bullets?: { text: string }[]
  ctaLabel?: string
  ctaHref?: string
}

/**
 * Homepage banner, following the approved design: a full-bleed illustrated
 * banner with the offer headline and its conditions in a soft rounded panel,
 * plus a quick-access row into the two new features.
 */
export function HeroCarousel({ slides, autoplay }: { slides: Slide[]; autoplay: boolean }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback((next: number) => setIndex(((next % slides.length) + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (!autoplay || paused || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [autoplay, paused, slides.length])

  if (!slides.length) return null
  const slide = slides[index]!

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Sorotan produk"
      className="relative isolate bg-green-700"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10">
        <Media src={slide.image} alt="" ratio="auto" rounded={false} priority={index === 0} sizes="100vw"
          className="!absolute inset-0 size-full [&>*]:!object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-green-900/96 via-green-700/88 to-green-600/55" />
        {/* A second, vertical pass: keeps the top nav and the dots legible over
            any artwork the koperasi uploads later, however bright it is. */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-green-900/35 via-transparent to-green-900/35" />
      </div>

      <Shell>
        <div className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-14 lg:py-20">
          <div key={`copy-${index}`} className="max-w-[40ch]">
            <div className="rise d-1">
              <Pill tone="light">
                <Icon.spark className="mr-1.5 size-3.5" />
                Program Unggulan
              </Pill>
            </div>

            <h1 className="t-display rise d-2 mt-5 !text-white drop-shadow-sm">{slide.heading}</h1>

            {slide.subheading ? (
              <p className="rise d-3 mt-5 max-w-[46ch] text-[16px] leading-relaxed text-white/85 sm:text-[17px]">{slide.subheading}</p>
            ) : null}

            <div className="rise d-5 mt-8 flex flex-wrap gap-3">
              {slide.ctaLabel && slide.ctaHref ? (
                <Action href={slide.ctaHref} variant="light" size="lg">
                  {slide.ctaLabel}
                  <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                </Action>
              ) : null}
              <Action href="/profiling" variant="ghostLight" size="lg">
                <Icon.spark className="size-4" />
                Cari Produk yang Cocok
              </Action>
            </div>
          </div>

          {/* Conditions panel — the design's rounded card over the banner. */}
          {slide.bullets?.length ? (
            <div
              key={`terms-${index}`}
              className="rise d-4 relative overflow-hidden rounded-[1.25rem] border border-white/30 bg-gradient-to-b from-white to-[#fbfcfa] p-6 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.55)] backdrop-blur-sm sm:p-7"
            >
              {/* Gold seam: the one warm note against the green, used sparingly. */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
              <p className="t-label">Ketentuan</p>
              <ul className="mt-4 divide-y divide-line">
                {slide.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                    <Icon.checkCircle className="mt-0.5 size-5 shrink-0 text-green-600" />
                    <span className="text-[15px] leading-relaxed text-navy-700">{bullet.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
                className={`h-1 rounded-full transition-all duration-500 [transition-timing-function:var(--ease-settle)] ${
                  i === index ? 'w-10 bg-gold-200' : 'w-4 bg-white/35 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </Shell>
      ) : null}

      <span aria-live="polite" className="sr-only">Slide {index + 1} dari {slides.length}: {slide.heading}</span>
    </section>
  )
}

/**
 * Quick-access row sitting directly beneath the banner — one tap each to the
 * profiling wizard, the calculator, and the nearest-office finder.
 */
export function QuickAccess() {
  const items = [
    { href: '/profiling', icon: Icon.spark, title: 'Cari Produk yang Cocok', body: '4 pertanyaan singkat, ±30 detik' },
    { href: '/simulasi', icon: Icon.calculator, title: 'Simulasi Angsuran', body: 'Hitung perkiraan cicilan bulanan' },
    { href: '/lokasi', icon: Icon.pin, title: 'Kantor Terdekat', body: 'Jam buka, telepon, petunjuk arah' },
  ]
  return (
    <div className="ground-texture border-b border-line bg-surface-alt">
      <Shell>
        <ul className="grid gap-3 py-6 sm:grid-cols-3 lg:gap-4 lg:py-7">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="surface surface-i group/qa relative flex h-full items-center gap-4 overflow-hidden p-4 lg:p-5"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-green-400 to-green-600 transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/qa:scale-y-100"
                />
                <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-gradient-to-b from-green-50 to-[#e8f0e2] text-green-600 shadow-[var(--edge-top)] transition-colors duration-300 group-hover/qa:from-green-500 group-hover/qa:to-green-600 group-hover/qa:text-white">
                  <item.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold text-navy-800">{item.title}</span>
                  <span className="block truncate text-[12.5px] text-slate-400">{item.body}</span>
                </span>
                <Icon.arrow className="size-4 shrink-0 text-slate-300 transition-all duration-300 group-hover/qa:translate-x-1 group-hover/qa:text-green-600" />
              </a>
            </li>
          ))}
        </ul>
      </Shell>
    </div>
  )
}
