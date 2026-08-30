import type { MetadataRoute } from 'next'
import { SITE } from '@mahendradwipurwanto/ksp-contracts'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.legalName,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#438226',
    lang: 'id-ID',
    categories: ['finance', 'business'],
  }
}
