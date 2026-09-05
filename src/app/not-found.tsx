import Link from 'next/link'
import type { Metadata } from 'next'
import { Shell, Band, Action, Icon, Card } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan',
  description: 'Halaman yang Anda cari tidak tersedia di website KSP Sari Sedana Bali.',
  robots: { index: false, follow: true },
}

/**
 * A 404 that keeps people on the site. The old WordPress build returned a bare
 * theme 404 with no navigation, which sends visitors straight back to Google.
 */
export default function NotFound() {
  const suggestions = [
    { label: 'Produk Simpanan', href: '/produk/simpanan', desc: 'SIJAKOP, SIMAPAN, SIPURA, SIGEMAS' },
    { label: 'Produk Pinjaman', href: '/produk/pinjaman', desc: 'Bunga Murah, Mikro, Pensiunan, 1 Pohon' },
    { label: 'Simulasi Angsuran', href: '/simulasi', desc: 'Hitung perkiraan cicilan bulanan' },
    { label: 'Lokasi Kantor', href: '/lokasi', desc: 'Alamat dan jam layanan tiap kantor' },
    { label: 'Berita', href: '/berita', desc: 'Kabar terbaru dari koperasi' },
    { label: 'Kontak Kami', href: '/kontak', desc: 'Telepon, WhatsApp, dan alamat' },
  ]

  return (
    <Band>
      <Shell>
        <div className="mx-auto max-w-2xl text-center">
          <p className="figure text-[4rem] text-ink-200">404</p>
          <h1 className="t-h1 mt-5 text-ink-900">Halaman yang Anda cari tidak ditemukan</h1>
          <p className="t-lead mt-5">
            Mungkin alamatnya salah ketik, atau halaman ini sudah dipindahkan saat website kami diperbarui.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Action href="/" size="lg">Kembali ke beranda</Action>
            <Action href="/kontak" variant="outline" size="lg">Hubungi kami</Action>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="t-label mb-4 text-center">Mungkin Anda mencari</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <Card as="li" key={item.href} hover className="group p-4">
                <Link href={item.href} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-ink-900 group-hover:text-green-700">{item.label}</span>
                    <span className="block text-sm text-ink-500">{item.desc}</span>
                  </span>
                  <Icon.arrow className="size-4 shrink-0 text-ink-400 group-hover:text-green-700" />
                </Link>
              </Card>
            ))}
          </ul>
        </div>
      </Shell>
    </Band>
  )
}
