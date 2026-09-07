import type { CSSProperties, ReactNode } from 'react'
import type { OrgLevel, OrgColumn, OrgMember } from '@/contracts'

/**
 * The koperasi's structure as a chart rather than columns of names.
 *
 * Drawn in HTML and CSS on purpose. The chart libraries that do this —
 * d3-org-chart, react-d3-tree — paint SVG in the browser after the page loads,
 * which would put the whole board and every unit outside what Google reads;
 * react-organizational-chart is lighter but drags in a CSS-in-JS runtime for
 * styling this project already has tokens for. So the connectors are a few
 * absolutely positioned rules and the names stay in the markup as text.
 *
 * The chart takes an ordered list of levels and draws them top to bottom, so a
 * koperasi with four tiers or seven gets the same treatment as one with three.
 *
 * Below the small breakpoint the connectors are hidden and the levels stack,
 * because four rows of boxes cannot be read side by side on a phone.
 */

/**
 * How each tone paints a box. The chart used to hard-code navy at the top,
 * gold beside the line and green on the units; every box now takes its tone
 * from the block, and these are only the defaults it starts from.
 */
const TONE = {
  netral: 'border border-line bg-white text-ink-800',
  gelap: 'bg-ink-900 text-white',
  hijau: 'bg-green-700 text-white',
  emas: 'border border-gold-400 bg-gold-50 text-ink-800',
} as const

const toneOf = (value: string | undefined, fallback: keyof typeof TONE) =>
  TONE[(value ?? '') as keyof typeof TONE] ?? TONE[fallback]

/** The heading strip of a card, which keeps its own text colour when neutral. */
const HEAD_TONE = {
  netral: 'border-b border-line bg-paper text-green-700',
  gelap: 'bg-ink-900 text-white',
  hijau: 'bg-green-700 text-white',
  emas: 'border-b border-gold-400 bg-gold-50 text-ink-800',
} as const

const headToneOf = (value: string | undefined) =>
  HEAD_TONE[(value ?? '') as keyof typeof HEAD_TONE] ?? HEAD_TONE.netral

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const rows = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** The vertical line leaving the bottom of a level. */
function Stem() {
  return <span aria-hidden="true" className="mx-auto hidden h-7 w-px bg-line-strong sm:block" />
}

/**
 * The line below a level, with a box hanging off it — the internal auditor
 * answers to the board and sits beside the line on the koperasi's own chart,
 * rather than under it.
 */
function AsideStem({ label, tone }: { label: string; tone?: string }) {
  return (
    <>
      <div className="relative mx-auto hidden h-14 w-px bg-line-strong sm:block">
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-px w-14 bg-line-strong" />
        <p className={`absolute left-14 top-1/2 w-fit -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-tile)] px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.08em] ${toneOf(tone, 'emas')}`}>
          {label}
        </p>
      </div>
      <p className={`mx-auto mt-4 w-fit rounded-[var(--radius-tile)] px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.08em] sm:hidden ${toneOf(tone, 'emas')}`}>
        {label}
      </p>
    </>
  )
}

function Tier({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="relative">
      {count > 1 ? (
        <span
          aria-hidden="true"
          className="absolute top-0 hidden h-px bg-line-strong sm:block"
          style={{ left: `${50 / count}%`, right: `${50 / count}%` }}
        />
      ) : null}
      <div
        className="mt-4 grid gap-4 [grid-template-columns:minmax(0,1fr)] sm:mt-0 sm:[grid-template-columns:var(--cols)]"
        style={{ '--cols': `repeat(${count}, minmax(0, 1fr))` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}

/** A child of the level above: its own drop line, then the content. */
function Node({ children }: { children: ReactNode }) {
  return (
    <div className="relative sm:pt-7">
      <span aria-hidden="true" className="absolute left-1/2 top-0 hidden h-7 w-px bg-line-strong sm:block" />
      {children}
    </div>
  )
}

function Box({ label, tone }: { label: string; tone?: string }) {
  return (
    <p className={`mx-auto w-fit rounded-[var(--radius-tile)] px-6 py-3 text-center text-[13px] font-bold uppercase tracking-[0.1em] ${toneOf(tone, 'gelap')}`}>
      {label}
    </p>
  )
}

/** One card: a heading strip with the people listed inside it. */
function CardColumn({ column }: { column: OrgColumn }) {
  const members = rows<OrgMember>(column.members).filter((m) => text(m.name))
  return (
    <div className="surface h-full overflow-hidden">
      {text(column.title) ? (
        <h3 className={`px-5 py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.09em] ${headToneOf(column.tone)}`}>
          {column.title}
        </h3>
      ) : null}
      <ul className="divide-y divide-line">
        {members.map((m, i) => (
          <li key={i} className="px-5 py-3 text-center">
            <p className="text-[14.5px] font-bold leading-snug text-ink-900">{m.name}</p>
            {text(m.role) ? <p className="mt-0.5 text-[12px] text-ink-400">{m.role}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A heading box with each entry as its own chip below it. */
function ListColumn({ column }: { column: OrgColumn }) {
  const members = rows<OrgMember>(column.members).filter((m) => text(m.name))
  return (
    <div className="h-full">
      {text(column.title) ? (
        <p className={`rounded-[var(--radius-tile)] px-4 py-2.5 text-center text-[12.5px] font-bold uppercase tracking-[0.07em] ${toneOf(column.tone, 'hijau')}`}>
          {column.title}
        </p>
      ) : null}
      {members.length ? (
        <ul className="mt-3 grid gap-2">
          {members.map((m, i) => (
            <li key={i} className="rounded-[var(--radius-tile)] border border-line bg-white px-3.5 py-2 text-center text-[12.5px] font-semibold text-ink-700">
              {m.name}
              {text(m.role) ? <span className="mt-0.5 block text-[11.5px] font-normal text-ink-400">{m.role}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function OrgChart({ levels }: { levels: OrgLevel[] }) {
  if (!levels.length) return null

  return (
    <div className="mx-auto max-w-4xl">
      {levels.map((level, i) => {
        const aside = text(level.aside)
        const last = i === levels.length - 1
        const columns = rows<OrgColumn>(level.columns).filter((c) => text(c.title) || rows<OrgMember>(c.members).some((m) => text(m.name)))

        return (
          <div key={i}>
            {level.kind === 'kolom' ? (
              columns.length ? (
                <Tier count={columns.length}>
                  {columns.map((column, j) => (
                    <Node key={j}>
                      {level.style === 'daftar' ? <ListColumn column={column} /> : <CardColumn column={column} />}
                    </Node>
                  ))}
                </Tier>
              ) : null
            ) : (
              <Box label={text(level.title)} tone={level.tone} />
            )}

            {/* The spine to the next level: with an aside box when this level
                carries one, a plain stem otherwise, and nothing at the end. */}
            {last ? null : aside ? <AsideStem label={aside} tone={level.asideTone} /> : <Stem />}
          </div>
        )
      })}
    </div>
  )
}
