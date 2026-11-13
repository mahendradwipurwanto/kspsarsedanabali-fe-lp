'use client'

/**
 * Last resort when the root layout itself cannot render — its menus, offices
 * and settings come from the API — and there is no earlier good copy to serve.
 * It replaces the whole document, so it carries its own html and styles.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f8f5', color: '#0f1b2d' }}>
        <main style={{ maxWidth: 520, margin: '18vh auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4e8b2c' }}>KSP Sari Sedana Bali</p>
          <h1 style={{ fontSize: 26, margin: '12px 0' }}>Halaman sedang tidak dapat dimuat</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5b6b82' }}>Sistem kami sedang sibuk. Coba muat ulang sebentar lagi.</p>
          <button type="button" onClick={reset} style={{ marginTop: 20, border: 0, borderRadius: 999, background: '#4e8b2c', color: '#fff', padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  )
}
