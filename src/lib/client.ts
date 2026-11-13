'use client'

import { secureGet, secureSet } from './secure-storage'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

export async function apiPost<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string; fields?: Record<string, string> }> {
  try {
    const res = await fetch(`${API_BASE}/v1${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as {
      data?: T
      error?: { message?: string; details?: { field: string; message: string }[] }
    }
    if (!res.ok) {
      const fields = Array.isArray(json.error?.details)
        ? Object.fromEntries(json.error!.details!.map((d) => [d.field, d.message]))
        : undefined
      return { ok: false, message: json.error?.message ?? 'Terjadi kesalahan. Silakan coba lagi.', fields }
    }
    return { ok: true, data: (json.data ?? json) as T }
  } catch {
    return { ok: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' }
  }
}

/**
 * Random per-tab id. No cookie, so no consent banner is required for it, and
 * it sits in sessionStorage as ciphertext like everything the browser keeps.
 * The first call in a tab creates it in memory at once and seals it in the
 * background; later tabs (and reloads) read the sealed copy back.
 */
const SID_KEY = 'ksp_sid'
let sid: string | null = null
let sidReady: Promise<string> | null = null

export function sessionId(): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('')
  sidReady ??= (async () => {
    const stored = await secureGet<string>(SID_KEY, 'session')
    if (stored) return (sid = stored)
    sid ??= crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    await secureSet(SID_KEY, sid, 'session')
    return sid
  })()
  return sidReady
}

/** First-party event beacon — this is what lets the CMS join traffic to leads. */
export function track(name: string, meta?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  const referrer = document.referrer || ''
  void sessionId().then((id) => {
    const payload = JSON.stringify({ name, path, sessionId: id, referrer, meta })
    const url = `${API_BASE}/v1/track/events`
    // sendBeacon survives the page unloading; fetch is the fallback.
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
    else void fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true })
  })

  // Mirror into GA4 when it is present, so both reports agree.
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag === 'function' && name !== 'page_view') w.gtag('event', name, meta ?? {})
}
