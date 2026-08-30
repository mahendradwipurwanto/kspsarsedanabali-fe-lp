import Link from 'next/link'
import type { ReactNode } from 'react'

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <script
      type="application/ld+json"
      // Built from typed values in lib/jsonld.ts, never from raw user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  )
}

/* ── Brand mark: the two interlocking leaves, redrawn from the logo ───────── */

export function Mark({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 60" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ksp-leaf" x1="4" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7cba57" /><stop offset="1" stopColor="#31581d" />
        </linearGradient>
        <linearGradient id="ksp-gold" x1="30" y1="30" x2="4" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dfae3c" /><stop offset="1" stopColor="#8f8906" />
        </linearGradient>
      </defs>
      <path d="M30 2C30 18 18 24 4 30c0-16 12-22 26-28Z" fill="url(#ksp-leaf)" />
      <path d="M4 58c0-16 12-22 26-28 0 16-12 22-26 28Z" fill="url(#ksp-gold)" />
    </svg>
  )
}

export function Wordmark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Mark className="h-8 w-auto shrink-0 sm:h-9" />
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[14.5px] font-extrabold tracking-[-0.02em] sm:text-[15.5px] ${tone === 'light' ? 'text-white' : 'text-green-600'}`}>
          KSP Sari Sedana Bali
        </span>
        <span className={`block truncate text-[10px] font-medium tracking-[0.14em] ${tone === 'light' ? 'text-white/60' : 'text-slate-400'}`}>
          Untuk kita
        </span>
      </span>
    </span>
  )
}

/* ── Structure ───────────────────────────────────────────────────────────── */

export function Shell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-[var(--gutter)] ${className}`}>{children}</div>
}

export function Band({
  children, tone = 'default', className = '', id,
}: {
  children: ReactNode
  tone?: 'default' | 'alt' | 'green' | 'dark'
  className?: string
  id?: string
}) {
  const tones = {
    default: 'bg-surface',
    alt: 'bg-surface-alt ground-texture',
    green: 'bg-gradient-to-b from-green-500 to-green-700 text-white',
    dark: 'bg-navy-900 text-white',
  }
  return (
    <section id={id} className={`${tones[tone]} py-14 sm:py-16 lg:py-24 ${className}`}>
      <div className="reveal">{children}</div>
    </section>
  )
}

export function Label({
  children, tone = 'green', rule = true,
}: { children: ReactNode; tone?: 'green' | 'gold' | 'light'; rule?: boolean }) {
  if (!children) return null
  const tones = { green: 'text-green-600', gold: 'text-gold-300', light: 'text-green-100' }
  return (
    <p className={`t-label flex items-center gap-2.5 ${tones[tone]}`}>
      {rule ? (
        <span
          aria-hidden="true"
          className={`h-[2px] w-5 shrink-0 rounded-full ${tone === 'green' ? 'bg-gradient-to-r from-gold-300 to-gold-400' : 'bg-current opacity-60'}`}
        />
      ) : null}
      {children}
    </p>
  )
}

/**
 * Section heading — the client's pattern: a small green label, a bold navy
 * title, a muted lead, and an optional pill action pushed to the right.
 */
