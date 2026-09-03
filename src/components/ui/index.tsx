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
          <stop stopColor="#78b850" /><stop offset="1" stopColor="#32591e" />
        </linearGradient>
        <linearGradient id="ksp-gold" x1="30" y1="30" x2="4" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dfae3c" /><stop offset="1" stopColor="#8f6a12" />
        </linearGradient>
      </defs>
      <path d="M30 2C30 18 18 24 4 30c0-16 12-22 26-28Z" fill="url(#ksp-leaf)" />
      <path d="M4 58c0-16 12-22 26-28 0 16-12 22-26 28Z" fill="url(#ksp-gold)" />
    </svg>
  )
}

/**
 * Wordmark. Name and tagline come from Pengaturan → Website → Identitas; a
 * custom logo replaces the drawn mark when one has been uploaded.
 */
export function Wordmark({
  tone = 'dark', name = 'KSP Sari Sedana Bali', tagline = 'Untuk kita', logo,
}: { tone?: 'dark' | 'light'; name?: string; tagline?: string; logo?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-9 w-auto shrink-0" />
      ) : (
        <Mark className="h-8 w-auto shrink-0 sm:h-9" />
      )}
      <span className="min-w-0 leading-none">
        <span className={`block truncate text-[15px] font-extrabold tracking-[-0.025em] sm:text-[16px] ${tone === 'light' ? 'text-white' : 'text-ink-900'}`}>
          {name}
        </span>
        <span className={`mt-1 block truncate text-[11px] font-medium ${tone === 'light' ? 'text-white/55' : 'text-ink-400'}`}>
          {tagline}
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
  children, tone = 'default', className = '', id, rule = false,
}: {
  children: ReactNode
  tone?: 'default' | 'alt' | 'green' | 'dark'
  className?: string
  id?: string
  /** A hairline across the top of the band. */
  rule?: boolean
}) {
  const tones = {
    default: 'bg-surface',
    alt: 'bg-paper ground-texture',
    green: 'bg-green-700 text-white',
    dark: 'bg-ink-900 text-white grid-dark',
  }
  return (
    <section id={id} className={`${tones[tone]} ${rule ? 'border-t border-line' : ''} py-14 sm:py-16 lg:py-24 ${className}`}>
      <div className="reveal">{children}</div>
    </section>
  )
}

