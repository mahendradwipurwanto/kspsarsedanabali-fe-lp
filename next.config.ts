import type { NextConfig } from 'next'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pin Turbopack's workspace root to whichever directory actually holds the
 * lockfile.
 *
 * This app has its own `.git`, so Turbopack treats the app directory as the
 * root — but during monorepo development `next` is hoisted to the parent, one
 * level above that boundary, and the build fails with "Could not find the
 * Next.js package". Walking up to the lockfile resolves to the monorepo root
 * here and to the app directory once the repo is checked out on its own, which
 * is how it is built on Vercel.
 */
const here = dirname(fileURLToPath(import.meta.url))
function lockfileRoot(from: string): string {
  let dir = from
  for (;;) {
    if (existsSync(join(dir, 'package-lock.json'))) return dir
    const up = dirname(dir)
    if (up === dir) return from
    dir = up
  }
}

const storageHost = process.env.NEXT_PUBLIC_STORAGE_HOST ?? 'kencana.basic.box.cloudeka.id'

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: lockfileRoot(here) },
  poweredByHeader: false,

  // Contracts is consumed as a built workspace package; transpiling keeps source
  // maps useful and avoids ESM/CJS interop surprises in the App Router.
  transpilePackages: ['@mahendradwipurwanto/ksp-contracts'],

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
