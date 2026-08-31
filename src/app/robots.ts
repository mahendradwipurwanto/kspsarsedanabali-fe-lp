import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Result pages carry personal answers and would be thin duplicates.
        // /pratinjau serves unpublished drafts by token — noindex is already set
        // on the route and by the API, this is the third layer.
        disallow: ['/profiling/hasil', '/pratinjau/', '/api/', '/_next/', '/*?utm_*'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
