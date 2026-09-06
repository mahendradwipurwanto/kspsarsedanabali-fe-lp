import Link from 'next/link'
import type { ReactNode } from 'react'
import { Action, Label, Icon, iconByName } from './ui'
import { Media } from './ui/Media'

/*
 * Free-form sections an editor composes a page from: a picture beside text,
 * a numbered process, a timeline, a video, a row of logos. Each is a plain
 * server component fed by its block's props; the band, shell and heading
 * around it come from the block renderer, so the rhythm of the page stays
 * the renderer's business.
 */

export interface Cta { label?: string; href?: string }
const external = (href: string) => /^https?:\/\//i.test(href)
const complete = (c?: Cta): { label: string; href: string } | null => (c?.label && c.href ? { label: c.label, href: c.href } : null)

/** Primary and secondary buttons; renders nothing while neither has both a label and an address. */
export function CtaRow({ primary, secondary, tone = 'dark', className = '' }: { primary?: Cta; secondary?: Cta; tone?: 'dark' | 'light'; className?: string }) {
  const p = complete(primary)
  const s = complete(secondary)
  if (!p && !s) return null
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {p ? (
        <Action href={p.href} external={external(p.href)} size="lg" variant={tone === 'light' ? 'light' : 'primary'}>
          {p.label}
          <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
        </Action>
      ) : null}
      {s ? (
        <Action href={s.href} external={external(s.href)} size="lg" variant={tone === 'light' ? 'ghostLight' : 'outline'}>{s.label}</Action>
      ) : null}
    </div>
  )
}

/* ────────────────────────────── media + text ───────────────────────────── */

export function MediaText({
  eyebrow, heading, body, bullets, image, imageAlt, imagePosition, imageRatio, primary, secondary,
}: {
  eyebrow?: string
  heading: string
  body?: string
  bullets: { text: string }[]
  image?: string
  imageAlt?: string
  imagePosition: 'left' | 'right'
  imageRatio: string
  primary?: Cta
  secondary?: Cta
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={imagePosition === 'left' ? 'lg:order-first' : 'lg:order-last'}>
        <Media src={image} alt={imageAlt ?? ''} ratio={imageRatio} sizes="(max-width: 1024px) 100vw, 50vw" className="shadow-[var(--shadow-lift)]" fallbackLabel={heading} />
      </div>
      <div className="max-w-[54ch]">
        {eyebrow ? <Label>{eyebrow}</Label> : null}
        <h2 className={`t-h2 ${eyebrow ? 'mt-3' : ''}`}>{heading}</h2>
        {body ? <div className="prose-ksp mt-5" dangerouslySetInnerHTML={{ __html: body }} /> : null}
        {bullets.length ? (
          <ul className="mt-6 grid gap-3">
            {bullets.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-snug text-ink-700">
                <Icon.checkCircle className="mt-0.5 size-5 shrink-0 text-green-600" />
                {item.text}
              </li>
            ))}
          </ul>
        ) : null}
        <CtaRow primary={primary} secondary={secondary} className="mt-8" />
      </div>
    </div>
  )
}

/* ──────────────────────────────── steps ────────────────────────────────── */

export interface Step { title: string; body?: string; icon?: string }

function StepMarker({ step, index }: { step: Step; index: number }) {
  const IconCmp = step.icon ? iconByName(step.icon) : null
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-gold-300">
      {IconCmp ? <IconCmp className="size-5" /> : <span className="figure text-[17px]">{String(index + 1).padStart(2, '0')}</span>}
    </span>
  )
}

