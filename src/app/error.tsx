'use client'

import { useEffect } from 'react'
import { Band, Shell, Blank, Action } from '@/components/ui'

/**
 * Shown only when a page has never rendered and the API is failing right now.
 * A page that rendered before keeps serving its last good copy instead; see
 * apiGet() in lib/api.ts.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <Band>
      <Shell>
        <Blank
          title="Halaman sedang tidak dapat dimuat"
          body="Sistem kami sedang sibuk. Coba muat ulang sebentar lagi, atau hubungi kantor terdekat."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={reset} className="rounded-full bg-green-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-green-700">
                Muat ulang
              </button>
              <Action href="/kontak" variant="outline">Hubungi kami</Action>
            </div>
          }
        />
      </Shell>
    </Band>
  )
}
