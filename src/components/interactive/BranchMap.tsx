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

/** A line from the reader to an office: the road route, or a straight line when no route could be had. */
export interface MapRoute {
  /** [lng, lat] pairs, the order GeoJSON and the routing service use. */
  coords: [number, number][]
  /** False for the straight-line stand-in, which is drawn dashed so it is not mistaken for a road. */
  exact: boolean
}

type View = { lat: number; lng: number; zoom: number }

/** How close an office is shown when it is picked on its own. */
const FOCUS_ZOOM = 15
const FLY_MS = 550

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function BranchMap({
  points, you, className, onSelect, selectedId, route, focusTick = 0, onReset,
}: {
  points: MapPoint[]
  /** Where the reader is, once they have offered it. */
  you?: { lat: number; lng: number } | null
  className?: string
  onSelect?: (id: string) => void
  /**
   * The office picked in the list beside the map. Given, the map follows it:
   * it moves to the office, or frames the way there once a route is known.
   * Left out, a pin simply remembers that it was pressed.
   */
  selectedId?: string | null
  /** The way from the reader to the selected office. */
  route?: MapRoute | null
  /** Bumped when the same office is picked again, to bring it back into view. */
  focusTick?: number
  /** "Tampilkan semua kantor" was pressed: the owner clears its selection. */
  onReset?: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const viewRef = useRef<View | null>(null)
  viewRef.current = view
  const flight = useRef<number | null>(null)
  const active = selectedId !== undefined ? selectedId : pressed

  const land = useCallback(() => {
    if (flight.current !== null) cancelAnimationFrame(flight.current)
    flight.current = null
  }, [])
  useEffect(() => land, [land])

  /**
   * Move the view to a new centre and zoom, gliding when the trip is short.
   *
   * A long trip is a jump instead: gliding across half an island at street
   * level would ask the tile server for hundreds of images nobody sees. The
   * same goes for a reader who asked for less motion.
   */
  const flyTo = useCallback((target: View) => {
    land()
    const from = viewRef.current
    if (!from || prefersReducedMotion()) { setView(target); return }
    const z = Math.min(from.zoom, target.zoom)
    const far = Math.hypot(lngToX(target.lng, z) - lngToX(from.lng, z), latToY(target.lat, z) - latToY(from.lat, z))
    if (far > 1.5 * Math.max(size.w, size.h) || (far < 1 && from.zoom === target.zoom)) { setView(target); return }

    const fx = lngToX(from.lng, 0), fy = latToY(from.lat, 0)
    const tx = lngToX(target.lng, 0), ty = latToY(target.lat, 0)
    const started = performance.now()
    const step = (now: number) => {
      const t = clamp((now - started) / FLY_MS, 0, 1)
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      if (t >= 1) { flight.current = null; setView(target); return }
      setView({
        lng: xToLng(fx + (tx - fx) * e, 0),
        lat: yToLat(fy + (ty - fy) * e, 0),
        // Tiles exist at whole zooms only, so the zoom steps while the centre glides.
        zoom: Math.round(from.zoom + (target.zoom - from.zoom) * e),
      })
      flight.current = requestAnimationFrame(step)
    }
    flight.current = requestAnimationFrame(step)
  }, [land, size.w, size.h])

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
  // reader's own position joins the set. With an office picked, frame that
  // instead: the office up close, or the whole way there when the reader's
  // position is known — first the two ends, then the road between them once
  // the route arrives.
  const all = useMemo(() => (you ? [...points, you] : points), [points, you])
  const key = all.map((p) => `${p.lat},${p.lng}`).join('|')
  const picked = selectedId ? points.find((p) => p.id === selectedId) ?? null : null
  const routeKey = route ? `${route.exact}:${route.coords.length}:${route.coords[0]?.join(',')}:${route.coords[route.coords.length - 1]?.join(',')}` : ''
  useEffect(() => {
    if (!size.w || !size.h || !all.length) return
    if (!picked) {
      const { centre, zoom } = fit(all, size.w, size.h)
      land()
      setView({ ...centre, zoom })
      return
    }
    if (!you) { flyTo({ lat: picked.lat, lng: picked.lng, zoom: FOCUS_ZOOM }); return }
    // A loop, not Math.min(...): a route across the island is thousands of points.
    const box = { south: Math.min(you.lat, picked.lat), north: Math.max(you.lat, picked.lat), west: Math.min(you.lng, picked.lng), east: Math.max(you.lng, picked.lng) }
    for (const [lng, lat] of route?.coords ?? []) {
      if (lat < box.south) box.south = lat
      if (lat > box.north) box.north = lat
      if (lng < box.west) box.west = lng
      if (lng > box.east) box.east = lng
    }
    // The picked office wears its name above the pin; when it sits at the
    // northern or either side end of the route that label needs room the bare
    // points do not ask for.
    const LABEL = 40
    const { centre, zoom: fitted } = fit([{ lat: box.south, lng: box.west }, { lat: box.north, lng: box.east }], size.w - 2 * LABEL, size.h - LABEL)
    const zoom = Math.min(fitted, 16)
    flyTo({ lat: yToLat(latToY(centre.lat, zoom) - LABEL / 2, zoom), lng: centre.lng, zoom })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size.w, size.h, picked?.id, routeKey, focusTick])

  /**
   * The route as an SVG path, in pixels at the current zoom measured from its
   * own first point. Built once per zoom, not per frame: panning only moves
   * the group it sits in. Points closer than two pixels to the one before are
   * skipped, which is most of them on a route across the island.
   */
  const routePath = useMemo(() => {
    if (!route?.coords.length || !view) return null
    const z = view.zoom
    const [lng0, lat0] = route.coords[0]!
    const ox = lngToX(lng0, z), oy = latToY(lat0, z)
    let d = 'M0,0'
    let px = 0, py = 0
    const last = route.coords.length - 1
    route.coords.forEach(([lng, lat], i) => {
      if (i === 0) return
      const x = lngToX(lng, z) - ox, y = latToY(lat, z) - oy
      if (i !== last && Math.abs(x - px) + Math.abs(y - py) < 2) return
      d += `L${x.toFixed(1)},${y.toFixed(1)}`
      px = x; py = y
    })
    return { d, lng: lng0, lat: lat0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, view?.zoom])

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
    land()
    setPressed(null)
    onReset?.()
    const { centre, zoom } = fit(all, size.w, size.h)
    setView({ ...centre, zoom })
  }

  const routeStart = routePath ? project(routePath.lat, routePath.lng) : null

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
          // A hand on the map takes over from a glide in progress.
          land()
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

        {/* The way there, under the pins. A white casing keeps it legible over
            roads, forest and sea alike; the straight-line stand-in is dotted
            so nobody reads it as a road. */}
        {routePath && routeStart ? (
          <svg aria-hidden="true" width={size.w} height={size.h} className="pointer-events-none absolute inset-0 z-[5] overflow-visible">
            <g transform={`translate(${routeStart.x.toFixed(1)},${routeStart.y.toFixed(1)})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={routePath.d} stroke="#fff" strokeWidth={route?.exact ? 8 : 6} opacity={0.9} />
              <path d={routePath.d} stroke="#0f1b2d" strokeWidth={route?.exact ? 4 : 3} strokeDasharray={route?.exact ? undefined : '1 9'} />
            </g>
          </svg>
        ) : null}

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
                  <span className="absolute size-8 animate-ping rounded-full bg-night-900/15" />
                  <span className="size-3.5 rounded-full border-2 border-white bg-night-900 shadow-[0_1px_4px_rgb(15_27_45/0.5)]" />
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
                  onClick={() => { if (!drag.current?.moved) { setPressed(on ? null : pt.id); onSelect?.(pt.id) } }}
                  aria-label={pt.name}
                  aria-pressed={on}
                  className={`absolute -translate-x-1/2 -translate-y-full ${on ? 'z-[25]' : 'z-20'}`}
                  style={{ left: p.x, top: p.y }}
                >
                  <span className={`grid size-8 place-items-center rounded-full border-2 border-white text-white shadow-[0_2px_8px_rgb(15_27_45/0.35)] transition-transform motion-reduce:transition-none ${on ? 'scale-125 bg-night-900 ring-4 ring-gold-300/70' : 'bg-green-600 hover:scale-110'}`}>
                    <Icon.pin className="size-4" />
                  </span>
                  <span aria-hidden="true" className={`mx-auto -mt-0.5 block size-2 rotate-45 border-b-2 border-r-2 border-white ${on ? 'bg-night-900' : 'bg-green-600'}`} />
                  {on ? (
                    <span className="absolute bottom-full left-1/2 mb-1.5 w-max max-w-[200px] -translate-x-1/2 truncate rounded-[var(--radius-tile)] bg-night-900 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-[var(--shadow-lift)]">
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
        <MapButton label={points.length > 1 ? 'Tampilkan semua kantor' : 'Kembali ke kantor ini'} onClick={reset}><Icon.compass className="size-4" /></MapButton>
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
