'use client'

import { useState } from 'react'
import { SIGEMAS, SIMAPAN, SIPURA, type SavingsTableSlug } from '@/contracts'
import type { Product } from '@/lib/api'
import { track } from '@/lib/client'
import { Card, Tile, Icon, Blank, Action, Heading } from '../ui'
import { SimulationCalculator } from './SimulationCalculator'
import { SavingsCalculator } from './SavingsCalculator'

type Tab = 'pinjaman' | 'simpanan'

const LOAN_METHODS = [
  { n: '01', title: 'Bunga flat', body: 'Bunga dihitung dari pokok pinjaman awal, tetap sepanjang masa angsuran. Angsuran bulanan sama besar setiap bulan.' },
  { n: '02', title: 'Anuitas', body: 'Angsuran bulanan tetap, tetapi porsi bunga mengecil dan porsi pokok membesar seiring waktu.' },
  { n: '03', title: 'Efektif menurun', body: 'Bunga dihitung dari sisa pokok, sehingga angsuran mengecil setiap bulan. Total bunga paling ringan.' },
]

/** Indonesian decimals: 0,35 rather than 0.35. */
const num = (n: number) => n.toLocaleString('id-ID')

/**
 * The explanations quote the same figures the calculators compute with, read
 * from the tables' own constants. Written out by hand they drifted the moment a
 * rate changed, and a wrong rate in a paragraph reads exactly as authoritative
 * as a right one.
 */
const SAVINGS_NOTES = [
  {
    n: '01',
    title: 'SIGEMAS',
    body: `Simpanan sekali setor ${SIGEMAS.tenors[0]}–${SIGEMAS.tenors[SIGEMAS.tenors.length - 1]} bulan. Mendapat bunga ${num(SIGEMAS.interestPercentPerYear)}% per tahun ditambah reward emas ${num(SIGEMAS.rewardPercentPerYear)}% per tahun, jadi ${num(SIGEMAS.interestPercentPerYear + SIGEMAS.rewardPercentPerYear)}% per tahun.`,
  },
  {
    n: '02',
    title: 'SIMAPAN',
    body: `Setoran rutin setiap bulan selama ${SIMAPAN.years[0]}–${SIMAPAN.years[SIMAPAN.years.length - 1]} tahun. Bunga ${num(SIMAPAN.monthlyRatePercent)}% per bulan dan berbunga lagi, sehingga hasilnya menumpuk.`,
  },
  {
    n: '03',
    title: 'SIPURA',
    body: `Setoran harian selama ${SIPURA.days} hari, satu putaran wuku. Bonus ${num(SIPURA.bonusMultiplier)} kali setoran harian dibayarkan saat jatuh tempo.`,
  },
]

/**
 * The simulator has two sides. Loans answer "berapa angsuran saya", savings
 * answer "berapa yang saya terima nanti", and each carries the explanation that
 * belongs to it rather than one shared paragraph that fits neither.
 */
export function SimulationTabs({
  loanProducts, savingsProducts, initialTab = 'pinjaman', initialPlan, initialProductId, initialAmount, initialTenor, disclaimer,
}: {
  loanProducts: Product[]
  savingsProducts: Product[]
  initialTab?: Tab
  initialPlan?: SavingsTableSlug
  initialProductId?: string
  initialAmount?: number
  initialTenor?: number
  disclaimer: string
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const notes = tab === 'pinjaman' ? LOAN_METHODS : SAVINGS_NOTES

  return (
    <div className="grid gap-10">
      <div>
        <div role="tablist" aria-label="Jenis simulasi" className="inline-flex rounded-[var(--radius-card)] border border-line bg-white p-1">
          {([['pinjaman', 'Angsuran pinjaman'], ['simpanan', 'Hasil simpanan']] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setTab(key); track('simulation_change', { tab: key }) }}
              className={`rounded-[7px] px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                tab === key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'pinjaman' ? (
            loanProducts.length ? (
              <SimulationCalculator
                products={loanProducts}
                initialProductId={initialProductId}
                initialAmount={initialAmount}
                initialTenor={initialTenor}
                disclaimer={disclaimer}
              />
            ) : (
              <Blank
                title="Simulasi pinjaman belum tersedia"
                body="Suku bunga terbaru sedang dikonfirmasi pengurus koperasi. Hubungi kantor terdekat dan petugas kami akan menghitungkan angsuran yang berlaku saat ini."
                action={<Action href="/kontak">Hubungi kami</Action>}
              />
            )
          ) : (
            <SavingsCalculator products={savingsProducts} initialPlan={initialPlan} />
          )}
        </div>
      </div>

      <div>
        <Heading
          label={tab === 'pinjaman' ? 'Metode bunga' : 'Cara kerja simpanan'}
          title={tab === 'pinjaman' ? 'Cara membaca hasil simulasi' : 'Tiga cara menabung, tiga cara menghitung'}
          lead={
            tab === 'pinjaman'
              ? 'Angsuran yang sama besarnya bisa dihitung dengan tiga cara. Metode yang dipakai selalu tertera di panel hasil.'
              : 'Setiap produk punya tabel resmi sendiri. Simulasi di atas memakai angka dari tabel itu, bukan perkiraan.'
          }
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {notes.map((item) => (
            <Card as="li" key={item.title} hover className="p-5 sm:p-6">
              <Tile tone="dark" size="sm"><span className="tnum text-[12px] font-bold text-gold-300">{item.n}</span></Tile>
              <h3 className="t-h3 mt-4">{item.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{item.body}</p>
            </Card>
          ))}
        </ul>

        <Card className="relative mt-4 overflow-hidden p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-gold-300" />
          <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-600">
            <Icon.info className="mt-0.5 size-4 shrink-0" />
            {tab === 'pinjaman'
              ? 'Hasil simulasi ini adalah perkiraan awal. Nominal angsuran resmi ditentukan setelah proses pengajuan, verifikasi berkas, dan survei oleh petugas koperasi.'
              : 'Angka simpanan mengikuti tabel resmi koperasi. Hasil akhir dapat berbeda bila setoran tidak rutin, ditarik sebelum jatuh tempo, atau ketentuan koperasi berubah.'}
          </p>
        </Card>
      </div>
    </div>
  )
}
