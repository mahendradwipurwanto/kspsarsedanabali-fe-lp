import type { MetadataRoute } from 'next'
import { SITE } from '@/contracts'
import { getSettings } from '@/lib/api'

/** Installed-app name and description follow the koperasi's own settings. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings()
  const site = (settings.site ?? {}) as Record<string, string>

  return {
    name: site.legalName || SITE.legalName,
    short_name: site.name || SITE.shortName,
    description: site.description || SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f1b2d',
    lang: 'id-ID',
    categories: ['finance', 'business'],
  }
}
