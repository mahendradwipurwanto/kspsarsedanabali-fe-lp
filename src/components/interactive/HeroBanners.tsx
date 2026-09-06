'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Shell, Action, Icon } from '../ui'
import { Media } from '../ui/Media'

export interface Banner {
  image: string
  alt: string
  heading?: string
  subheading?: string
  ctaLabel?: string
  ctaHref?: string
  link?: string
}

const RATIOS: Record<'wide' | 'standard' | 'tall', string> = {
  wide: 'aspect-[4/3] sm:aspect-[21/9]',
  standard: 'aspect-[4/3] sm:aspect-[16/9]',
  tall: 'aspect-[4/5] sm:aspect-[3/2]',
}

const external = (href: string) => /^https?:\/\//i.test(href)

/**
 * The banner style of the homepage opener: the artwork is the message, the way
 * the koperasi's printed spanduk work, with optional copy laid over it.
 *
 * The page still gets exactly one H1. With text over the image it is the
 * banner's heading; with the image alone it is the alt text, kept for
 * screen readers and search engines only.
 */
export function HeroBanners({
  banners, autoplay, interval = 8, text, height,
}: {
  banners: Banner[]
  autoplay: boolean
  interval?: number
  text: 'overlay' | 'none'
  height: 'wide' | 'standard' | 'tall'
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!autoplay || paused || banners.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), Math.max(3, interval) * 1000)
    return () => clearInterval(timer)
  }, [autoplay, paused, banners.length, interval])

  if (!banners.length) return null
  const current = banners[index]!
  const cta = current.ctaLabel && current.ctaHref ? { label: current.ctaLabel, href: current.ctaHref } : null
  const showText = text === 'overlay' && Boolean(current.heading || current.subheading || cta)
  const wholeLink = !cta && current.link ? current.link : null
  const title = current.heading || current.alt

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Banner utama"
      className="relative isolate overflow-hidden bg-ink-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={`relative w-full ${RATIOS[height] ?? RATIOS.wide}`}>
        {banners.map((banner, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 [transition-timing-function:var(--ease-settle)] ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <Media src={banner.image} alt={banner.alt} ratio="auto" rounded={false} priority={i === 0} sizes="100vw"
              className="!absolute inset-0 size-full !rounded-none [&>*]:!object-cover" />
          </div>
        ))}

        {showText ? (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink-900/85 via-ink-900/25 to-transparent">
            <Shell className="pb-12 sm:pb-14 lg:pb-20">
              <div key={index} className="max-w-[46ch]">
                {current.heading ? <h1 className="t-display rise d-1 !text-white">{current.heading}</h1> : <h1 className="sr-only">{title}</h1>}
                {current.subheading ? <p className="rise d-2 mt-4 text-[16px] leading-relaxed text-white/80 sm:text-[17px]">{current.subheading}</p> : null}
                {cta ? (
                  <div className="rise d-3 mt-6">
                    <Action href={cta.href} external={external(cta.href)} size="lg">
                      {cta.label}
                      <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
                    </Action>
                  </div>
                ) : null}
              </div>
            </Shell>
          </div>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}

        {wholeLink ? (
          external(wholeLink)
            ? <a href={wholeLink} target="_blank" rel="noopener noreferrer" aria-label={title} className="absolute inset-0 z-10" />
            : <Link href={wholeLink} aria-label={title} className="absolute inset-0 z-10" />
        ) : null}
      </div>

      {banners.length > 1 ? (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 sm:bottom-5">
          {banners.map((banner, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Banner ${i + 1}: ${banner.heading || banner.alt}`}
              aria-current={i === index}
              className={`h-[3px] rounded-full transition-all duration-500 [transition-timing-function:var(--ease-settle)] ${i === index ? 'w-10 bg-gold-300' : 'w-5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      ) : null}

      <span aria-live="polite" className="sr-only">Banner {index + 1} dari {banners.length}: {title}</span>
    </section>
  )
}
