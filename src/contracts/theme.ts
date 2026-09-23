/**
 * The website's three brand colours, set under Pengaturan → Identitas.
 *
 * The site is styled with three ramps — `green-*` (primary), `ink-*`
 * (secondary) and `gold-*` (accent) — each eleven or so shades deep. An editor
 * picks one colour per ramp; the rest of the ramp is derived from it so every
 * class that names a shade follows along.
 *
 * The chosen colour lands on the ramp's anchor shade exactly (green-600,
 * ink-900, gold-300: the shades the design uses as "the" colour). The other
 * shades keep the lightness steps of the shipped ramp, measured in OKLCH so a
 * step looks the same size whatever the hue, and take the new hue and a
 * proportional chroma. Picking the shipped colour returns the shipped ramp.
 */

export type ThemeColorKey = 'primary' | 'secondary' | 'accent'

export interface ThemeFamily {
  key: ThemeColorKey
  /** The CSS variable prefix on the website: `--color-<token>-<step>`. */
  token: 'green' | 'ink' | 'gold'
  /** The shade the chosen colour becomes. */
  anchor: number
  label: string
  hint: string
  /** The shipped ramp, step → hex. */
  ramp: Record<number, string>
}

export const THEME_FAMILIES: ThemeFamily[] = [
  {
    key: 'primary', token: 'green', anchor: 600,
    label: 'Warna utama',
    hint: 'Tombol utama, tautan, ikon, dan tanda centang. Bawaan: hijau daun dari logo.',
    ramp: {
      50: '#f1f7ec', 100: '#e2f0d6', 200: '#c5e2ae', 300: '#9fcf7d', 400: '#78b850',
      500: '#5b9638', 600: '#4e8b2c', 700: '#3f7124', 800: '#32591e', 900: '#264618',
    },
  },
  {
    key: 'secondary', token: 'ink', anchor: 900,
    label: 'Warna kedua',
    hint: 'Banner, footer, judul, dan panel gelap seperti kartu hasil simulasi. Bawaan: biru tua.',
    ramp: {
      50: '#f5f7f9', 100: '#eceff3', 200: '#d9dee5', 300: '#b7c0cc', 400: '#8593a6', 500: '#5b6b82',
      600: '#3b4d68', 700: '#223452', 800: '#16263d', 900: '#0f1b2d', 950: '#0a1220',
    },
  },
  {
    key: 'accent', token: 'gold', anchor: 300,
    label: 'Warna aksen (kuning)',
    hint: 'Angka penting di atas latar gelap, garis aksen, dan sorotan. Bawaan: kuning emas.',
    ramp: {
      50: '#fdf8e8', 100: '#faeec4', 200: '#f5df94', 300: '#efc15c', 400: '#dfae3c',
      500: '#c2911f', 600: '#8f6a12', 700: '#6b4f0d',
    },
  },
]

export type ThemeColors = Record<ThemeColorKey, string>

export const DEFAULT_THEME_COLORS: ThemeColors = Object.fromEntries(
  THEME_FAMILIES.map((f) => [f.key, f.ramp[f.anchor]!]),
) as ThemeColors

/** Six-digit hex only. The value is written into a style sheet, so nothing looser is accepted. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/i
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && HEX_COLOR.test(v)

/** A saved colour, or the shipped one when it is missing or malformed. */
export function themeColors(raw: Partial<Record<ThemeColorKey, unknown>> | undefined): ThemeColors {
  const out = { ...DEFAULT_THEME_COLORS }
  for (const f of THEME_FAMILIES) {
    const v = raw?.[f.key]
    if (isHexColor(v)) out[f.key] = v.toLowerCase()
  }
  return out
}

/* ─────────────────────────────── colour maths ─────────────────────────────── */

type Lch = { L: number; C: number; H: number }

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const h = (c: number) => Math.round(Math.min(Math.max(c, 0), 1) * 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function hexToLch(hex: string): Lch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(a, bb), H: (Math.atan2(bb, a) * 180) / Math.PI }
}

/** Linear sRGB, possibly out of range. */
function lchToLinear({ L, C, H }: Lch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4)

/** Into sRGB by giving up chroma, never lightness or hue: a shade stays the shade it was meant to be. */
function lchToHex(c: Lch): string {
  let lo = 0
  let hi = c.C
  if (!inGamut(lchToLinear(c))) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(lchToLinear({ ...c, C: mid }))) lo = mid
      else hi = mid
    }
    c = { ...c, C: lo }
  }
  return rgbToHex(lchToLinear(c).map(toGamma) as [number, number, number])
}

/** The full ramp for one family, with `base` on the anchor shade. */
export function buildRamp(family: ThemeFamily, base: string): Record<number, string> {
  const shipped = family.ramp[family.anchor]!
  if (!isHexColor(base) || base.toLowerCase() === shipped) return { ...family.ramp }
  const anchor = hexToLch(shipped)
  const next = hexToLch(base)
  // A grey has no meaningful hue; keep the shades grey rather than tinting them.
  const chromaScale = anchor.C > 1e-4 ? next.C / anchor.C : 0
  const out: Record<number, string> = {}
  for (const [step, hex] of Object.entries(family.ramp)) {
    if (Number(step) === family.anchor) { out[Number(step)] = base.toLowerCase(); continue }
    const d = hexToLch(hex)
    const L = d.L >= anchor.L
      ? next.L + ((d.L - anchor.L) / (1 - anchor.L)) * (1 - next.L)
      : next.L * (1 - (anchor.L - d.L) / anchor.L)
    out[Number(step)] = lchToHex({ L, C: d.C * chromaScale, H: next.H + (d.H - anchor.H) })
  }
  return out
}

/**
 * The style sheet that repaints the website: every shade of every family that
 * differs from the shipped one. Empty when nothing has changed, so a site on
 * its shipped colours carries no extra CSS.
 */
export function themeCss(colors: ThemeColors): string {
  const decls: string[] = []
  for (const f of THEME_FAMILIES) {
    const ramp = buildRamp(f, colors[f.key])
    for (const [step, hex] of Object.entries(ramp)) {
      if (hex !== f.ramp[Number(step)]) decls.push(`--color-${f.token}-${step}:${hex}`)
    }
  }
  return decls.length ? `:root{${decls.join(';')}}` : ''
}

/** WCAG contrast ratio between two hex colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = hexToRgb(hex).map(toLinear) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}
