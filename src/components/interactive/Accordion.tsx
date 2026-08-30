'use client'

import { useState } from 'react'
import { Icon } from '../ui'

/** Rounded disclosure cards, matching the design's card language. */
export function Accordion({ items, defaultOpen = 0 }: { items: { title: string; body: string }[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen)

  return (
    <div className="grid gap-3">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-[var(--radius-card)] border bg-gradient-to-b from-white to-[#fbfcfa] transition-all duration-300 [transition-timing-function:var(--ease-swift)] ${
              isOpen ? 'border-green-200 shadow-[var(--shadow-raised)]' : 'border-line shadow-[var(--shadow-card)]'
            }`}
          >
            {/* Gold seam marks the open panel — the same device as the cards. */}
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-gold-300 to-gold-200 transition-transform duration-500 [transition-timing-function:var(--ease-settle)] ${
                isOpen ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`acc-${i}`}
                className="group/acc flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-green-50/60 sm:px-6"
              >
                <span className={`flex-1 text-[15px] font-bold transition-colors sm:text-[16px] ${isOpen ? 'text-green-700' : 'text-navy-800 group-hover/acc:text-green-700'}`}>
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full shadow-[var(--edge-top)] transition-all duration-300 [transition-timing-function:var(--ease-settle)] ${
                    isOpen
                      ? 'rotate-180 bg-gradient-to-b from-green-500 to-green-700 text-white shadow-[var(--shadow-green)]'
                      : 'bg-gradient-to-b from-green-50 to-[#e8f0e2] text-green-600'
                  }`}
                >
                  <Icon.chevron className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={`acc-${i}`}
              hidden={!isOpen}
              className="prose-ksp border-t border-line px-5 py-5 text-[14.5px] sm:px-6"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
          </div>
        )
      })}
    </div>
  )
}
