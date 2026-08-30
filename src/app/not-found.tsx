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
    { label: 'Lokasi Kantor', href: '/lokasi', desc: 'Tiga kantor di Karangasem' },
    { label: 'Berita', href: '/berita', desc: 'Kabar terbaru dari koperasi' },
    { label: 'Kontak Kami', href: '/kontak', desc: 'Telepon, WhatsApp, dan alamat' },
  ]

  return (
    <Band>
      <Shell>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-6xl font-bold tracking-tight text-green-200">404</p>
          <h1 className="t-h1 mt-5 text-navy-800">Halaman yang Anda cari tidak ditemukan</h1>
          <p className="t-lead mt-5">
            Mungkin alamatnya salah ketik, atau halaman ini sudah dipindahkan saat website kami diperbarui.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Action href="/" size="lg">Kembali ke Beranda</Action>
            <Action href="/kontak" variant="outline" size="lg">Hubungi Kami</Action>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-slate-400">Mungkin Anda mencari</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <Card as="li" key={item.href} className="group p-4 transition-colors hover:border-green-300 hover:bg-green-50">
                <Link href={item.href} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-navy-800 group-hover:text-green-700">{item.label}</span>
                    <span className="block text-sm text-slate-500">{item.desc}</span>
                  </span>
                  <Icon.arrow className="size-4 shrink-0 text-slate-400 group-hover:text-green-700" />
                </Link>
              </Card>
            ))}
          </ul>
        </div>
      </Shell>
    </Band>
  )
}
