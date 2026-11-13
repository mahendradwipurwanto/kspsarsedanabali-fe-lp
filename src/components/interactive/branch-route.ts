'use client'

import { useCallback, useEffect, useState } from 'react'
import { distanceKm } from '@/contracts'
import { track } from '@/lib/client'
import type { MapRoute } from './BranchMap'

/*
 * What the office list and an office's own page share: where the reader is,
 * and the road from there to an office.
 */

export interface LatLng { lat: number; lng: number }

/** The way from the reader to an office: by road when the router answered, as the crow flies when it did not. */
export interface Route extends MapRoute { km: number; minutes: number | null }

export type GeoState = 'idle' | 'asking' | 'denied' | 'unsupported'

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`)
export const fmtMinutes = (m: number) => {
  if (m < 60) return `${Math.max(1, m)} menit`
  const h = Math.floor(m / 60), rest = m % 60
  return rest ? `${h} jam ${rest} menit` : `${h} jam`
}

/* ── The reader's position ───────────────────────────────────────────────── */

/**
 * Kept for the browser tab only, so a position offered on the list is still
 * there on an office's page and nobody is asked twice. It never leaves the
 * browser from here; a refusal is remembered the same way, so a page that asks
 * on arrival asks once.
 */
const ORIGIN_KEY = 'ksp.origin'
const DECLINED_KEY = 'ksp.origin.declined'

const recall = (key: string) => { try { return sessionStorage.getItem(key) } catch { return null } }
const remember = (key: string, value: string | null) => {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value) } catch { /* private mode: asked again next page */ }
}

function recalledOrigin(): LatLng | null {
  try {
    const o = JSON.parse(recall(ORIGIN_KEY) ?? 'null') as LatLng | null
    return o && Number.isFinite(o.lat) && Number.isFinite(o.lng) ? o : null
  } catch { return null }
}

/**
 * Where the reader is, once they have offered it.
 *
 * `ask()` raises the browser's own permission question. With `askOnArrival`
 * the page asks by itself when it opens — once: a reader who said no is left
 * with a button instead of the same question on every office they look at.
 */
export function useVisitorLocation({ askOnArrival = false }: { askOnArrival?: boolean } = {}) {
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [state, setState] = useState<GeoState>('idle')

  const ask = useCallback(() => {
    if (!('geolocation' in navigator)) { setState('unsupported'); return }
    setState('asking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setOrigin(here)
        setState('idle')
        remember(ORIGIN_KEY, JSON.stringify(here))
        remember(DECLINED_KEY, null)
        track('branch_locate', { granted: true })
      },
      // Denial is a normal outcome, not an error to apologise for.
      () => { setState('denied'); remember(DECLINED_KEY, '1'); track('branch_locate', { granted: false }) },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    )
  }, [])

  useEffect(() => {
    const kept = recalledOrigin()
    if (kept) { setOrigin(kept); return }
    if (askOnArrival && !recall(DECLINED_KEY)) ask()
  }, [ask, askOnArrival])

  return { origin, state, ask }
}

/* ── The road there ──────────────────────────────────────────────────────── */

/**
 * OSRM's public router. It needs no key, which is why it is used; it is also a
 * shared demonstration server, so it is asked once per office and never in a
 * loop, and the page works without it.
 */
const ROUTER = 'https://router.project-osrm.org/route/v1/driving'
const ROUTE_TIMEOUT_MS = 8000

/** Routes already fetched, for as long as the tab stays on the site: the list and an office's page share them. */
const kept = new Map<string, Route>()

export interface RouteState { id: string; loading: boolean; data: Route | null }

/**
 * The road from the reader to one office.
 *
 * Asked for once per office and kept. A newer choice cancels the request
 * before it, and one that takes too long is given up on: either way the map
 * falls back to a dotted straight line and the plain distance, rather than an
 * error about a map service the visitor never asked for.
 */
export function useRoute(origin: LatLng | null, target: ({ id: string } & LatLng) | null | undefined): RouteState | null {
  const [route, setRoute] = useState<RouteState | null>(null)
  const id = target?.id, targetLat = target?.lat, targetLng = target?.lng
  const originLat = origin?.lat, originLng = origin?.lng

  useEffect(() => {
    if (!id || originLat === undefined || originLng === undefined || targetLat === undefined || targetLng === undefined) { setRoute(null); return }
    // Four decimals is about ten metres: plenty to route from, and no more of
    // the visitor's position than the router needs.
    const from = { lat: Number(originLat.toFixed(4)), lng: Number(originLng.toFixed(4)) }
    const cacheKey = `${id}:${from.lat},${from.lng}`
    const hit = kept.get(cacheKey)
    if (hit) { setRoute({ id, loading: false, data: hit }); return }

    setRoute({ id, loading: true, data: null })
    let cancelled = false
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ROUTE_TIMEOUT_MS)
    fetch(`${ROUTER}/${from.lng},${from.lat};${targetLng},${targetLat}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: { code?: string; routes?: { distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }[] }) => {
        const best = json.routes?.[0]
        const coords = best?.geometry?.coordinates
        if (json.code !== 'Ok' || !best || !coords?.length) throw new Error('no route')
        const data: Route = { coords, exact: true, km: best.distance / 1000, minutes: Math.round(best.duration / 60) }
        kept.set(cacheKey, data)
        if (!cancelled) setRoute({ id, loading: false, data })
      })
      .catch(() => {
        if (cancelled) return
        setRoute({
          id,
          loading: false,
          data: {
            coords: [[originLng, originLat], [targetLng, targetLat]], exact: false,
            km: distanceKm({ lat: originLat, lng: originLng }, { lat: targetLat, lng: targetLng }), minutes: null,
          },
        })
      })
      .finally(() => clearTimeout(timer))
    return () => { cancelled = true; clearTimeout(timer); ctrl.abort() }
  }, [id, originLat, originLng, targetLat, targetLng])

  return route && route.id === id ? route : null
}
