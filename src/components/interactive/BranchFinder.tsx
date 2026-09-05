'use client'

import { useMemo, useState } from 'react'
import { distanceKm } from '@/contracts'
import type { Branch } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { field } from '../ui/form'
import { BranchCard } from '../BranchCard'

export function BranchFinder({ branches, showMap = true }: { branches: Branch[]; showMap?: boolean }) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [query, setQuery] = useState('')
  const [geoState, setGeoState] = useState<'idle' | 'asking' | 'denied' | 'unsupported'>('idle')

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

  /** Districts a search would actually match, rather than three names fixed in the code. */
  const examples = useMemo(() => {
    const names = [...new Set(branches.map((b) => b.district || b.regency).filter(Boolean))].slice(0, 3)
    return names.map((n) => `“${n}”`).join(', ')
  }, [branches])

  function useMyLocation() {
    if (!('geolocation' in navigator)) return setGeoState('unsupported')
    setGeoState('asking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoState('idle')
        track('branch_locate', { granted: true })
      },
      // Denial is a normal outcome, not an error to apologise for.
      () => { setGeoState('denied'); track('branch_locate', { granted: false }) },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    )
  }

  return (
    <div className={showMap ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10' : ''}>
      <div>
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="branch-search">Cari kecamatan atau desa</label>
          <input
            id="branch-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kecamatan atau desa…" className={field}
          />
          <Action type="button" onClick={useMyLocation} disabled={geoState === 'asking'} variant="dark">
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

        {ranked.length ? (
          <ul className="mt-5 grid gap-4">
            {ranked.map(({ branch, km }) => <BranchCard key={branch.id} branch={branch} distanceKm={km} />)}
          </ul>
        ) : (
          <p className="mt-5 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper px-5 py-10 text-center text-[14px] text-ink-500">
            Tidak ada kantor yang cocok dengan “{query}”.{examples ? ` Coba ${examples}.` : ''}
          </p>
        )}
      </div>

      {showMap ? (
        <div className="surface relative overflow-hidden">
          {/* Static embed keeps a paid Maps key and a third-party script off the
              critical path. Each card still deep-links to turn-by-turn directions. */}
          <iframe
            title="Peta lokasi kantor KSP Sari Sedana Bali"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[340px] w-full sm:h-[440px] lg:h-full lg:min-h-[560px]"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              Math.min(...branches.map((b) => b.longitude)) - 0.08
            }%2C${Math.min(...branches.map((b) => b.latitude)) - 0.06}%2C${
              Math.max(...branches.map((b) => b.longitude)) + 0.08
            }%2C${Math.max(...branches.map((b) => b.latitude)) + 0.06}&layer=mapnik`}
          />
        </div>
      ) : null}
    </div>
  )
}
