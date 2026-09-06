import { DEFAULT_APPS, type AppSettings } from '@/contracts'

/** The `apps` settings group merged over its defaults, so a half-filled form never blanks the section. */
export const appSettings = (settings: Record<string, unknown>): AppSettings => ({
  ...DEFAULT_APPS,
  ...((settings.apps && typeof settings.apps === 'object' ? settings.apps : {}) as Partial<AppSettings>),
})

export type Platform = 'ios' | 'android' | 'other'

/** Which store a visitor's phone belongs to. Desktops and unknown devices get the page. */
export function platformOf(userAgent: string): Platform {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  if (/android/i.test(userAgent)) return 'android'
  return 'other'
}

/**
 * Crawlers and link-preview fetchers are never redirected: Googlebot's
 * smartphone agent would otherwise index the Play Store instead of this page,
 * and WhatsApp would show the store's card in place of the koperasi's.
 */
export const isCrawler = (userAgent: string): boolean =>
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|lighthouse|headless/i.test(userAgent)

export function storeFor(platform: Platform, apps: AppSettings): string {
  if (platform === 'ios') return apps.appStoreUrl.trim()
  if (platform === 'android') return apps.playStoreUrl.trim()
  return ''
}
