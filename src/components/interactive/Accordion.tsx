'use client'

import { useState } from 'react'
import { Icon } from '../ui'

/** Ruled disclosure list. One open at a time; the open row carries a gold seam. */
export function Accordion({ items, defaultOpen = 0 }: { items: { title: string; body: string }[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen)

  return (
    <div className="surface divide-y divide-line overflow-hidden">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={i} className={`relative transition-colors duration-300 ${isOpen ? 'bg-paper' : 'bg-white'}`}>
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-gold-300 to-gold-400 transition-transform duration-500 [transition-timing-function:var(--ease-settle)] ${
                isOpen ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`acc-${i}`}
                className="group/acc flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-paper sm:px-6"
              >
                <span className={`flex-1 text-[15px] font-bold transition-colors sm:text-[16px] ${isOpen ? 'text-ink-900' : 'text-ink-800 group-hover/acc:text-ink-900'}`}>
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-[var(--radius-tile)] border transition-all duration-300 [transition-timing-function:var(--ease-settle)] ${
                    isOpen ? 'rotate-180 border-ink-900 bg-ink-900 text-gold-300' : 'border-line bg-white text-ink-500 group-hover/acc:border-ink-900 group-hover/acc:text-ink-900'
                  }`}
                >
                  <Icon.chevron className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={`acc-${i}`}
              hidden={!isOpen}
              className="prose-ksp px-5 pb-6 text-[14.5px] sm:px-6"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
          </div>
        )
      })}
    </div>
  )
}
