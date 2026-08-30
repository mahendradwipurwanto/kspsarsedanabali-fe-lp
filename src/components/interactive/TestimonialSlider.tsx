'use client'

import type { Testimonial } from '@/lib/api'
import { Card, Icon } from '../ui'

/**
 * Scroll-snap rail on mobile, grid on desktop. No JS carousel: no layout shift,
 * native touch and keyboard, zero script cost.
 */
export function TestimonialSlider({ items }: { items: Testimonial[] }) {
  return (
    <ul className="rail -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {items.map((item) => (
        <Card as="li" key={item.id} hover className="flex min-w-[85%] shrink-0 snap-start flex-col p-6 sm:min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-0.5 text-gold-300" aria-label={`Penilaian ${item.rating} dari 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Icon.star key={i} className={`size-[15px] ${i < item.rating ? '' : 'text-slate-200'}`} />
              ))}
            </div>
            {/* Set as a glyph rather than an icon — a quotation mark should look
                like typography, at the scale typography is set. */}
            <span aria-hidden="true" className="-mt-2 select-none text-[42px] leading-none text-green-100">&rdquo;</span>
          </div>

          <blockquote className="mt-4 flex-1 text-[14.5px] italic leading-relaxed text-slate-600">
            “{item.quote}”
          </blockquote>

          <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-600 text-[13px] font-bold text-white">
              {item.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold text-navy-800">{item.name}</span>
              <span className="block truncate text-[12.5px] text-slate-400">
                {[item.role, item.location].filter(Boolean).join(' · ')}
              </span>
            </span>
          </figcaption>
        </Card>
      ))}
    </ul>
  )
}
