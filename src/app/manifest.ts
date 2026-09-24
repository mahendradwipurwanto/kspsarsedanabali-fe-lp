import type { MetadataRoute } from 'next'
import { SITE, themeColors } from '@/contracts'
import { getSettings } from '@/lib/api'

/** Installed-app name and description follow the koperasi's own settings. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings()
  const site = (settings.site ?? {}) as Record<string, string>
  const colors = themeColors((settings.brand as { colors?: Record<string, unknown> } | undefined)?.colors)

  return {
    name: site.legalName || SITE.legalName,
    short_name: site.name || SITE.shortName,
    description: site.description || SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: colors.surface,
    lang: 'id-ID',
    categories: ['finance', 'business'],
  }
}