export function Heading({
  label, title, lead, as: Tag = 'h2', size = 'h2', align = 'left', action, alignAction = 'center', tone = 'dark',
}: {
  label?: ReactNode
  title: ReactNode
  lead?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  size?: 'display' | 'h1' | 'h2'
  align?: 'left' | 'center'
  action?: ReactNode
  /** Where the action sits against the heading block on desktop. */
  alignAction?: 'center' | 'end'
  tone?: 'dark' | 'light'
}) {
  const centered = align === 'center'
  return (
    <div className={`mb-9 sm:mb-12 ${action ? `flex flex-col gap-5 md:flex-row md:justify-between ${alignAction === 'end' ? 'md:items-end' : 'md:items-center'}` : ''}`}>
      <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-[52ch]'}>
        {label ? (
          <div className={centered ? 'flex justify-center' : ''}>
            <Label tone={tone === 'light' ? 'light' : 'green'}>{label}</Label>
          </div>
        ) : null}
        <Tag className={`t-${size} ${label ? 'mt-2.5' : ''} ${tone === 'light' ? '!text-white' : ''}`}>{title}</Tag>
        {lead ? <p className={`t-lead mt-3.5 ${tone === 'light' ? 'text-white/75' : ''}`}>{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Actions: pills, as in the approved design ───────────────────────────── */

/**
 * A solid fill reads flat; a two-stop gradient with a hairline inner highlight
 * along the top edge reads as a moulded control. The lift on hover is small —
 * 1px — because at button scale anything more looks like a toy.
 */
const VARIANTS = {
  primary:
    'bg-gradient-to-b from-green-500 to-green-600 text-white shadow-[var(--shadow-green)] ' +
    '[box-shadow:inset_0_1px_0_rgb(255_255_255/0.22),var(--shadow-green)] ' +
    'hover:from-green-500 hover:to-green-700 hover:-translate-y-px hover:[box-shadow:inset_0_1px_0_rgb(255_255_255/0.25),var(--shadow-green-lift)] ' +
    'active:translate-y-0',
  gold:
    'bg-gradient-to-b from-gold-200 to-gold-300 text-navy-900 ' +
    '[box-shadow:inset_0_1px_0_rgb(255_255_255/0.55),0_1px_2px_rgb(31_42_68/0.10),0_6px_14px_-6px_rgb(223_174_60/0.5)] ' +
    'hover:from-gold-100 hover:to-gold-200 hover:-translate-y-px active:translate-y-0',
  outline:
    'bg-white text-green-700 ring-1 ring-inset ring-green-200 shadow-[var(--shadow-card)] ' +
    'hover:bg-green-50 hover:ring-green-300 hover:-translate-y-px active:translate-y-0',
  soft: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-100 hover:bg-green-100 hover:ring-green-200',
  light:
    'bg-white text-green-700 shadow-[0_1px_2px_rgb(31_42_68/0.12),0_8px_18px_-8px_rgb(31_42_68/0.30)] ' +
    'hover:bg-green-50 hover:-translate-y-px active:translate-y-0',
  ghostLight: 'bg-white/10 text-white ring-1 ring-inset ring-white/30 hover:bg-white/20 hover:ring-white/55 backdrop-blur-sm',
  quiet: 'text-slate-500 hover:bg-green-50 hover:text-green-700',
}
const SIZES = {
  sm: 'min-h-[38px] px-4 text-[13px]',
  md: 'min-h-[46px] px-5 text-[14px]',
  lg: 'min-h-[52px] px-7 text-[15px]',
}

type ActionProps = {
  children: ReactNode
  href?: string
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  className?: string
  external?: boolean
  full?: boolean
  /** Navigation CTAs are pills; form submits are rounded rectangles. */
  shape?: 'pill' | 'rect'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Action({
  children, href, variant = 'primary', size = 'md', className = '', external, full, shape = 'pill', ...rest
}: ActionProps) {
  const cls = [
    'group/act inline-flex items-center justify-center gap-2 font-semibold',
    shape === 'pill' ? 'rounded-full' : 'rounded-[var(--radius-input)]',
    'cursor-pointer transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
    VARIANTS[variant], SIZES[size], full ? 'w-full' : '', className,
  ].join(' ')

  if (href) {
    return external ? (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...(rest as object)}>{children}</a>
    ) : (
      <Link href={href} className={cls}>{children}</Link>
    )
  }
  return <button className={cls} {...rest}>{children}</button>
}

export function More({ href, children, tone = 'dark' }: { href: string; children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <Link
      href={href}
      className={`group/more inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-semibold transition-colors ${
        tone === 'light' ? 'text-white hover:text-gold-200' : 'text-green-700 hover:text-green-800'
      }`}
    >
      {children}
      <Icon.arrow className="size-4 transition-transform duration-300 group-hover/more:translate-x-1" />
    </Link>
  )
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  children, className = '', as: Tag = 'div', hover = false, tone = 'white',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li'
  hover?: boolean
  tone?: 'white' | 'green' | 'soft'
}) {
  // `.surface` carries the moulded white card: gradient stock, a white top
  // edge, and a bottom border a shade deeper than the sides, so the card looks
  // lit from above rather than outlined. Tinted tones paint their own ground.
  const tones = {
    white: 'surface',
    soft: 'rounded-[var(--radius-card)] border border-green-100 bg-gradient-to-b from-green-50 to-[#eaf2e4] shadow-[var(--shadow-card),var(--edge-top)]',
    green:
      'rounded-[var(--radius-card)] border border-green-700 bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white ' +
      'shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-raised)]',
  }
  return (
    <Tag
      className={`${tones[tone]} ${hover ? 'surface-i cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}

/** The green rounded-square icon tile from the stats row. */
export function Tile({
  children, size = 'md', tone = 'green',
}: { children: ReactNode; size?: 'sm' | 'md' | 'lg'; tone?: 'green' | 'soft' | 'gold' }) {
  const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' }
  const tones = {
    green:
      'bg-gradient-to-b from-green-500 to-green-700 text-white ' +
      '[box-shadow:inset_0_1px_0_rgb(255_255_255/0.25),0_2px_6px_-2px_rgb(49_88_29/0.45)]',
    soft: 'bg-gradient-to-b from-green-50 to-green-100 text-green-700 ring-1 ring-inset ring-green-200/70',
    gold: 'bg-gradient-to-b from-gold-50 to-gold-100 text-gold-400 ring-1 ring-inset ring-gold-200/70',
  }
  return <span className={`grid shrink-0 place-items-center rounded-[var(--radius-tile)] ${sizes[size]} ${tones[tone]}`}>{children}</span>
}

export function Pill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'quiet' | 'light' }) {
  const tones = {
    green: 'bg-gradient-to-b from-green-50 to-[#e8f0e2] text-green-700 ring-1 ring-inset ring-green-100',
    gold: 'bg-gradient-to-b from-gold-50 to-[#faeed0] text-gold-700 ring-1 ring-inset ring-gold-100',
    quiet: 'bg-gradient-to-b from-slate-50 to-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
    light: 'bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.07em] ${tones[tone]}`}>
      {children}
    </span>
  )
}
export { Pill as Tag_ }

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  if (trail.length < 2) return null
  return (
    <nav aria-label="Remah roti" className="border-b border-line bg-surface-alt">
      <Shell>
        <ol className="rail flex items-center gap-2 overflow-x-auto py-3.5 text-[12.5px] text-slate-400">
          {trail.map((item, i) => (
            <li key={item.path} className="flex shrink-0 items-center gap-2">
              {i > 0 ? <span aria-hidden="true" className="text-slate-300">/</span> : null}
              {i === trail.length - 1 ? (
                <span className="max-w-[16rem] truncate font-semibold text-slate-600">{item.name}</span>
              ) : (
                <Link href={item.path} className="transition-colors hover:text-green-700">{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </Shell>
    </nav>
  )
}

export function Blank({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-slate-200 bg-surface-alt px-6 py-16 text-center">
      <p className="t-h3">{title}</p>
      <p className="mx-auto mt-2.5 max-w-md text-[14.5px] leading-relaxed text-slate-500">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

/** Page opener for the fixed routes — soft green wash, matching the design. */
export function PageIntro({
  label, title, lead, aside,
}: { label: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-gradient-to-b from-green-50/80 via-white to-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-green-100/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-1/3 size-56 rounded-full bg-gold-100/35 blur-3xl" />
      {/* The mark itself, held at the edge as a watermark. */}
      <Mark className="pointer-events-none absolute -right-6 bottom-[-3rem] hidden h-64 w-auto opacity-[0.055] lg:block" />
      <Shell>
        <div className={`relative py-12 sm:py-16 lg:py-20 ${aside ? 'grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-14' : ''}`}>
          <div className="max-w-[56ch]">
            <Label>{label}</Label>
            <h1 className="t-h1 mt-2.5">{title}</h1>
            {lead ? <p className="t-lead mt-4">{lead}</p> : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      </Shell>
    </div>
  )
}

/* ── Icons: rounded caps, matching the design's friendly line style ──────── */

const line = (d: string, extra?: ReactNode) => (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={p.className ?? 'size-4'}>
    <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    {extra}
  </svg>
)

export const Icon = {
  arrow: line('M4.5 12h14m0 0-5-5m5 5-5 5'),
  phone: line('M7.4 4.2 9.5 8.4l-2 1.7a11.6 11.6 0 0 0 5.4 5.4l1.7-2 4.2 2.1v3.2a1.2 1.2 0 0 1-1.3 1.2A16.3 16.3 0 0 1 3.2 5.5 1.2 1.2 0 0 1 4.4 4.2h3Z'),
  pin: line('M12 21.5s7-6.1 7-10.7a7 7 0 1 0-14 0c0 4.6 7 10.7 7 10.7Z', <circle cx="12" cy="10.6" r="2.6" stroke="currentColor" strokeWidth="1.7" />),
  clock: line('M12 7.4V12l3 1.9', <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.7" />),
  check: line('m5.5 12.5 4 4 9-9'),
  checkCircle: line('m8.5 12.2 2.6 2.6 4.9-5.1', <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.7" />),
  calendar: line('M4 9.5h16M8 3.5v3M16 3.5v3', <rect x="4" y="5.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.7" />),
  download: line('M12 3.8v10.4m0 0 3.8-3.8M12 14.2l-3.8-3.8M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2'),
  compass: line('M19.6 4.4 13.4 19l-2-6.4L5 10.6l14.6-6.2Z'),
  quote: line('M9.4 6C6.6 7.4 5.2 9.8 5.2 13v5h5.6v-5H8.2c0-2.2.7-3.9 2.2-4.9L9.4 6Zm8.6 0c-2.8 1.4-4.2 3.8-4.2 7v5h5.6v-5h-2.6c0-2.2.7-3.9 2.2-4.9L18 6Z'),
  chevron: line('m8 10 4 4 4-4'),
  info: line('M12 11.2v5.2M12 7.9h.01', <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.7" />),
  calculator: line('M8.5 8.5h7M8.5 12.5h2M13.5 12.5h2M8.5 16.5h2M13.5 16.5h2', <rect x="4.5" y="3.5" width="15" height="17" rx="3" stroke="currentColor" strokeWidth="1.7" />),
  spark: line('M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z'),
  users: line('M15.5 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.9a3.4 3.4 0 0 0-3.4 3.4V20M20.5 20v-1.6a3.4 3.4 0 0 0-2.6-3.3M15.2 4.3a3.4 3.4 0 0 1 0 6.6', <circle cx="9.5" cy="7.6" r="3.4" stroke="currentColor" strokeWidth="1.7" />),
  chart: line('M4 18.5 9 13l3.4 3.4L20 8.5m0 0h-4.6M20 8.5v4.6'),
  wallet: line('M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2 2 0 0 1 2 2v1M3.5 8.5V17A2.5 2.5 0 0 0 6 19.5h12a2 2 0 0 0 2-2V15M20.5 9h-4a3 3 0 0 0 0 6h4V9Z'),
  handshake: line('m4 10.5 4-3.5 3.5 2.5L15 7l5 3.5M4 10.5v5l4 4M20 10.5v5l-4 4M9 17l2-2M13 15l2 2'),
  award: line('M12 15.5 8.5 21l3.5-1.6L15.5 21 12 15.5Z', <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />),
  piggy: line('M4.5 12.5A6.5 6.5 0 0 1 11 6h3a6 6 0 0 1 6 6v1.5l1.5 1v2H19l-1 2v2h-3v-1.5h-3V20H9v-2.4a6.4 6.4 0 0 1-4.5-5.1ZM8 5.5 6.5 3'),
  shield: line('M12 3.5 5 6v5.5c0 4.4 3 8.1 7 9 4-.9 7-4.6 7-9V6l-7-2.5Z'),
  whatsapp: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={p.className ?? 'size-4'}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.92-4.45 9.92-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.42 1.31-1.96 1.35-.5.05-.98.23-3.3-.69-2.78-1.1-4.55-3.94-4.69-4.13-.14-.19-1.12-1.49-1.12-2.84s.71-2.02.96-2.29c.25-.28.55-.35.73-.35h.52c.17 0 .4-.06.62.48.24.57.8 1.98.87 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.47l-.42.49c-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.92 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.32.07.12.07.66-.17 1.34Z" />
    </svg>
  ),
  star: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={p.className ?? 'size-4'}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  ),
}

/** Maps icon names stored on stats/features to a component. */
export const iconByName = (name?: string | null) => {
  const map: Record<string, (p: { className?: string }) => ReactNode> = {
    landmark: Icon.shield, users: Icon.users, 'trending-up': Icon.chart, wallet: Icon.wallet,
    handshake: Icon.handshake, 'piggy-bank': Icon.piggy, award: Icon.award, star: Icon.star,
    heart: Icon.checkCircle, lightbulb: Icon.spark, zap: Icon.spark, 'shield-check': Icon.shield,
    check: Icon.check, 'map-pin': Icon.pin, phone: Icon.phone, calculator: Icon.calculator,
  }
  return map[name ?? ''] ?? Icon.checkCircle
}
