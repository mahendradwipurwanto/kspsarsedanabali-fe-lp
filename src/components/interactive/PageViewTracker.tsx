'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { track } from '@/lib/client'

function Tracker() {
  const pathname = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    track('page_view', {
      utm_source: params.get('utm_source') ?? undefined,
      utm_medium: params.get('utm_medium') ?? undefined,
      utm_campaign: params.get('utm_campaign') ?? undefined,
    })
  }, [pathname, params])

  return null
}

/**
 * First-party page-view beacon. Wrapped in Suspense because `useSearchParams`
 * would otherwise opt the whole tree out of static rendering.
 */
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
