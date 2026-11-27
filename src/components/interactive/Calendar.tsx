'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

/**
 * A month calendar for choosing one day — the body of every date picker.
 *
 * The browser's own date box looks different in every browser, writes dates
 * the American way on some machines, and on a phone opens a wheel that takes
 * forty flicks to reach a birth year. This one always reads in Indonesian,
 * starts the week on Monday, and jumps by month or by year from its header.
 *
 * It is plain React with no positioning of its own, so the console can put it
 * in a Radix popover and the website in a light one of its own. The two apps
 * keep the same copy of this file on purpose (as with PdfReader).
 *
 * Dates are "YYYY-MM-DD" strings in local time, the same value an
 * <input type="date"> gives, so swapping a picker in changes nothing upstream.
 */

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const pad = (n: number) => String(n).padStart(2, '0')
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** "2026-11-27" → a local Date, or null for anything that is not a real day. */
export function parseIsoDate(v: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 ? d : null
}

/** "27 November 2026". */
export function dateLabel(v: string | null | undefined): string {
  const d = parseIsoDate(v)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''
}

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && toIsoDate(a) === toIsoDate(b)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** The same day n months on, kept inside the month (31 Jan + 1 month = 28/29 Feb). */
function addMonths(d: Date, n: number) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last))
}

type View = 'days' | 'months' | 'years'

export function Calendar({ value, onSelect, min, max, onClear, autoFocus = true }: {
  value: string
  onSelect: (iso: string) => void
  /** The first and last day that may be chosen, as "YYYY-MM-DD". */
  min?: string
  max?: string
  /** Shows "Hapus" when the date may be left empty. */
  onClear?: () => void
  autoFocus?: boolean
}) {
  const chosen = parseIsoDate(value)
  const today = useMemo(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()) }, [])
  const lo = parseIsoDate(min)
  const hi = parseIsoDate(max)
  const allowed = (d: Date) => (!lo || d >= lo) && (!hi || d <= hi)

  /** The day with the keyboard focus; the month on show follows it. */
  const [focus, setFocus] = useState<Date>(() => chosen ?? (hi && today > hi ? hi : lo && today < lo ? lo : today))
  const [view, setView] = useState<View>('days')
  const grid = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  // Keep the focused cell focused as it moves, once the person has started using the keyboard or opened the picker.
  useEffect(() => {
    if (view !== 'days' || (!autoFocus && !moved.current)) return
    grid.current?.querySelector<HTMLElement>('[data-focus="true"]')?.focus({ preventScroll: true })
  }, [focus, view, autoFocus])

  const year = focus.getFullYear()
  const month = focus.getMonth()

  // Six weeks from the Monday on or before the 1st: the grid never changes height.
  const first = new Date(year, month, 1)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))

  function onKey(e: KeyboardEvent) {
    const step: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -((focus.getDay() + 6) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
    }
    const go = step[e.key]
    if (go) {
      e.preventDefault()
      e.stopPropagation()
      moved.current = true
      setFocus(go())
    } else if ((e.key === 'Enter' || e.key === ' ') && allowed(focus)) {
      e.preventDefault()
      onSelect(toIsoDate(focus))
    }
  }

  const navBtn = 'grid size-8 place-items-center rounded-[6px] text-ink-500 transition-colors hover:bg-paper hover:text-ink-900 disabled:opacity-30'
  const pick = (d: Date) => setFocus(d)

  return (
    <div className="w-[284px] select-none p-3 text-ink-800" role="group" aria-label="Pilih tanggal">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          className={navBtn}
          aria-label={view === 'days' ? 'Bulan sebelumnya' : view === 'months' ? 'Tahun sebelumnya' : '12 tahun sebelumnya'}
          onClick={() => pick(view === 'days' ? addMonths(focus, -1) : addMonths(focus, view === 'months' ? -12 : -144))}
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'days' ? 'months' : 'years')}
          disabled={view === 'years'}
          className="rounded-[6px] px-2 py-1 text-[13.5px] font-bold text-ink-900 transition-colors hover:bg-paper disabled:hover:bg-transparent"
          aria-label={view === 'days' ? 'Pilih bulan dan tahun' : 'Pilih tahun'}
        >
          {view === 'days' ? `${MONTHS[month]} ${year}` : view === 'months' ? year : `${year - (year % 12)}–${year - (year % 12) + 11}`}
        </button>
        <button
          type="button"
          className={navBtn}
          aria-label={view === 'days' ? 'Bulan berikutnya' : view === 'months' ? 'Tahun berikutnya' : '12 tahun berikutnya'}
          onClick={() => pick(view === 'days' ? addMonths(focus, 1) : addMonths(focus, view === 'months' ? 12 : 144))}
        >
          <Chevron dir="right" />
        </button>
      </div>

      {view === 'days' ? (
        <>
          <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-400" aria-hidden="true">
            {DAYS.map((d) => <span key={d} className="py-1">{d}</span>)}
          </div>
          <div ref={grid} role="grid" aria-label={`${MONTHS[month]} ${year}`} className="grid grid-cols-7 gap-0.5" onKeyDown={onKey}>
            {cells.map((d) => {
              const inMonth = d.getMonth() === month
              const isChosen = sameDay(d, chosen)
              const isToday = sameDay(d, today)
              const isFocus = sameDay(d, focus)
              const ok = allowed(d)
              return (
                <button
                  key={toIsoDate(d)}
                  type="button"
                  role="gridcell"
                  tabIndex={isFocus ? 0 : -1}
                  data-focus={isFocus}
                  aria-selected={isChosen}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={dateLabel(toIsoDate(d))}
                  disabled={!ok}
                  onClick={() => onSelect(toIsoDate(d))}
                  onFocus={() => { if (!isFocus) setFocus(d) }}
                  className={[
                    'tnum grid h-9 place-items-center rounded-[6px] text-[13px] outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1',
                    'disabled:cursor-not-allowed disabled:text-ink-200 disabled:line-through',
                    isChosen
                      ? 'bg-green-600 font-semibold text-white hover:bg-green-700'
                      : `${inMonth ? 'text-ink-800' : 'text-ink-300'} hover:bg-paper ${isToday ? 'font-semibold text-green-700 ring-1 ring-inset ring-green-600/40' : ''}`,
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </>
      ) : view === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => { setFocus(addMonths(new Date(year, 0, Math.min(focus.getDate(), 28)), i)); setView('days') }}
              className={[
                'rounded-[6px] py-2.5 text-[13px] transition-colors',
                chosen && chosen.getFullYear() === year && chosen.getMonth() === i ? 'bg-green-600 font-semibold text-white' : 'text-ink-700 hover:bg-paper',
              ].join(' ')}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => year - (year % 12) + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => { setFocus(new Date(y, month, Math.min(focus.getDate(), 28))); setView('months') }}
              className={[
                'tnum rounded-[6px] py-2.5 text-[13px] transition-colors',
                chosen?.getFullYear() === y ? 'bg-green-600 font-semibold text-white' : y === today.getFullYear() ? 'font-semibold text-green-700 hover:bg-paper' : 'text-ink-700 hover:bg-paper',
              ].join(' ')}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <button
          type="button"
          disabled={!allowed(today)}
          onClick={() => onSelect(toIsoDate(today))}
          className="rounded-[6px] px-2 py-1 text-[12.5px] font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-40"
        >
          Hari ini
        </button>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-[6px] px-2 py-1 text-[12.5px] font-semibold text-ink-500 transition-colors hover:bg-paper hover:text-ink-900"
          >
            Hapus
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'} />
    </svg>
  )
}
