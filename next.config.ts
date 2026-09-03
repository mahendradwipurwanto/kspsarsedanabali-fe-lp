import type { NextConfig } from 'next'
import { createRequire } from 'node:module'
import { dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pin Turbopack's workspace root to the directory that actually owns the
 * node_modules `next` resolves from.
 *
 * This app has its own `.git` and its own lockfile, so Turbopack would otherwise
 * treat the app directory as the root. That is right on Vercel, where the repo
 * is checked out alone and installs its own dependencies — but wrong during
 * monorepo development, where npm hoists `next` a level above and the build
 * fails with "Could not find the Next.js package".
 *
 * Resolving `next` and walking back to its node_modules parent gets both cases
 * right without guessing: it returns the monorepo root here and the app
 * directory once the repo stands alone. Earlier versions keyed off the nearest
 * lockfile, which broke the moment a per-repo lockfile was committed.
 */
const here = dirname(fileURLToPath(import.meta.url))
const require_ = createRequire(import.meta.url)

function nextPackageRoot(fallback: string): string {
  try {
    const resolved = require_.resolve('next/package.json')
    const marker = `${sep}node_modules${sep}`
    const at = resolved.lastIndexOf(marker)
    return at === -1 ? fallback : resolved.slice(0, at)
  } catch {
    return fallback
  }
}

const storageHost = process.env.NEXT_PUBLIC_STORAGE_HOST ?? 'kencana.basic.box.cloudeka.id'

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: nextPackageRoot(here) },
  poweredByHeader: false,
  // Next 16 otherwise writes AGENTS.md / CLAUDE.md into the repo on first dev run.
  agentRules: false,

  images: {
    // AVIF first — the audit flagged mobile weight as the main speed problem.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: storageHost }],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1600, 1920],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
        ],
      },
    ]
  },

  async redirects() {
    // Static, always-true redirects. Everything migrated from WordPress lives in
    // the `redirects` table and is resolved by middleware, so the koperasi can add
    // more from the CMS without a deploy.
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/index.php', destination: '/', permanent: true },
      { source: '/produk-simpanan/:slug', destination: '/produk/simpanan/:slug', permanent: true },
      { source: '/produk-pinjaman/:slug', destination: '/produk/pinjaman/:slug', permanent: true },
    ]
  },
}

export default config
