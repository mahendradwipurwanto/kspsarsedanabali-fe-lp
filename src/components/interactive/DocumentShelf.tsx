'use client'

import { useState } from 'react'
import type { DocumentItem } from '@/lib/api'
import { Icon, iconByName } from '../ui'
import { Media } from '../ui/Media'

/**
 * The kinds are rows the koperasi manages — name, icon, order — handed in by
 * the block, so a kind is listed whether or not anything sits on it yet: the
 * pill row is the category list, not a summary of what happens to exist.
 *
 * A document whose kind is not among them — its row deleted, or a file from
 * before kinds existed — still gets a pill of its own, named from what the
 * document carries, rather than dropping off the shelf.
 */
export interface Kind { slug: string; name: string; icon: string; order: number }

function withStrays(kinds: Kind[], items: DocumentItem[]): Kind[] {
  const known = new Set(kinds.map((k) => k.slug))
  const strays = new Map<string, Kind>()
  for (const d of items) {
    if (known.has(d.category) || strays.has(d.category)) continue
    strays.set(d.category, {
      slug: d.category,
      name: d.categoryName ?? d.category.charAt(0).toUpperCase() + d.category.slice(1),
      icon: d.categoryIcon ?? 'file-text',
      order: d.categoryOrder ?? Number.MAX_SAFE_INTEGER,
    })
  }
  return [...kinds, ...[...strays.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'id'))]
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
 * With more than one kind on the page, a row of pills sits above the shelves:
 * "Semua" shows each kind that holds something as its own labelled shelf, one
 * after another, and a kind's pill narrows the page to that shelf alone — an
 * empty kind says so in its own words rather than vanishing. With a single
 * kind there is nothing to choose, so the pills stay away. The pills are the
 * only script here — the shelves, the covers and the links are plain markup.
 */
export function DocumentShelf({ items, kinds: named }: { items: DocumentItem[]; kinds: Kind[] }) {
  const kinds = withStrays(named, items)
  const count = (slug: string) => items.filter((d) => d.category === slug).length
  const [active, setActive] = useState<string>('')
  // Under Semua an empty kind is skipped — a run of empty shelves is noise —
  // but chosen by its pill it is shown, so the visitor learns it is empty
  // rather than wondering whether the pill did anything.
  const shown = active ? kinds.filter((k) => k.slug === active) : kinds.filter((k) => count(k.slug) > 0)

  return (
    <div>
      {kinds.length > 1 ? (
        <div role="tablist" aria-label="Jenis dokumen" className="mb-6 flex flex-wrap items-center gap-2">
          <Pill on={active === ''} onClick={() => setActive('')} controls="docs-semua">
            Semua
            <Count on={active === ''} n={items.length} />
          </Pill>
          {kinds.map((k) => {
            const Glyph = iconByName(k.icon)
            const on = active === k.slug
            return (
              <Pill key={k.slug} on={on} onClick={() => setActive(k.slug)} controls={`docs-${k.slug}`}>
                <Glyph className="size-3.5" />
                {k.name}
                <Count on={on} n={count(k.slug)} />
              </Pill>
            )
          })}
        </div>
      ) : null}

      <div id="docs-semua" className="grid gap-6">
        {shown.length ? shown.map((k) => (
          <Shelf key={k.slug} kind={k} items={items.filter((d) => d.category === k.slug)} />
        )) : (
          <p className="rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-paper px-6 py-10 text-center text-[14.5px] text-ink-500">
            Belum ada dokumen yang diunggah.
          </p>
        )}
      </div>
    </div>
  )
}

function Pill({
  on, onClick, controls, children,
}: {
  on: boolean; onClick: () => void; controls: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold ring-1 ring-inset transition-[background-color,color,box-shadow] duration-200 ${
        on
          ? 'bg-green-700 text-white ring-green-700'
          : 'bg-surface text-ink-700 ring-line hover:bg-green-50 hover:text-green-800 hover:ring-green-200'
      }`}
    >
      {children}
    </button>
  )
}

/** How many a pill would show, set quietly beside its name. */
function Count({ on, n }: { on: boolean; n: number }) {
  return <span className={`tnum ml-0.5 text-[11.5px] ${on ? 'text-white/70' : 'text-ink-400'}`}>{n}</span>
}

/** One kind's shelf: its label on a strip, its documents as cover cards. */
function Shelf({ kind, items }: { kind: Kind; items: DocumentItem[] }) {
  return (
    <section id={`docs-${kind.slug}`} className="surface overflow-hidden">
      <h3 className="border-b border-line bg-paper px-5 py-3 text-[13.5px] font-bold text-ink-700">{kind.name}</h3>

      {!items.length ? (
        <p className="px-5 py-8 text-center text-[14px] text-ink-500">Belum ada dokumen di jenis ini.</p>
      ) : (
      <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 sm:gap-5 sm:p-5 lg:grid-cols-4">
        {items.map((doc) => (
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
                  fallbackLabel={doc.year ? String(doc.year) : kind.name}
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
      )}
    </section>
  )
}
