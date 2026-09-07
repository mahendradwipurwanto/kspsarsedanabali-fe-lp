'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui'

/*
 * A map with a pin on every office, and one on the reader.
 *
 * The OpenStreetMap embed this replaces takes a bounding box and draws no
 * markers — it carries one at most, and there are three offices. Overlaying our
 * own pins on that iframe was not an option either: the embed fits the box to
 * whatever shape the frame happens to be, so a pin placed from the box we asked
 * for lands somewhere near the office rather than on it.
 *
 * So the tiles are placed here. It is the standard Web Mercator arithmetic and
 * a grid of <img>, which is small enough not to be worth a mapping library, and
 * it means a pin's position is computed from the same projection as the tile
 * under it — the pins are exact by construction.
 */

const TILE = 256
const MIN_ZOOM = 5
const MAX_ZOOM = 17

export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  href?: string
}

/** Longitude → world pixels at a zoom, and back. */
const lngToX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z
const latToY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z
}
const xToLng = (x: number, z: number) => (x / (TILE * 2 ** z)) * 360 - 180
const yToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * 2 ** z)
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** The tightest whole zoom at which every point still fits the frame. */
function fit(points: { lat: number; lng: number }[], w: number, h: number) {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const centre = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
  if (points.length === 1) return { centre, zoom: 14 }

  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
    const spanX = lngToX(Math.max(...lngs), z) - lngToX(Math.min(...lngs), z)
    const spanY = latToY(Math.min(...lats), z) - latToY(Math.max(...lats), z)
    // Room for the pins themselves, which stand above their anchor point.
    if (spanX < w - 96 && spanY < h - 96) return { centre, zoom: z }
  }
  return { centre, zoom: MIN_ZOOM }
}

