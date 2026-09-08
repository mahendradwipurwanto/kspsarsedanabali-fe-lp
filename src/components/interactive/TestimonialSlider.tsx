'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Testimonial } from '@/lib/api'
import { Card, Icon } from '../ui'

/**
 * Member quotes.
 *
 * Up to three, they are a plain grid: a carousel with nothing to page through
 * is a control that lies. Past three the same rail becomes a carousel — arrows,
 * dots, and a live count — because the row would otherwise wrap into a second
 * line of cards nobody scrolls to.
 *
 * Both forms are the same scroll-snap rail underneath, so touch, trackpad and
 * keyboard scrolling keep working and the cards are laid out by CSS rather than
 * by script: no layout shift, and everything is readable before JS arrives.
 */
export function TestimonialSlider({ items }: { items: Testimonial[] }) {
  if (!items.length) return null
  if (items.length > 3) return <TestimonialCarousel items={items} />

  return (
    <ul className="rail -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {items.map((item) => (
        <TestimonialCard key={item.id} item={item} className="min-w-[85%] sm:min-w-0" />
      ))}
    </ul>
  )
}

/**
 * Three across on a desktop, two on a tablet, one on a phone — and the arrows
 * move by a whole screenful, so the visitor never lands mid-card.
 *
 * Paging is done by scrolling the rail rather than by re-rendering a slice of
 * the list: every card stays in the DOM, so a screen reader can walk the lot
 * and the browser's own find-in-page still reaches them.
 */
function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const rail = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  const measure = useCallback(() => {
    const el = rail.current
    if (!el) return
    // A fractional last page still counts as a page; rounding it away left the
    // final card unreachable by the arrows.
    setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.02)))
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    const el = rail.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, items.length])

  const go = (next: number) => {
    const el = rail.current
    if (!el) return
    el.scrollTo({ left: Math.min(Math.max(next, 0), pages - 1) * el.clientWidth, behavior: 'smooth' })
  }

  const atStart = page <= 0
  const atEnd = page >= pages - 1

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Testimoni anggota"
    >
      <ul
        ref={rail}
        onScroll={measure}
        tabIndex={0}
        className="rail -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 focus-visible:outline-none sm:mx-0 sm:px-0"
      >
        {items.map((item) => (
          <TestimonialCard
            key={item.id}
            item={item}
            // Thirds of the rail minus its share of the gaps, so three cards sit
            // exactly across with the fourth peeking in as the hint to scroll.
            className="w-[85%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
          />
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Halaman testimoni">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              onClick={() => go(i)}
              aria-selected={i === page}
              aria-label={`Halaman ${i + 1} dari ${pages}`}
              className={`h-[3px] rounded-full transition-all duration-500 [transition-timing-function:var(--ease-settle)] ${
                i === page ? 'w-10 bg-green-700' : 'w-5 bg-ink-200 hover:bg-ink-300'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Arrow label="Testimoni sebelumnya" onClick={() => go(page - 1)} disabled={atStart}>
            <Icon.arrow className="size-4 rotate-180" />
          </Arrow>
          <Arrow label="Testimoni berikutnya" onClick={() => go(page + 1)} disabled={atEnd}>
            <Icon.arrow className="size-4" />
          </Arrow>
        </div>
      </div>

      <span aria-live="polite" className="sr-only">Halaman {page + 1} dari {pages}</span>
    </div>
  )
}

function Arrow({
  label, onClick, disabled, children,
}: {
  label: string; onClick: () => void; disabled: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-[var(--radius-tile)] border border-line bg-surface text-ink-700 transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-white disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function TestimonialCard({ item, className = '' }: { item: Testimonial; className?: string }) {
  return (
    <Card as="li" hover className={`flex shrink-0 snap-start flex-col p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-0.5 text-gold-400" aria-label={`Penilaian ${item.rating} dari 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Icon.star key={i} className={`size-[15px] ${i < item.rating ? '' : 'text-ink-100'}`} />
          ))}
        </div>
        {/* Set as a glyph rather than an icon: a quotation mark should look
            like typography, at the scale typography is set. */}
        <span aria-hidden="true" className="-mt-2 select-none font-serif text-[44px] leading-none text-gold-200">&rdquo;</span>
      </div>

      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-700">
        “{item.quote}”
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        {/* The photo, when the koperasi has one. Initials were the only
            thing ever drawn here, so a photo uploaded in the console never
            reached the page. */}
        {item.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            loading="lazy"
            className="size-10 shrink-0 rounded-[var(--radius-tile)] border border-line object-cover"
          />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-[12.5px] font-bold text-gold-300">
            {item.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-ink-900">{item.name}</span>
          <span className="block truncate text-[12.5px] text-ink-400">
            {[item.role, item.location].filter(Boolean).join(' · ')}
          </span>
        </span>
      </figcaption>
    </Card>
  )
}
