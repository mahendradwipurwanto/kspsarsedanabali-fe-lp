'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, dateLabel } from './Calendar'

/**
 * A date question on a public form: a button that reads "27 November 2026"
 * and opens the Calendar beneath it, or above it when the bottom of the
 * screen leaves no room.
 *
 * The browser's own date box was a different control on every phone, and on
 * an iPhone a wheel that takes dozens of flicks to reach a birth year; the
 * calendar's header jumps by month and year instead.
 *
 * The calendar is drawn into <body> at a fixed position rather than inside
 * the question: the form's card clips what overflows it, which would cut a
 * calendar under the last question in half.
 *
 * The value is "YYYY-MM-DD", what <input type="date"> gave, so the answer the
 * API receives is unchanged.
 */

/** The calendar's size, for deciding where it fits before it is drawn. */
const PANEL_W = 286
const PANEL_H = 380
const GAP = 6

export function DateField({ id, value, onChange, label, invalid, className }: {
  id: string
  value: string
  onChange: (v: string) => void
  label: string
  invalid?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const text = dateLabel(value)

  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom
    const up = below < PANEL_H + GAP && r.top > below
    setAt({
      top: up ? Math.max(8, r.top - PANEL_H - GAP) : r.bottom + GAP,
      left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)),
    })
  }, [])

  useLayoutEffect(() => { if (open) place() }, [open, place])

  useEffect(() => {
    if (!open) return
    // A tap anywhere else, or Escape, closes it; Escape gives the focus back to the button.
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    // It follows the button while the page scrolls under it.
    const follow = () => place()
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open, place])

  const close = (v: string) => { onChange(v); setOpen(false); button.current?.focus() }

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={button}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label={`${label}${text ? `: ${text}` : ', pilih tanggal'}`}
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex min-h-[48px] w-full items-center gap-2.5 rounded-[var(--radius-input)] border bg-white px-3.5 py-3 text-left text-[15px] transition-[border-color,box-shadow] duration-200',
          'hover:border-line-strong focus:border-green-600 focus:outline-none focus:shadow-[0_0_0_3px_rgb(78_139_44/0.18)]',
          open ? 'border-green-600 shadow-[0_0_0_3px_rgb(78_139_44/0.18)]' : invalid ? 'border-red-400' : 'border-line',
        ].join(' ')}
      >
        <svg viewBox="0 0 20 20" className="size-[18px] shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
          <path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5" />
        </svg>
        <span className={`flex-1 ${text ? 'text-ink-900' : 'text-ink-300'}`}>{text || 'Pilih tanggal'}</span>
      </button>
      {open && at
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              aria-label={`Pilih tanggal: ${label}`}
              style={{ position: 'fixed', top: at.top, left: at.left }}
              className="z-50 rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-lift)]"
            >
              <Calendar value={value} onSelect={close} onClear={value ? () => close('') : undefined} />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
