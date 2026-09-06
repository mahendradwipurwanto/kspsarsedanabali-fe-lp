'use client'

import { useEffect } from 'react'

/**
 * Try the installed app first, then the store.
 *
 * A phone that has the app answers the deep link by leaving the browser; the
 * tab goes hidden and the fallback is cancelled. A phone without it stays on
 * the page, and after a moment is sent to its store instead. This is the
 * client half of the smart link: the server already chose the store.
 */
export function DeepLinkOpener({ deepLink, fallback }: { deepLink: string; fallback: string }) {
  useEffect(() => {
    const timer = setTimeout(() => { if (!document.hidden) window.location.replace(fallback) }, 1500)
    const onHide = () => { if (document.hidden) clearTimeout(timer) }
    document.addEventListener('visibilitychange', onHide)
    window.location.href = deepLink
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onHide) }
  }, [deepLink, fallback])
  return null
}
