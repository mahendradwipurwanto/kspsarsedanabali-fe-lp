import Link from 'next/link'
import { getOpenState, telLink, waLink, directionsLink, DAY_NAMES_ID } from '@mahendradwipurwanto/ksp-contracts'
import type { Branch } from '@/lib/api'
import { Card, Action, Tile, Icon } from './ui'

export function OpenBadge({ branch }: { branch: Branch }) {
  // Computed in WITA on the server, so it never depends on the visitor's clock.
  const state = getOpenState(branch.hours)
  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${
      state.isOpen ? 'bg-green-50 text-green-700' : 'bg-[#fdf3ec] text-[#a86224]'
    }`}>
      <span className={`size-1.5 rounded-full ${state.isOpen ? 'bg-green-500' : 'bg-[#d98b3c]'}`} aria-hidden="true" />
      {state.label}
    </p>
  )
}

export function BranchCard({ branch, showHours = true, distanceKm }: { branch: Branch; showHours?: boolean; distanceKm?: number }) {
  return (
    <Card as="li" hover className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <Tile tone="soft"><Icon.pin className="size-5" /></Tile>
        <div className="min-w-0 flex-1">
          <h3 className="t-h3">
            <Link href={`/lokasi/${branch.slug}`} className="transition-colors hover:text-green-700">{branch.name}</Link>
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{branch.address}</p>
        </div>
        {distanceKm !== undefined ? (
          <span className="tnum shrink-0 rounded-full bg-gradient-to-b from-green-50 to-[#e8f0e2] px-2.5 py-1 text-[12px] font-bold text-green-700 shadow-[var(--edge-top)] ring-1 ring-inset ring-green-100">
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1).replace('.', ',')} km`}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <OpenBadge branch={branch} />
      </div>

      {showHours ? (
        <details className="group/hrs mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-green-700">
            <Icon.clock className="size-4" />
            Lihat jam buka
            <Icon.chevron className="size-3.5 transition-transform group-open/hrs:rotate-180" />
          </summary>
          <ul className="tnum mt-3 divide-y divide-line rounded-[var(--radius-input)] bg-surface-alt p-3.5 text-[13px] text-slate-500 shadow-[inset_0_1px_2px_rgb(31_42_68/0.04)]">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const h = branch.hours.find((x) => x.day === day)
              return (
                <li key={day} className="flex justify-between gap-6 py-1.5 first:pt-0 last:pb-0">
                  <span>{DAY_NAMES_ID[day]}</span>
                  <span className={h?.opensAt ? 'font-semibold text-navy-800' : 'text-slate-300'}>
                    {h?.opensAt ? `${h.opensAt}–${h.closesAt}` : 'Tutup'}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}

      {/* Spacer, not a margin: mt-auto on the row below must stay free to push
          the actions to the card floor so they line up across the grid. */}
      <div aria-hidden="true" className="h-5" />
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-5">
        <Action href={branch.phone ? telLink(branch.phone) : '#'} external variant="outline" size="sm" className="px-2">
          <Icon.phone className="size-4" />
          <span className="hidden text-[12px] sm:inline">Telepon</span>
        </Action>
        <Action href={waLink(branch.whatsapp || branch.phone || '', `Halo ${branch.name}, saya ingin bertanya tentang produk koperasi.`)}
          external size="sm" className="px-2">
          <Icon.whatsapp className="size-4" />
          <span className="hidden text-[12px] sm:inline">WhatsApp</span>
        </Action>
        <Action href={branch.mapsUrl || directionsLink(branch.latitude, branch.longitude, branch.name)}
          external variant="outline" size="sm" className="px-2">
          <Icon.compass className="size-4" />
          <span className="hidden text-[12px] sm:inline">Arah</span>
        </Action>
      </div>
    </Card>
  )
}