/** A hairline with an optional gold cap — the only ornament a light section gets. */
export function Rule({ gold = false, className = '' }: { gold?: boolean; className?: string }) {
  return (
    <div className={`flex items-center ${className}`} aria-hidden="true">
      {gold ? <span className="h-[2px] w-8 bg-gold-400" /> : null}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/**
 * The small line above a heading: sentence case, a short hairline before it.
 * Gold only on dark, where it is the one warm note; green on light.
 */
export function Label({
  children, tone = 'green', rule = true,
}: { children: ReactNode; tone?: 'green' | 'gold' | 'light' | 'ink'; rule?: boolean }) {
  if (!children) return null
  const tones = {
    green: 'text-green-700',
    gold: 'text-gold-300',
    light: 'text-white/70',
    ink: 'text-ink-500',
  }
  const rules = { green: 'bg-green-600', gold: 'bg-gold-400', light: 'bg-white/40', ink: 'bg-ink-300' }
  return (
    <p className={`t-label flex items-center gap-2.5 ${tones[tone]}`}>
      {rule ? <span aria-hidden="true" className={`h-px w-5 shrink-0 ${rules[tone]}`} /> : null}
      {children}
    </p>
  )
}

export function Heading({
  label, title, lead, as: Tag = 'h2', size = 'h2', align = 'left', action, alignAction = 'end', tone = 'dark',
}: {
  label?: ReactNode
  title: ReactNode
  lead?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  size?: 'display' | 'h1' | 'h2'
  align?: 'left' | 'center'
  action?: ReactNode
  alignAction?: 'center' | 'end'
  tone?: 'dark' | 'light'
}) {
  const centered = align === 'center'
  return (
    <div className={`mb-9 sm:mb-12 ${action ? `flex flex-col gap-5 md:flex-row md:justify-between ${alignAction === 'end' ? 'md:items-end' : 'md:items-center'}` : ''}`}>
      <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-[54ch]'}>
        {label ? (
          <div className={centered ? 'flex justify-center' : ''}>
            <Label tone={tone === 'light' ? 'gold' : 'green'}>{label}</Label>
          </div>
        ) : null}
        <Tag className={`t-${size} ${label ? 'mt-3' : ''} ${tone === 'light' ? '!text-white' : ''}`}>{title}</Tag>
        {lead ? <p className={`t-lead mt-4 ${tone === 'light' ? 'text-white/70' : ''}`}>{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

const VARIANTS = {
  primary: 'bg-green-600 text-white shadow-[var(--shadow-green)] hover:bg-green-700 hover:shadow-[var(--shadow-green-lift)] active:bg-green-800',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950',
  gold: 'bg-gold-300 text-ink-900 hover:bg-gold-200 active:bg-gold-400',
  outline: 'bg-white text-ink-800 ring-1 ring-inset ring-line-strong hover:bg-ink-50 hover:ring-ink-400',
  soft: 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-100 hover:bg-green-100',
  light: 'bg-white text-ink-900 hover:bg-gold-50',
  ghostLight: 'text-white ring-1 ring-inset ring-white/25 hover:bg-white/10 hover:ring-white/50',
  quiet: 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
}
const SIZES = {
  sm: 'min-h-[38px] px-4 text-[13px]',
  md: 'min-h-[46px] px-5 text-[14px]',
  lg: 'min-h-[52px] px-6 text-[15px]',
}

type ActionProps = {
  children: ReactNode
  href?: string
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  className?: string
  external?: boolean
  full?: boolean
  shape?: 'pill' | 'rect'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/** Pills for navigation CTAs — the client's design — and rectangles for form submits. */
export function Action({
  children, href, variant = 'primary', size = 'md', className = '', external, full, shape = 'pill', ...rest
}: ActionProps) {
  const cls = [
    'group/act inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.005em]',
    shape === 'pill' ? 'rounded-full' : 'rounded-[var(--radius-input)]',
    'cursor-pointer transition-[background-color,box-shadow,color] duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
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
  tone?: 'white' | 'green' | 'soft' | 'dark'
}) {
  const tones = {
    white: 'surface',
    soft: 'rounded-[var(--radius-card)] border border-green-100 bg-green-50',
    green: 'rounded-[var(--radius-card)] bg-green-700 text-white',
    dark: 'surface-dark text-white',
  }
  return <Tag className={`${tones[tone]} ${hover ? 'surface-i cursor-pointer' : ''} ${className}`}>{children}</Tag>
}

export function Tile({
  children, size = 'md', tone = 'green',
}: { children: ReactNode; size?: 'sm' | 'md' | 'lg'; tone?: 'green' | 'soft' | 'gold' | 'dark' | 'outline' }) {
  const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' }
  const tones = {
    green: 'bg-green-600 text-white',
    soft: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-100',
    gold: 'bg-gold-100 text-gold-700 ring-1 ring-inset ring-gold-200',
    dark: 'bg-ink-800 text-gold-300 ring-1 ring-inset ring-white/10',
    outline: 'bg-white text-ink-700 ring-1 ring-inset ring-line',
  }
  return <span className={`grid shrink-0 place-items-center rounded-[var(--radius-tile)] ${sizes[size]} ${tones[tone]}`}>{children}</span>
}

export function Pill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'quiet' | 'light' | 'dark' }) {
  const tones = {
    green: 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200',
    gold: 'bg-gold-50 text-gold-700 ring-1 ring-inset ring-gold-200',
    quiet: 'bg-ink-50 text-ink-600 ring-1 ring-inset ring-ink-200',
    light: 'bg-white/10 text-white ring-1 ring-inset ring-white/25',
    dark: 'bg-ink-900 text-white',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}
export { Pill as Tag_ }

/** One figure with its caption — the atom of every statistics row. */
export function Stat({
  value, label, note, tone = 'dark', size = 'md',
}: { value: ReactNode; label: ReactNode; note?: ReactNode; tone?: 'dark' | 'light'; size?: 'md' | 'lg' }) {
  return (
    <div>
      <p className={`figure ${size === 'lg' ? 'text-[2.4rem] sm:text-[2.75rem]' : 'text-[1.75rem] sm:text-[2rem]'} ${tone === 'light' ? 'text-gold-300' : 'text-ink-900'}`}>
        {value}
      </p>
      <p className={`mt-2 text-[13px] font-semibold ${tone === 'light' ? 'text-white/75' : 'text-ink-700'}`}>{label}</p>
      {note ? <p className={`mt-0.5 text-[12px] ${tone === 'light' ? 'text-white/45' : 'text-ink-400'}`}>{note}</p> : null}
    </div>
  )
}

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  if (trail.length < 2) return null
  return (
    <nav aria-label="Remah roti" className="border-b border-line bg-white">
      <Shell>
        <ol className="rail flex items-center gap-2 overflow-x-auto py-3 text-[12.5px] text-ink-400">
          {trail.map((item, i) => (
            <li key={item.path} className="flex shrink-0 items-center gap-2">
              {i > 0 ? <span aria-hidden="true" className="text-ink-300">/</span> : null}
              {i === trail.length - 1 ? (
                <span className="max-w-[16rem] truncate font-semibold text-ink-700">{item.name}</span>
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
    <div className="rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-paper px-6 py-16 text-center">
      <p className="t-h3">{title}</p>
      <p className="mx-auto mt-2.5 max-w-md text-[14.5px] leading-relaxed text-ink-500">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

/**
 * Page opener for the fixed routes. Dark by default now — every inner page
 * opens on the same navy the homepage does, so the site reads as one
 * building rather than a homepage and some documents.
 */
export function PageIntro({
  label, title, lead, aside, tone = 'dark',
}: { label: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode; tone?: 'dark' | 'light' }) {
  const dark = tone === 'dark'
  return (
    <div className={`relative overflow-hidden ${dark ? 'bg-ink-900 text-white grid-dark' : 'border-b border-line bg-paper ground-texture'}`}>
      {dark ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" /> : null}
      <Shell>
        <div className={`relative py-12 sm:py-16 lg:py-20 ${aside ? 'grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-14' : ''}`}>
          <div className="max-w-[56ch]">
            <Label tone={dark ? 'gold' : 'green'}>{label}</Label>
            <h1 className={`t-h1 mt-3 ${dark ? '!text-white' : ''}`}>{title}</h1>
            {lead ? <p className={`t-lead mt-4 ${dark ? 'text-white/70' : ''}`}>{lead}</p> : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      </Shell>
    </div>
  )
}

/* ── Icons: rounded caps, line weight 1.7 ────────────────────────────────── */

const line = (d: string, extra?: ReactNode) => (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={p.className ?? 'size-4'}>
    <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    {extra}
  </svg>
)

export const Icon = {
  arrow: line('M4.5 12h14m0 0-5-5m5 5-5 5'),
  arrowUpRight: line('M7 17 17 7m0 0H9m8 0v8'),
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
  shieldCheck: line('M12 3.5 5 6v5.5c0 4.4 3 8.1 7 9 4-.9 7-4.6 7-9V6l-7-2.5ZM9 12l2 2 4-4'),
  building: line('M4 20.5h16M6 20.5V5.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15M9.5 8h1.5M13 8h1.5M9.5 11.5h1.5M13 11.5h1.5M9.5 15h1.5M13 15h1.5M10.5 20.5V18h3v2.5'),
  percent: line('M18.5 5.5l-13 13', <><circle cx="7.5" cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.7" /><circle cx="16.5" cy="16.5" r="2.4" stroke="currentColor" strokeWidth="1.7" /></>),
  briefcase: line('M4 8.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10ZM9 8.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5M4 13h16'),
  fileText: line('M8 3.5h6l5 5V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5ZM14 3.5v5h5M9 12h6M9 15.5h6'),
  mail: line('M4 6.5h16v11H4v-11Zm0 0 8 6 8-6'),
  search: line('m20 20-3.8-3.8', <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />),
  close: line('m6 6 12 12M18 6 6 18'),
  menu: line('M4 7h16M4 12h16M4 17h16'),
  leaf: line('M5 19c2-8 8-13 15-14-1 7-6 13-14 15M5 19l4-4'),
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
  facebook: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={p.className ?? 'size-4'}>
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.2c0-.9.3-1.5 1.5-1.5h1.5V5.1c-.3 0-1.2-.1-2.3-.1-2.2 0-3.7 1.4-3.7 3.9V11H8v3h2.5v7h3Z" />
    </svg>
  ),
  instagram: line('M16.5 7.5h.01', <><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.7" /></>),
  youtube: line('m10 9 5 3-5 3V9Z', <rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="1.7" />),
}

/** Maps icon names stored on stats/features/quick-access items to a component. */
export const iconByName = (name?: string | null) => {
  const map: Record<string, (p: { className?: string }) => ReactNode> = {
    landmark: Icon.building, building: Icon.building, users: Icon.users, 'trending-up': Icon.chart, chart: Icon.chart,
    wallet: Icon.wallet, handshake: Icon.handshake, 'piggy-bank': Icon.piggy, piggy: Icon.piggy, award: Icon.award,
    star: Icon.star, heart: Icon.checkCircle, lightbulb: Icon.spark, zap: Icon.spark, spark: Icon.spark,
    'shield-check': Icon.shieldCheck, shield: Icon.shield, check: Icon.check, 'map-pin': Icon.pin, pin: Icon.pin,
    phone: Icon.phone, calculator: Icon.calculator, percent: Icon.percent, briefcase: Icon.briefcase,
    'file-text': Icon.fileText, mail: Icon.mail, clock: Icon.clock, compass: Icon.compass, leaf: Icon.leaf,
    calendar: Icon.calendar, download: Icon.download, whatsapp: Icon.whatsapp,
  }
  return map[name ?? ''] ?? Icon.checkCircle
}

/** The names the CMS icon picker offers — kept next to the map so they cannot drift. */
export const ICON_NAMES = [
  'spark', 'calculator', 'map-pin', 'phone', 'users', 'trending-up', 'wallet', 'handshake', 'piggy-bank', 'award',
  'star', 'shield-check', 'building', 'percent', 'briefcase', 'file-text', 'mail', 'clock', 'compass', 'leaf', 'check',
] as const
