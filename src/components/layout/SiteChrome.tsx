'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Paths drawn without the website around them: the "hanya formulir" link of a
 * form (/f/<alamat>), which a member opens from WhatsApp and should see as the
 * form alone, the way a Google Form link looks.
 */
export const isBarePath = (path: string | null) => !!path && /^\/f\/[^/]+\/?$/.test(path)

/**
 * The header, footer and bottom bar, left out on a bare path.
 *
 * Decided here from the address rather than in the root layout from the
 * request: reading the request there would make every page of the site
 * render per visit and lose its cache, for the sake of one kind of page.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return isBarePath(usePathname()) ? null : <>{children}</>
}
