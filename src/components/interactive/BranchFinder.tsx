'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { distanceKm } from '@/contracts'
import type { Branch } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { field } from '../ui/form'
import { BranchCard } from '../BranchCard'
import { BranchMap } from './BranchMap'
import { fmtKm, fmtMinutes, useRoute, useVisitorLocation } from './branch-route'

export function BranchFinder({ branches, showMap = true }: { branches: Branch[]; showMap?: boolean }) {
  const { origin, state: geoState, ask: askLocation } = useVisitorLocation()
  const [query, setQuery] = useState('')
  /** The office shown on the map: picked with "Arah" on its card, or by pressing its pin. */
  const [selected, setSelected] = useState<string | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const mapBox = useRef<HTMLDivElement>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? branches.filter((b) =>
          [b.name, b.address, b.district, b.village, b.regency].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      : branches
    if (!origin) return filtered.map((branch) => ({ branch, km: undefined as number | undefined }))
    return filtered
      .map((branch) => ({ branch, km: distanceKm(origin, { lat: branch.latitude, lng: branch.longitude }) }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
  }, [branches, origin, query])

  /** Only offices whose coordinates are usable get a pin. */
  const pins = useMemo(
    () => ranked
      .filter(({ branch }) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude) && (branch.latitude !== 0 || branch.longitude !== 0))
      .map(({ branch }) => ({ id: branch.id, name: branch.name, lat: branch.latitude, lng: branch.longitude })),
    [ranked],
  )

  /** Districts a search would actually match, rather than three names fixed in the code. */
  const examples = useMemo(() => {
    const names = [...new Set(branches.map((b) => b.district || b.regency).filter(Boolean))].slice(0, 3)
    return names.map((n) => `“${n}”`).join(', ')
  }, [branches])

  const smooth = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior

  /**
   * "Arah" on a card: draw the way to that office on the map, and bring the
   * map into view where it sits below the list. A reader who has not offered
   * their position yet is asked now; the office is shown either way, and the
   * route joins it the moment the answer is yes.
   */
  const routeTo = useCallback((id: string) => {
    setSelected(id)
    setFocusTick((n) => n + 1)
    if (!origin) askLocation()
    track('branch_route', { located: Boolean(origin) })
    const box = mapBox.current?.getBoundingClientRect()
    if (box && (box.top > window.innerHeight - 120 || box.bottom < 120)) {
      mapBox.current?.scrollIntoView({ block: 'center', behavior: smooth() })
    }
  }, [origin, askLocation])

  /** A pin was pressed: pick its card too, or let go of it when it was already the one. */
  const selectFromMap = useCallback((id: string) => {
    if (selectedRef.current === id) { setSelected(null); return }
    setSelected(id)
    track('branch_select', { from: 'map' })
    // After this render, so the card being scrolled to already wears its selected look.
    requestAnimationFrame(() => {
      list.current?.querySelector(`[data-branch="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: smooth() })
    })
  }, [])

  // An office filtered out of the list is no longer on the map either.
  useEffect(() => {
    if (selected && !pins.some((p) => p.id === selected)) setSelected(null)
  }, [pins, selected])

  const shownRoute = useRoute(origin, selected ? pins.find((p) => p.id === selected) : null)
  const selectedName = selected ? branches.find((b) => b.id === selected)?.name ?? '' : ''
  /** The line under the picked card: the route, or why there is none yet. */
  const routeNote = shownRoute
    ? shownRoute.loading || !shownRoute.data
      ? 'Mencari rute dari lokasi Anda…'
      : shownRoute.data.exact
        ? `Rute berkendara dari lokasi Anda: ${fmtKm(shownRoute.data.km)}${shownRoute.data.minutes !== null ? `, sekitar ${fmtMinutes(shownRoute.data.minutes)}` : ''}.`
        : `Rute jalan belum bisa dimuat. Jarak garis lurus ${fmtKm(shownRoute.data.km)}; buka halaman kantor ini untuk petunjuk jalan.`
    : origin
      ? null
      : geoState === 'asking'
        ? 'Izinkan akses lokasi di peramban Anda agar rutenya bisa digambar…'
        : geoState === 'denied'
          ? 'Izin lokasi tidak diberikan, jadi rute belum bisa digambar. Kantor ini tetap ditampilkan di peta.'
          : geoState === 'unsupported'
            ? 'Peramban ini tidak bisa mendeteksi lokasi, jadi rute belum bisa digambar. Kantor ini tetap ditampilkan di peta.'
            : null

  return (
    <div className={showMap ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10' : ''}>
      <div ref={list}>
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="branch-search">Cari kecamatan atau desa</label>
          <input
            id="branch-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kecamatan atau desa…" className={field}
          />
          <Action type="button" onClick={askLocation} disabled={geoState === 'asking'} variant="dark">
            <Icon.compass className="size-4" />
            {geoState === 'asking' ? 'Mencari…' : 'Gunakan lokasi saya'}
          </Action>
        </div>

        <p aria-live="polite" className="tnum mt-4 flex items-center gap-2.5 text-[13px] text-ink-500">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {geoState === 'denied'
            ? 'Izin lokasi tidak diberikan. Ketik nama kecamatan Anda.'
            : geoState === 'unsupported'
              ? 'Peramban tidak mendukung deteksi lokasi. Ketik nama kecamatan.'
              : `${ranked.length} kantor${origin ? ', diurutkan dari yang terdekat' : ''}`}
        </p>
        {showMap && pins.length ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
            Tekan “Arah” untuk melihat rute dari lokasi Anda di peta. Klik kartu kantor untuk membuka halamannya.
          </p>
        ) : null}

        {ranked.length ? (
          <ul className="mt-5 grid gap-4">
            {ranked.map(({ branch, km }) => {
              // Only an office with a pin can be routed to on the map; for the
              // rest "Arah" leads to the office's own page.
              const onMap = showMap && pins.some((p) => p.id === branch.id)
              const isSelected = onMap && selected === branch.id
              return (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  distanceKm={km}
                  onRoute={onMap ? () => routeTo(branch.id) : undefined}
                  selected={isSelected}
                  note={isSelected ? routeNote : null}
                />
              )
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper px-5 py-10 text-center text-[14px] text-ink-500">
            Tidak ada kantor yang cocok dengan “{query}”.{examples ? ` Coba ${examples}.` : ''}
          </p>
        )}
      </div>

      {showMap && pins.length ? (
        // Pinned beside the list on wide screens, and no taller than the
        // window: a map as tall as the whole list put the office just picked
        // somewhere below the fold, which is the one place it must not be.
        <div ref={mapBox} className="surface relative overflow-hidden lg:sticky lg:top-[124px] lg:self-start">
          {/* Tiles and pins are drawn here rather than in an OpenStreetMap
              embed, which carries one marker at most and none of these. The
              way out to a maps app is on each office's own page. */}
          <BranchMap
            points={pins}
            you={origin}
            selectedId={selected}
            route={shownRoute?.data ?? null}
            focusTick={focusTick}
            onSelect={selectFromMap}
            onReset={() => setSelected(null)}
            className="h-[340px] w-full sm:h-[440px] lg:h-[clamp(420px,calc(100vh-156px),680px)]"
          />
          {selected ? (
            <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex">
              <p aria-live="polite" className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-[var(--radius-tile)] border border-line bg-white/95 py-1.5 pl-3 pr-1.5 text-[12.5px] text-ink-700 shadow-[var(--shadow-raised)]">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink-900">{selectedName}</span>
                  {shownRoute ? (
                    <span className="tnum block truncate">
                      {shownRoute.loading || !shownRoute.data
                        ? 'Mencari rute…'
                        : shownRoute.data.exact
                          ? `${fmtKm(shownRoute.data.km)}${shownRoute.data.minutes !== null ? ` · ±${fmtMinutes(shownRoute.data.minutes)} berkendara` : ''}`
                          : `Garis lurus ${fmtKm(shownRoute.data.km)}`}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Tampilkan semua kantor lagi"
                  title="Tampilkan semua kantor lagi"
                  className="grid size-7 shrink-0 place-items-center rounded-[6px] text-[16px] leading-none text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
                >
                  ×
                </button>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
