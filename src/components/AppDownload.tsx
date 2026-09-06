import { APP_SMART_LINK, type AppSettings } from '@/contracts'
import { Shell, Band, Label, Icon, Action, Pill } from './ui'
import { Media } from './ui/Media'

/*
 * The koperasi's mobile app: a section any page can carry, and the badges the
 * smart-link page reuses. Store addresses come from Pengaturan → Aplikasi, so
 * a new release changes in one place and every page follows.
 */

function AppleLogo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function PlayLogo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198 2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658 16.8 8.99l-2.302 2.302-8.634-8.635z" />
    </svg>
  )
}

export type StoreMode = 'stores' | 'smart' | 'both'

/**
 * App Store and Google Play badges, plus the smart link that reads the phone
 * and opens the right one. A store with no address set does not get a badge.
 * `on` is the background the badges sit on, so they keep their contrast.
 */
export function StoreBadges({
  apps, mode, smartLabel, on = 'light', className = '',
}: { apps: AppSettings; mode: StoreMode; smartLabel?: string; on?: 'light' | 'dark'; className?: string }) {
  const showStores = mode !== 'smart'
  const showSmart = mode !== 'stores'
  const badges = [
    apps.appStoreUrl.trim() ? { href: apps.appStoreUrl.trim(), small: 'Unduh di', big: 'App Store', logo: <AppleLogo /> } : null,
    apps.playStoreUrl.trim() ? { href: apps.playStoreUrl.trim(), small: 'Dapatkan di', big: 'Google Play', logo: <PlayLogo /> } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null)

  if (showStores && !badges.length && !showSmart) {
    return <Pill tone={on === 'dark' ? 'light' : 'quiet'}>Segera tersedia di App Store dan Google Play</Pill>
  }

  const badgeCls = on === 'dark'
    ? 'bg-white text-ink-900 hover:bg-gold-50'
    : 'bg-ink-900 text-white ring-1 ring-inset ring-white/15 hover:bg-ink-800'

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {showStores
        ? badges.map((badge) => (
            <a
              key={badge.href}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-[52px] items-center gap-3 rounded-[var(--radius-input)] px-4 pr-5 transition-colors ${badgeCls}`}
            >
              {badge.logo}
              <span className="leading-tight">
                <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] opacity-70">{badge.small}</span>
                <span className="block text-[16px] font-bold">{badge.big}</span>
              </span>
            </a>
          ))
        : null}
      {showSmart ? (
        <Action href={APP_SMART_LINK} size="lg" variant={on === 'dark' ? 'gold' : 'primary'}>
          {smartLabel?.trim() || 'Unduh aplikasi'}
          <Icon.download className="size-4" />
        </Action>
      ) : null}
    </div>
  )
}

/** A phone outline for the section while no artwork has been uploaded. */
function PhoneSketch({ name, dark }: { name: string; dark: boolean }) {
  return (
    <div aria-hidden="true" className={`mx-auto aspect-[9/19] w-52 rounded-[2.2rem] border-[6px] p-4 shadow-[var(--shadow-lift)] ${dark ? 'border-white/20 bg-gradient-to-b from-green-600 to-green-800' : 'border-ink-800 bg-gradient-to-b from-green-600 to-green-800'}`}>
      <span className="mx-auto block h-1.5 w-16 rounded-full bg-white/30" />
      <p className="mt-14 text-center text-[13px] font-bold leading-snug text-white">{name}</p>
      <span className="mx-auto mt-6 block h-2 w-24 rounded-full bg-white/25" />
      <span className="mx-auto mt-2 block h-2 w-16 rounded-full bg-white/25" />
    </div>
  )
}

export function AppDownload({
  eyebrow, heading, body, bullets, image, alt, apps, mode, smartLabel, tone, bandTone,
}: {
  eyebrow?: string
  heading: string
  body?: string
  bullets: { text: string }[]
  image?: string
  alt?: string
  apps: AppSettings
  mode: StoreMode
  smartLabel?: string
  tone: 'dark' | 'light'
  /** The alternating tone the renderer would give a light section. */
  bandTone: 'default' | 'alt'
}) {
  const dark = tone === 'dark'
  return (
    <Band tone={dark ? 'dark' : bandTone}>
      <Shell>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="max-w-[54ch]">
            {eyebrow ? <Label tone={dark ? 'gold' : 'green'}>{eyebrow}</Label> : null}
            <h2 className={`t-h2 ${eyebrow ? 'mt-3' : ''} ${dark ? '!text-white' : ''}`}>{heading}</h2>
            {body ? <p className={`t-lead mt-4 ${dark ? 'text-white/70' : ''}`}>{body}</p> : null}
            {bullets.length ? (
              <ul className="mt-6 grid gap-3">
                {bullets.map((item, i) => (
                  <li key={i} className={`flex items-start gap-3 text-[15px] leading-snug ${dark ? 'text-white/85' : 'text-ink-700'}`}>
                    <Icon.checkCircle className={`mt-0.5 size-5 shrink-0 ${dark ? 'text-gold-300' : 'text-green-600'}`} />
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : null}
            <StoreBadges apps={apps} mode={mode} smartLabel={smartLabel} on={dark ? 'dark' : 'light'} className="mt-8" />
          </div>
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            {image ? (
              <Media src={image} alt={alt?.trim() || `${apps.appName} di ponsel`} ratio="4/5" sizes="(max-width: 640px) 80vw, 400px" rounded={false} className="!bg-transparent [&>*]:!object-contain" />
            ) : (
              <PhoneSketch name={apps.appName} dark={dark} />
            )}
          </div>
        </div>
      </Shell>
    </Band>
  )
}
