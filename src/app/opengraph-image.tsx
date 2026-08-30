import { ImageResponse } from 'next/og'

export const alt = 'KSP Sari Sedana Bali — Koperasi Simpan Pinjam di Karangasem'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Default social card, composed at the edge. The old site had no OG image at all,
 * so links shared on WhatsApp — the main channel here — rendered as bare URLs.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #26451d 0%, #356620 55%, #438226 100%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: 18, background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
            }}
          >
            🌿
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#ffffff', fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>KSP Sari Sedana Bali</span>
            <span style={{ color: '#c5e2b0', fontSize: 20, letterSpacing: 3, textTransform: 'uppercase' }}>Untuk Kita</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ color: '#ffffff', fontSize: 62, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 900 }}>
            Koperasi Simpan Pinjam di Karangasem
          </span>
          <span style={{ color: '#c5e2b0', fontSize: 28, maxWidth: 820, lineHeight: 1.4 }}>
            Simpanan berjangka, simpanan harian, dan pinjaman modal usaha. Melayani sejak 2002.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 32, color: '#e1f0d6', fontSize: 22 }}>
          <span>Kantor Pusat Selat</span>
          <span>·</span>
          <span>Cabang Rendang</span>
          <span>·</span>
          <span>Cabang Karangasem</span>
        </div>
      </div>
    ),
    size,
  )
}
