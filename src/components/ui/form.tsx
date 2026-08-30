'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Form controls matching the approved design: 10px radius, cool hairline
 * border, a soft green focus ring, and uppercase micro-labels above.
 */
export const field =
  'w-full rounded-[var(--radius-input)] border border-slate-200 bg-white px-4 py-3 text-[15px] text-navy-800 ' +
  'shadow-[inset_0_1px_2px_rgb(31_42_68/0.05)] placeholder:text-slate-400 ' +
  'transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-swift)] ' +
  'hover:border-slate-300 focus:border-green-500 focus:outline-none ' +
  'focus:shadow-[inset_0_1px_2px_rgb(31_42_68/0.04),0_0_0_4px_rgb(78_139_44/0.13)] ' +
  'disabled:bg-slate-50 disabled:text-slate-400'

export function Field({
  label, htmlFor, required, error, hint, counter, children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-navy-700">
          {label}
          {required ? <span className="ml-0.5 text-[#d1483c]" aria-hidden="true">*</span> : null}
        </span>
        {counter}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{hint}</p> : null}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-[#c23b2e]">
          <span aria-hidden="true" className="mt-[5px] size-1.5 shrink-0 rounded-full bg-[#c23b2e]" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Note({ tone = 'error', children }: { tone?: 'error' | 'gold' | 'leaf'; children: ReactNode }) {
  const tones = {
    error: 'bg-[#fdf2f0] text-[#a8331f] ring-[#f3d4cd]',
    gold: 'bg-gold-50 text-gold-600 ring-gold-100',
    leaf: 'bg-green-50 text-green-800 ring-green-100',
  }
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`rounded-[var(--radius-input)] px-4 py-3 text-[13.5px] leading-relaxed ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </p>
  )
}

/** A checkbox drawn as a square with a gold tick — matches the rule system. */
export function Check({ name, required, children }: { name: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="group/chk flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-slate-500">
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" name={name} required={required} className="peer sr-only" />
        <span className="block size-[19px] rounded-md border border-slate-300 bg-white shadow-[inset_0_1px_2px_rgb(31_42_68/0.06)] transition-colors peer-checked:border-green-600 peer-checked:bg-green-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-600" />
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute inset-0 m-auto size-3 scale-0 text-white transition-transform duration-300 [transition-timing-function:var(--ease-settle)] peer-checked:scale-100" fill="none" aria-hidden="true">
          <path d="m3 8.5 3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  )
}

/** Segmented tenor / option picker — square chips, gold when active. */
export function Segments({
  options, value, onChange, ariaLabel, suffix = '',
}: {
  options: number[] | string[]
  value: number | string
  onChange: (v: never) => void
  ariaLabel: string
  suffix?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {(options as (number | string)[]).map((opt) => {
        const active = opt === value
        return (
          <button
            key={String(opt)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt as never)}
            className={`tnum min-h-[46px] min-w-[68px] cursor-pointer rounded-full border px-4 text-[14px] font-semibold transition-all duration-200 [transition-timing-function:var(--ease-swift)] ${
              active
                ? 'border-green-700 bg-gradient-to-b from-green-500 to-green-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),var(--shadow-green)]'
                : 'border-slate-200 bg-gradient-to-b from-white to-[#f8faf6] text-slate-600 shadow-[var(--shadow-card)] hover:-translate-y-px hover:border-green-300 hover:text-green-700'
            }`}
          >
            {opt}{suffix}
          </button>
        )
      })}
    </div>
  )
}

/** A range input styled to read as a ruled slider rather than an OS default. */
export function Slider(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <>
      <input
        type="range"
        {...props}
        className={`ksp-range h-11 w-full cursor-pointer appearance-none bg-transparent ${props.className ?? ''}`}
      />
      <style>{`
        .ksp-range::-webkit-slider-runnable-track {
          height: 6px; border-radius: 999px; background: var(--color-green-100);
          box-shadow: inset 0 1px 2px rgb(31 42 68 / .10);
        }
        .ksp-range::-moz-range-track {
          height: 6px; border-radius: 999px; background: var(--color-green-100);
          box-shadow: inset 0 1px 2px rgb(31 42 68 / .10);
        }
        .ksp-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px; margin-top: -8px; border-radius: 999px;
          background: #fff; border: 4px solid var(--color-green-600);
          box-shadow: 0 1px 2px rgb(31 42 68 / .18), 0 4px 10px -2px rgb(49 88 29 / .35);
          transition: transform .18s var(--ease-swift), box-shadow .18s var(--ease-swift);
        }
        .ksp-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 999px;
          background: #fff; border: 4px solid var(--color-green-600);
          box-shadow: 0 1px 2px rgb(31 42 68 / .18), 0 4px 10px -2px rgb(49 88 29 / .35);
        }
        .ksp-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgb(78 139 44 / .22); }
        .ksp-range:hover::-webkit-slider-thumb { transform: scale(1.08); }
        .ksp-range:active::-webkit-slider-thumb { transform: scale(0.96); }
      `}</style>
    </>
  )
}

/* ─────────────────────────────── Select ─────────────────────────────────── */

export interface SelectOption {
  value: string
  label: string
  /** Optional second line — a branch address, a product tagline. */
  hint?: string
}

/**
 * Custom dropdown, because a native `<select>` cannot be styled: its popup is
 * drawn by the OS, so on Windows and Android it lands as grey system chrome in
 * the middle of a page that is otherwise all rounded cards and green.
 *
 * It is a real listbox, not a div with a click handler:
 *   · `combobox` + `listbox` roles, `aria-expanded`, `aria-activedescendant`
 *   · ↑ ↓ Home End to move, Enter/Space to commit, Escape to cancel, Tab closes
 *   · type-ahead — prefix first like a native select, then substring, so "pen"
 *     reaches "Pinjaman Pensiunan" in a list where every label starts "Pinjaman"
 *   · a hidden input carries `name`, so `new FormData(form)` still reads it and
 *     no form had to change
 *   · closes on outside pointer-down and on scroll of an ancestor
 *
 * Keeps the trigger at 46px so it matches the touch target of the other fields.
 */
export function Select({
  id, name, options, value, defaultValue = '', onChange, placeholder = 'Pilih…', required, disabled,
  ariaDescribedBy,
}: {
  id?: string
  name?: string
  options: SelectOption[]
  /** Controlled value. Omit for an uncontrolled field read via FormData. */
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  ariaDescribedBy?: string
}) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue)
  const current = isControlled ? value : internal

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ term: '', at: 0 })

  const selectedIndex = options.findIndex((o) => o.value === current)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const listId = id ? `${id}-listbox` : undefined

  const commit = useCallback((next: string) => {
    if (!isControlled) setInternal(next)
    onChange?.(next)
    setOpen(false)
  }, [isControlled, onChange])

  // Opening should land on the current choice, not the top of the list.
  const openList = useCallback(() => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }, [selectedIndex])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // A dropdown anchored to a trigger has to close when the page moves under it.
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    const last = options.length - 1

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(i + 1, last)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); break
      case 'Home': e.preventDefault(); setActive(0); break
      case 'End': e.preventDefault(); setActive(last); break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const opt = options[active]
        if (opt) commit(opt.value)
        break
      }
      case 'Escape': e.preventDefault(); setOpen(false); break
      case 'Tab': setOpen(false); break
      default: {
        if (e.key.length !== 1) break
        const now = Date.now()
        typed.current.term = now - typed.current.at > 700 ? e.key : typed.current.term + e.key
        typed.current.at = now
        const term = typed.current.term.toLowerCase()
        // Prefix first, like a native select — then fall back to a substring,
        // because every loan here is called "Pinjaman …" and a prefix match
        // would never move off the first one.
        const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(term))
        const idx = hit >= 0 ? hit : options.findIndex((o) => o.label.toLowerCase().includes(term))
        if (idx >= 0) setActive(idx)
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={current} /> : null}

      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
        aria-required={required}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${field} flex min-h-[50px] items-center justify-between gap-3 text-left ${
          open ? 'border-green-500 shadow-[inset_0_1px_2px_rgb(31_42_68/0.04),0_0_0_4px_rgb(78_139_44/0.13)]' : ''
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-navy-800' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 12 8" aria-hidden="true"
          className={`size-3 shrink-0 text-slate-400 transition-transform duration-300 [transition-timing-function:var(--ease-settle)] ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-gradient-to-b from-white to-[#fbfcfa] p-1.5 shadow-[var(--shadow-lift)]"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === current
            return (
              <li
                key={opt.value || `opt-${i}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                data-active={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => commit(opt.value)}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 text-[14.5px] transition-colors ${
                  i === active ? 'bg-green-50 text-green-800' : 'text-slate-600'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${isSelected ? 'font-semibold text-green-700' : ''}`}>{opt.label}</span>
                  {opt.hint ? <span className="mt-0.5 block truncate text-[12.5px] text-slate-400">{opt.hint}</span> : null}
                </span>
                {isSelected ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-green-600" fill="none">
                    <path d="m3 8.5 3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
