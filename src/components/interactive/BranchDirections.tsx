'use client'

import { useMemo } from 'react'
import { Action, Icon } from '../ui'
import { BranchMap } from './BranchMap'
import { fmtKm, fmtMinutes, useRoute, useVisitorLocation } from './branch-route'

/**
 * The map on an office's own page: the office, and the way there from where
 * the reader is.
 *
 * The route is drawn without a press. A reader who already offered their
 * position on the list is not asked again; anyone else is asked once as the
 * page opens, and a "no" leaves a button rather than the same question on the
 * next office. This is also the one place with a way out to Google Maps, for
 * turn-by-turn directions the page does not try to give.
 */
export function BranchDirections({
  branch, mapsHref,
}: {
  branch: { id: string; name: string; lat: number; lng: number }
  /** The office's Google Maps link, or directions to its coordinates. */
  mapsHref: string
}) {
  const { origin, state, ask } = useVisitorLocation({ askOnArrival: true })
  const located = Number.isFinite(branch.lat) && Number.isFinite(branch.lng) && (branch.lat !== 0 || branch.lng !== 0)
  const points = useMemo(() => [{ id: branch.id, name: branch.name, lat: branch.lat, lng: branch.lng }], [branch.id, branch.name, branch.lat, branch.lng])
  const route = useRoute(origin, located ? points[0] : null)

  return (
    // scroll-mt: "Arah" on a card elsewhere lands here, under the sticky header.
    <div id="rute" className="surface scroll-mt-[124px] overflow-hidden">
      {located ? (
        <BranchMap
          points={points}
          you={origin}
          selectedId={branch.id}
          route={route?.data ?? null}
          className="h-72 w-full sm:h-80"
        />
      ) : null}

      <div className="p-5">
        <p className="text-[13px] font-semibold text-ink-900">Rute dari lokasi Anda</p>
        <div aria-live="polite" className="mt-1 text-sm leading-relaxed text-ink-600">
          {!located ? (
            <p>Titik kantor ini belum ada di peta. Gunakan Google Maps untuk petunjuk jalan.</p>
          ) : route ? (
            route.loading || !route.data ? (
              <p>Mencari rute dari lokasi Anda…</p>
            ) : route.data.exact ? (
              <p className="tnum">
                <span className="text-[1.35rem] font-bold leading-tight tracking-[-0.01em] text-ink-900">{fmtKm(route.data.km)}</span>
                {route.data.minutes !== null ? <span> · sekitar {fmtMinutes(route.data.minutes)} berkendara</span> : null}
              </p>
            ) : (
              <p className="tnum">Rute jalan belum bisa dimuat. Jarak garis lurus {fmtKm(route.data.km)}; buka Google Maps untuk petunjuk jalan.</p>
            )
          ) : state === 'asking' ? (
            <p>Izinkan akses lokasi di peramban Anda untuk melihat rute ke kantor ini…</p>
          ) : state === 'denied' ? (
            <p>Izin lokasi tidak diberikan, jadi rute belum bisa digambar. Anda tetap bisa membuka petunjuk jalan di Google Maps.</p>
          ) : state === 'unsupported' ? (
            <p>Peramban ini tidak bisa mendeteksi lokasi. Buka Google Maps untuk petunjuk jalan.</p>
          ) : (
            <p>Bagikan lokasi Anda untuk melihat rute dan perkiraan waktu tempuh ke kantor ini.</p>
          )}
        </div>

        <div className="mt-4 grid gap-2">
          {located && !origin && state !== 'unsupported' ? (
            <Action type="button" onClick={ask} disabled={state === 'asking'} variant="dark" full>
              <Icon.compass className="size-4" />
              {state === 'asking' ? 'Mencari…' : state === 'denied' ? 'Coba lagi' : 'Gunakan lokasi saya'}
            </Action>
          ) : null}
          <Action href={mapsHref} external variant={origin || !located ? 'primary' : 'outline'} full>
            Buka di Google Maps <Icon.arrow className="size-4" />
          </Action>
        </div>

        {located ? (
          <p className="tnum mt-4 text-[12.5px] text-ink-400">
            Koordinat {branch.lat.toFixed(5)}, {branch.lng.toFixed(5)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