export function BranchMap({
  points, you, className, onSelect,
}: {
  points: MapPoint[]
  /** Where the reader is, once they have offered it. */
  you?: { lat: number; lng: number } | null
  className?: string
  onSelect?: (id: string) => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number } | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect
      if (r) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Frame everything the first time the size is known, and again when the
  // reader's own position joins the set.
  const all = useMemo(() => (you ? [...points, you] : points), [points, you])
  const key = all.map((p) => `${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    if (!size.w || !size.h || !all.length) return
    const { centre, zoom } = fit(all, size.w, size.h)
    setView({ ...centre, zoom })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size.w, size.h])

  const project = useCallback(
    (lat: number, lng: number) => {
      if (!view) return null
      const cx = lngToX(view.lng, view.zoom)
      const cy = latToY(view.lat, view.zoom)
      return { x: lngToX(lng, view.zoom) - cx + size.w / 2, y: latToY(lat, view.zoom) - cy + size.h / 2 }
    },
    [view, size.w, size.h],
  )

  const tiles = useMemo(() => {
    if (!view || !size.w || !size.h) return []
    const n = 2 ** view.zoom
    const cx = lngToX(view.lng, view.zoom)
    const cy = latToY(view.lat, view.zoom)
    const left = cx - size.w / 2
    const top = cy - size.h / 2
    const out: { key: string; src: string; left: number; top: number }[] = []
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue
        // Wrap around the antimeridian rather than leaving a gap.
        const wx = ((tx % n) + n) % n
        out.push({
          key: `${view.zoom}/${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${view.zoom}/${wx}/${ty}.png`,
          left: tx * TILE - left,
          top: ty * TILE - top,
        })
      }
    }
    return out
  }, [view, size.w, size.h])

  const pan = (dx: number, dy: number) => {
    setView((v) => {
      if (!v) return v
      const x = lngToX(v.lng, v.zoom) - dx
      const y = clamp(latToY(v.lat, v.zoom) - dy, 0, TILE * 2 ** v.zoom)
      return { lat: yToLat(y, v.zoom), lng: xToLng(x, v.zoom), zoom: v.zoom }
    })
  }

  const zoomBy = (step: number) =>
    setView((v) => (v ? { ...v, zoom: clamp(v.zoom + step, MIN_ZOOM, MAX_ZOOM) } : v))

  const reset = () => {
    if (!size.w || !all.length) return
    const { centre, zoom } = fit(all, size.w, size.h)
    setView({ ...centre, zoom })
  }

  return (
    <div className={`relative overflow-hidden bg-[#eef2ea] ${className ?? ''}`}>
      <div
        ref={frame}
        role="application"
        aria-label="Peta lokasi kantor"
        className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
        onPointerDown={(e) => {
          // Capturing the pointer sends the click to the capturing element, so
          // a press that starts on a pin has to be left alone or the pin never
          // hears its own click.
          if ((e.target as HTMLElement).closest('button')) return
          drag.current = { x: e.clientX, y: e.clientY, moved: false }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true
          drag.current = { x: e.clientX, y: e.clientY, moved: d.moved }
          pan(dx, dy)
        }}
        onPointerUp={(e) => {
          drag.current = null
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onPointerCancel={() => { drag.current = null }}
      >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={t.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="lazy"
            width={TILE}
            height={TILE}
            className="pointer-events-none absolute select-none"
            style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
          />
        ))}

        {/* The reader's own position: a dot, not a pin, so it never reads as an office. */}
        {you && view
          ? (() => {
              const p = project(you.lat, you.lng)
              if (!p) return null
              return (
                <span
                  className="pointer-events-none absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center"
                  style={{ left: p.x, top: p.y }}
                >
                  <span className="absolute size-8 animate-ping rounded-full bg-ink-900/15" />
                  <span className="size-3.5 rounded-full border-2 border-white bg-ink-900 shadow-[0_1px_4px_rgb(15_27_45/0.5)]" />
                  <span className="sr-only">Perkiraan lokasi Anda</span>
                </span>
              )
            })()
          : null}

        {view
          ? points.map((pt) => {
              const p = project(pt.lat, pt.lng)
              if (!p) return null
              const on = active === pt.id
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => { if (!drag.current?.moved) { setActive(on ? null : pt.id); onSelect?.(pt.id) } }}
                  aria-label={pt.name}
                  className="absolute z-20 -translate-x-1/2 -translate-y-full"
                  style={{ left: p.x, top: p.y }}
                >
                  <span className={`grid size-8 place-items-center rounded-full border-2 border-white text-white shadow-[0_2px_8px_rgb(15_27_45/0.35)] transition-transform ${on ? 'scale-110 bg-ink-900' : 'bg-green-600 hover:scale-110'}`}>
                    <Icon.pin className="size-4" />
                  </span>
                  <span aria-hidden="true" className={`mx-auto -mt-0.5 block size-2 rotate-45 border-b-2 border-r-2 border-white ${on ? 'bg-ink-900' : 'bg-green-600'}`} />
                  {on ? (
                    <span className="absolute bottom-full left-1/2 mb-1.5 w-max max-w-[200px] -translate-x-1/2 truncate rounded-[var(--radius-tile)] bg-ink-900 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-[var(--shadow-lift)]">
                      {pt.name}
                    </span>
                  ) : null}
                </button>
              )
            })
          : null}
      </div>

      {/* Bottom left: the site's own header is sticky and would sit over these
          the moment the map fills the screen. */}
      <div className="absolute bottom-3 left-3 z-30 grid gap-1.5">
        <MapButton label="Perbesar" onClick={() => zoomBy(1)}><span className="text-[15px] leading-none">+</span></MapButton>
        <MapButton label="Perkecil" onClick={() => zoomBy(-1)}><span className="text-[15px] leading-none">−</span></MapButton>
        <MapButton label="Tampilkan semua kantor" onClick={reset}><Icon.compass className="size-4" /></MapButton>
      </div>

      {/* Required by the tiles' licence. */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 right-0 z-30 bg-white/85 px-1.5 py-0.5 text-[10px] text-ink-500 hover:text-ink-900"
      >
        © OpenStreetMap
      </a>
    </div>
  )
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-[var(--radius-tile)] border border-line bg-white/95 text-ink-700 shadow-[var(--shadow-card)] transition-colors hover:bg-white hover:text-ink-900"
    >
      {children}
    </button>
  )
}
