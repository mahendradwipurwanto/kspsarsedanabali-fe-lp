'use client'

import { useState } from 'react'
import type { DocumentItem } from '@/lib/api'
import { Icon, iconByName } from '../ui'
import { Media } from '../ui/Media'

/**
 * The kinds are rows the koperasi manages — name, icon, order — and each
 * document arrives with its own kind joined on, so the tab strip is built from
 * the documents themselves and never from a list frozen here. A kind whose row
 * has gone (or a document from before kinds existed) still gets a tab, named
 * after its slug, rather than disappearing from the shelf.
 */
interface Kind { slug: string; name: string; icon: string; order: number }

function kindsOf(items: DocumentItem[]): Kind[] {
  const seen = new Map<string, Kind>()
  for (const d of items) {
    if (seen.has(d.category)) continue
    seen.set(d.category, {
      slug: d.category,
      name: d.categoryName ?? d.category.charAt(0).toUpperCase() + d.category.slice(1),
      icon: d.categoryIcon ?? 'file-text',
      order: d.categoryOrder ?? Number.MAX_SAFE_INTEGER,
    })
  }
  return [...seen.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'id'))
}

/**
 * The shape of an annual-report archive: a shelf of covers.
 *
 * Every document is a card — cover, year, title — because that is how people
 * recognise a report they have already seen, and how an archive stretching
 * back years stays scannable. A document without a cover keeps its place on
 * the shelf under the koperasi's own mark rather than dropping to a lesser
 * row.
 *
 * With every category on the page the shelf grows a tab strip; with one
 * category it is a single section under its own label. The tabs are the only
 * script here — the grid, the covers and the links are plain markup.
 */
export function DocumentShelf({ items, single }: { items: DocumentItem[]; single?: string }) {
  // Only the kinds that actually hold something — an empty tab is a promise of
  // documents that do not exist.
  const kinds = kindsOf(items)
  const tabs = single ? [] : kinds
  const [active, setActive] = useState<string>(tabs[0]?.slug ?? single ?? '')

  const shown = single ? items : items.filter((d) => d.category === active)
  const current = kinds.find((k) => k.slug === (single ?? active)) ?? { slug: single ?? active, name: single ?? active, icon: 'file-text', order: 0 }

  return (
    <div>
      {tabs.length > 1 ? (
        <div role="tablist" aria-label="Jenis dokumen" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((m) => {
            const key = m.slug
            const Glyph = iconByName(m.icon)
            const on = key === active
            return (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`docs-${key}`}
                onClick={() => setActive(key)}
                className={`group/tab relative flex shrink-0 flex-col items-center gap-2 px-5 pb-3 pt-2 text-[13px] font-semibold transition-colors ${
                  on ? 'text-green-700' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                <span className={`grid size-11 place-items-center rounded-[var(--radius-tile)] ring-1 ring-inset transition-colors ${
                  on ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-paper text-ink-500 ring-line group-hover/tab:text-ink-900'
                }`}>
                  <Glyph className="size-5" />
                </span>
                {m.name}
                <span aria-hidden="true" className={`absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-green-600 transition-transform duration-300 [transition-timing-function:var(--ease-settle)] ${on ? 'scale-x-100' : 'scale-x-0'}`} />
              </button>
            )
          })}
        </div>
      ) : null}

      <section id={`docs-${single ?? active}`} className="surface overflow-hidden">
        <h3 className="border-b border-line bg-paper px-5 py-3 text-[13.5px] font-bold text-ink-700">{current.name}</h3>

        <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 sm:gap-5 sm:p-5 lg:grid-cols-4">
          {shown.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/doc flex h-full flex-col items-center rounded-[var(--radius-card)] border border-line bg-surface px-4 pb-5 pt-6 text-center transition-[border-color,box-shadow,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raised)]"
              >
                {/* A book cover: portrait, with the drop shadow a printed
                    report casts on a table. Kept narrower than the card so it
                    reads as an object on a shelf, not a banner. */}
                <span className="block w-[68%] max-w-[160px] shadow-[0_10px_24px_-12px_rgb(15_27_45/0.45)] transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/doc:scale-[1.03]">
                  <Media
                    src={doc.coverImage}
                    alt=""
                    ratio="3/4"
                    sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 160px"
                    fallbackLabel={doc.year ? String(doc.year) : current.name}
                  />
                </span>

                {doc.year ? <span className="tnum mt-5 text-[15px] font-bold text-ink-900">{doc.year}</span> : null}
                <span aria-hidden="true" className={`block h-[2px] w-6 rounded-full bg-green-600 ${doc.year ? 'mt-2' : 'mt-5'}`} />
                <span className="mt-2.5 line-clamp-3 text-[13.5px] font-semibold leading-snug text-green-700 transition-colors group-hover/doc:text-green-800">
                  {doc.title}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12.5px] font-semibold text-ink-400 transition-colors group-hover/doc:text-green-700">
                  Unduh <Icon.download className="size-3.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
