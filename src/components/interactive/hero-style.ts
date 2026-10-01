import type { CSSProperties } from 'react'

/**
 * The Banner Utama block's style options, turned into what the card and the
 * two buttons wear. Every option left empty yields nothing, so the hero looks
 * exactly as designed until an editor changes something.
 */

const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** A colour the editor set, or undefined. The API already checks; this keeps a bad value out of a style. */
const color = (v: unknown) => (typeof v === 'string' && COLOR.test(v.trim()) ? v.trim() : undefined)

/** A colour's opacity, 0–1: the last two digits of #rrggbbaa, else fully opaque. */
const alphaOf = (hex: string) => (hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1)

/**
 * Whether dark text reads better than white on this colour (relative
 * luminance, WCAG). Everything here sits on the hero's dark panel, so a
 * see-through colour is judged as it shows over that: white at 15% is a dark
 * glass, not a light card.
 */
export function isLight(hex: string): boolean {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const a = alphaOf(hex)
  const behind = 0.02 // the dark hero panel
  return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) * a + behind * (1 - a) > 0.4
}

const INK = 'var(--color-ink-900)'
const SHADOWS: Record<string, string> = {
  soft: '0 14px 36px -14px rgb(0 0 0 / 0.38)',
  strong: '0 28px 64px -18px rgb(0 0 0 / 0.62)',
}
const WIDTHS: Record<string, string> = { thin: '1px', thick: '2px' }

export interface CardPaint {
  /** CSS variables read by `.hero-card` in globals.css. */
  style: CSSProperties
  /** A light card: the pills and hover states switch to their light-ground versions. */
  light: boolean
}

export function cardPaint(p: Record<string, unknown>): CardPaint {
  const bg = color(p.cardColor)
  const light = bg ? isLight(bg) : false
  const accent = color(p.cardAccent) ?? (light ? 'var(--color-green-700)' : undefined)
  const border = typeof p.cardBorder === 'string' ? p.cardBorder : 'subtle'
  const shadow = typeof p.cardShadow === 'string' ? p.cardShadow : 'default'

  const vars: Record<string, string | undefined> = {
    '--hc-bg': bg,
    '--hc-fg': light ? INK : undefined,
    '--hc-accent': accent,
  }
  if (border === 'none') vars['--hc-border-w'] = '0px'
  if (WIDTHS[border]) {
    vars['--hc-border-w'] = WIDTHS[border]
    vars['--hc-border'] = color(p.cardBorderColor) ?? 'var(--hc-accent)'
  }
  if (shadow === 'none') vars['--hc-shadow'] = 'none'
  if (SHADOWS[shadow]) vars['--hc-shadow'] = `${SHADOWS[shadow]}, inset 0 1px 0 rgb(255 255 255 / 0.06)`

  // A see-through card frosts what is behind it, so the text keeps a calm ground.
  const style = strip(vars) as CSSProperties
  if (bg && alphaOf(bg) < 1) { style.backdropFilter = 'blur(14px)'; style.WebkitBackdropFilter = 'blur(14px)' }
  return { style, light }
}

export interface ButtonPaint { style: CSSProperties; className: string }

/**
 * One hero button's colours, border and shadow. `which` picks the field
 * prefix and what "default" means: the primary is a filled green pill with a
 * green glow, the secondary a see-through pill with a faint white ring.
 */
export function buttonPaint(p: Record<string, unknown>, which: 'primary' | 'secondary'): ButtonPaint {
  const bg = color(p[`${which}Color`])
  const fg = color(p[`${which}TextColor`]) ?? (bg ? (isLight(bg) ? INK : '#fff') : undefined)
  const border = typeof p[`${which}Border`] === 'string' ? (p[`${which}Border`] as string) : which === 'primary' ? 'none' : 'subtle'
  const shadow = typeof p[`${which}Shadow`] === 'string' ? (p[`${which}Shadow`] as string) : which === 'primary' ? 'default' : 'none'

  const style: CSSProperties = {}
  const classes: string[] = []
  if (bg) {
    style.background = bg
    // An inline background outranks the variant's hover colour, so the hover is a shade instead.
    classes.push(isLight(bg) ? 'hover:brightness-95' : 'hover:brightness-110')
  }
  if (fg) style.color = fg

  // The secondary's faint ring is a box-shadow; it is kept under any shadow
  // chosen, and dropped once a real border or "none" replaces it.
  const ring = which === 'secondary' && border === 'subtle' ? 'inset 0 0 0 1px rgb(255 255 255 / 0.25)' : null
  if (WIDTHS[border]) {
    style.border = `${WIDTHS[border]} solid ${color(p[`${which}BorderColor`]) ?? fg ?? 'currentColor'}`
    classes.push('ring-0')
  }
  if (border === 'none') classes.push('ring-0')

  const glow = SHADOWS[shadow]
    ?? (shadow === 'default' && which === 'primary' && bg ? `0 10px 24px -10px color-mix(in srgb, ${bg} 65%, transparent)` : undefined)
  if (shadow === 'none' && which === 'primary') style.boxShadow = 'none'
  else if (glow) style.boxShadow = ring ? `${ring}, ${glow}` : glow

  return { style, className: classes.join(' ') }
}

const strip = (o: Record<string, string | undefined>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