export function Steps({ items, layout, primary }: { items: Step[]; layout: 'grid' | 'list'; primary?: Cta }) {
  if (!items.length) return null
  if (layout === 'list') {
    return (
      <>
        <ol className="mx-auto max-w-3xl">
          {items.map((step, i) => (
            <li key={i} className="relative flex gap-5 pb-8 last:pb-0 sm:gap-6">
              {i < items.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[21px] top-12 w-px bg-line" /> : null}
              <StepMarker step={step} index={i} />
              <div className="min-w-0 pt-2">
                <h3 className="t-h3">{step.title}</h3>
                {step.body ? <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{step.body}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        <CtaRow primary={primary} className="mt-10 justify-center" />
      </>
    )
  }
  const cols = items.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <>
      <ol className={`grid gap-5 ${cols}`}>
        {items.map((step, i) => (
          <li key={i} className="surface p-6">
            <StepMarker step={step} index={i} />
            <h3 className="t-h3 mt-5">{step.title}</h3>
            {step.body ? <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{step.body}</p> : null}
          </li>
        ))}
      </ol>
      <CtaRow primary={primary} className="mt-10" />
    </>
  )
}

/* ─────────────────────────────── timeline ──────────────────────────────── */

export interface Milestone { period: string; title: string; body?: string; image?: string; alt?: string }

export function Timeline({ items }: { items: Milestone[] }) {
  if (!items.length) return null
  return (
    <ol className="relative mx-auto max-w-3xl space-y-10 border-l-2 border-line pl-8 sm:pl-10">
      {items.map((m, i) => (
        <li key={i} className="relative">
          <span aria-hidden="true" className="absolute -left-[calc(2rem+9px)] top-1.5 size-4 rounded-full border-[3px] border-white bg-green-600 ring-1 ring-line sm:-left-[calc(2.5rem+9px)]" />
          <p className="figure text-[1.25rem] text-green-700">{m.period}</p>
          <h3 className="t-h3 mt-1">{m.title}</h3>
          {m.body ? <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-600">{m.body}</p> : null}
          {m.image ? (
            <div className="mt-4 max-w-md">
              <Media src={m.image} alt={m.alt || m.title} ratio="16/9" sizes="(max-width: 640px) 100vw, 448px" />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/* ───────────────────────────────── video ───────────────────────────────── */

/** The video id from any of the addresses YouTube hands out; null when it is not a YouTube link. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.split('/')[1] || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{6,})/)
      return m?.[1] ?? null
    }
  } catch { /* not a URL */ }
  return null
}

export function VideoEmbed({ url, title, caption, width }: { url: string; title?: string; caption?: string; width: 'narrow' | 'wide' }) {
  const id = youtubeId(url)
  if (!id) return null
  return (
    <figure className={width === 'narrow' ? 'mx-auto max-w-3xl' : ''}>
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink-900 shadow-[var(--shadow-lift)]">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title || 'Video'}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      {caption ? <figcaption className="mt-3 text-[13.5px] text-ink-400">{caption}</figcaption> : null}
    </figure>
  )
}

/* ─────────────────────────────── logo cloud ────────────────────────────── */

export interface Logo { image: string; alt: string; href?: string }

export function LogoCloud({ logos, muted }: { logos: Logo[]; muted: boolean }) {
  if (!logos.length) return null
  const cols = logos.length <= 3 ? 'sm:grid-cols-3' : logos.length <= 4 ? 'sm:grid-cols-4' : logos.length <= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-3 lg:grid-cols-6'
  const wrap = (logo: Logo, node: ReactNode) => {
    if (!logo.href) return node
    return external(logo.href)
      ? <a href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt} className="block">{node}</a>
      : <Link href={logo.href} aria-label={logo.alt} className="block">{node}</Link>
  }
  return (
    <ul className={`grid grid-cols-2 gap-4 ${cols}`}>
      {logos.map((logo, i) => (
        <li key={i} className={`surface p-5 transition-[filter,opacity] duration-300 ${muted ? 'opacity-75 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}>
          {wrap(logo, <Media src={logo.image} alt={logo.alt} ratio="3/2" sizes="(max-width: 640px) 50vw, 200px" rounded={false} className="!bg-transparent [&>*]:!object-contain" />)}
        </li>
      ))}
    </ul>
  )
}
