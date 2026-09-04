import Image from 'next/image'
import { mediaSrc } from '@/contracts'

/**
 * Image wrapper with a deterministic placeholder.
 *
 * The bucket has no public-read policy yet (PROJECT-PLAN.md Blocker 4), so the
 * API hands back `/api/media/...` proxy paths. Once the policy lands and
 * STORAGE_PUBLIC_URL is set, the same call starts returning CDN URLs and
 * `next/image` optimises them directly — no change needed here.
 *
 * Every image sits in a ratio-locked box, so the layout never shifts. CLS was
 * one of the speed findings in the audit.
 */
export function Media({
  src,
  alt,
  className = '',
  ratio = '16/9',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  rounded = true,
  fallbackLabel,
}: {
  src?: string | null
  alt: string
  className?: string
  ratio?: string
  priority?: boolean
  sizes?: string
  rounded?: boolean
  /** Shown inside the placeholder while the real artwork has not been uploaded. */
  fallbackLabel?: string
}) {
  const box = `relative overflow-hidden bg-paper ${rounded ? 'rounded-[var(--radius-tile)]' : ''} ${className}`
  // Image fields store object keys; resolve to the proxy path or the public URL.
  const resolved = mediaSrc(src, { publicBase: process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL })

  if (!resolved) {
    return (
      <div className={box} style={{ aspectRatio: ratio }}>
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-green-100 via-green-50 to-white p-5 text-center">
          <span>
            <svg viewBox="0 0 34 60" className="mx-auto h-9 w-auto opacity-70" fill="none" aria-hidden="true">
              <path d="M30 2C30 18 18 24 4 30c0-16 12-22 26-28Z" fill="#7cba57" />
              <path d="M4 58c0-16 12-22 26-28 0 16-12 22-26 28Z" fill="#dfae3c" />
            </svg>
            {fallbackLabel ? (
              <span className="mt-3 block text-[13px] font-bold leading-snug text-green-700/80">{fallbackLabel}</span>
            ) : null}
          </span>
        </div>
      </div>
    )
  }

  const isProxied = resolved.startsWith('/api/media/')
  return (
    <div className={box} style={{ aspectRatio: ratio }}>
      {isProxied ? (
        // Proxy route streams from a signed URL; Next cannot optimise it, so it
        // is served as-is with lazy loading.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={alt} className="absolute inset-0 size-full object-cover" loading={priority ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        <Image src={resolved} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      )}
    </div>
  )
}
