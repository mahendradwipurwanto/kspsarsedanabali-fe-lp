import type { ReactNode } from 'react'
import Link from 'next/link'
import { getOpenState, telLink, waLink, DAY_NAMES_ID } from '@/contracts'
import type { Branch } from '@/lib/api'
import { Action, Tile, Icon } from './ui'

export function OpenBadge({ branch }: { branch: Branch }) {
  // Computed in WITA on the server, so it never depends on the visitor's clock.
  const state = getOpenState(branch.hours)
  return (
    <p className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold ${
      state.isOpen ? 'border-green-200 bg-green-50 text-green-700' : 'border-gold-200 bg-gold-50 text-gold-700'
    }`}>
      <span className={`size-1.5 rounded-full ${state.isOpen ? 'bg-green-500' : 'bg-gold-400'}`} aria-hidden="true" />
      {state.label}
    </p>
  )
}

/**
 * One office in a list.
 *
 * The whole card opens the office's own page: its name is the link, stretched
 * over the card, so it works without script and reads as one link to a screen
 * reader. Everything else that can be pressed sits above that link.
 */
export function BranchCard({
  branch, showHours = true, distanceKm, onRoute, selected = false, note,
}: {
  branch: Branch
  showHours?: boolean
  distanceKm?: number
  /**
   * Given by the office finder, which has a map beside the list: "Arah" then
   * draws the way to this office there. Without it "Arah" opens the office's
   * page, where the route is drawn and the link out to Google Maps lives.
   */
  onRoute?: () => void
  /** This is the office the map is showing. */
  selected?: boolean
  /** A line under the open badge of the selected card: the route's length and time. */
  note?: ReactNode
}) {
  const page = `/lokasi/${branch.slug}`
  return (
    <li
      data-branch={branch.id}
      className={`surface surface-i relative flex cursor-pointer flex-col p-5 sm:p-6 ${selected ? '!border-green-600 shadow-[0_0_0_1px_var(--color-green-600),var(--shadow-raised)]' : ''}`}
    >
      <div className="flex items-start gap-3.5">
        <Tile tone="dark"><Icon.pin className="size-5" /></Tile>
        <div className="min-w-0 flex-1">
          <h3 className="t-h3">
            <Link href={page} className="transition-colors after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] hover:text-green-700">{branch.name}</Link>
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{branch.address}</p>
        </div>
        {distanceKm !== undefined ? (
          <span className="tnum shrink-0 rounded-full bg-night-900 px-2.5 py-1 text-[12px] font-bold text-gold-300">
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1).replace('.', ',')} km`}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <OpenBadge branch={branch} />
      </div>
      {note ? <p aria-live="polite" className="tnum mt-3 rounded-[var(--radius-input)] border border-green-100 bg-green-50 px-3 py-2 text-[13px] leading-relaxed text-green-800">{note}</p> : null}

      {showHours ? (
        <details className="group/hrs relative mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-green-700">
            <Icon.clock className="size-4" />
            Lihat jam buka
            <Icon.chevron className="size-3.5 transition-transform group-open/hrs:rotate-180" />
          </summary>
          <ul className="tnum mt-3 divide-y divide-line rounded-[var(--radius-input)] border border-line bg-paper px-3.5 py-2 text-[13px] text-ink-500">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const h = branch.hours.find((x) => x.day === day)
              return (
                <li key={day} className="flex justify-between gap-6 py-1.5">
                  <span>{DAY_NAMES_ID[day]}</span>
                  <span className={h?.opensAt ? 'font-semibold text-ink-900' : 'text-ink-300'}>
                    {h?.opensAt ? `${h.opensAt}–${h.closesAt}` : 'Tutup'}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}

      <div aria-hidden="true" className="h-5" />
      <div className="relative mt-auto grid grid-cols-3 gap-2 border-t border-line pt-5">
        <Action href={branch.phone ? telLink(branch.phone) : '#'} external variant="outline" size="sm" className="px-2">
          <Icon.phone className="size-4" />
          <span className="hidden text-[12px] sm:inline">Telepon</span>
        </Action>
        <Action href={waLink(branch.whatsapp || branch.phone || '', `Halo ${branch.name}, saya ingin bertanya tentang produk koperasi.`)}
          external size="sm" className="px-2">
          <Icon.whatsapp className="size-4" />
          <span className="hidden text-[12px] sm:inline">WhatsApp</span>
        </Action>
        {onRoute ? (
          <Action type="button" onClick={onRoute} aria-pressed={selected} aria-label={`Lihat rute ke ${branch.name} di peta`}
            variant={selected ? 'dark' : 'outline'} size="sm" className="px-2">
            <Icon.compass className="size-4" />
            <span className="hidden text-[12px] sm:inline">Arah</span>
          </Action>
        ) : (
          <Action href={`${page}#rute`} variant="outline" size="sm" className="px-2">
            <Icon.compass className="size-4" />
            <span className="hidden text-[12px] sm:inline">Arah</span>
          </Action>
        )}
      </div>
    </li>
  )
}
