'use client'

import { useState } from 'react'
import { simulationRate } from '@/contracts'
import type { Simulation } from '@/lib/api'
import { track } from '@/lib/client'
import { Card, Tile, Icon, Blank, Action, Heading } from '../ui'
import { SimulationCalculator } from './SimulationCalculator'
import { SavingsCalculator } from './SavingsCalculator'

type Tab = 'pinjaman' | 'simpanan'

/** How a bunga menurun schedule reads, column by column: every loan the koperasi offers works this way. */
const LOAN_METHODS = [
  { n: '01', title: 'Pokok tetap', body: 'Plafon dibagi rata sepanjang jangka waktu. Porsi pokok setiap bulan sama besarnya.' },
  { n: '02', title: 'Bunga dari sisa pinjaman', body: 'Bunga dihitung dari saldo yang belum dibayar, sehingga makin kecil setiap bulan.' },
  { n: '03', title: 'Angsuran makin ringan', body: 'Pokok ditambah bunga: angsuran pertama paling besar, lalu turun setiap bulan sampai lunas.' },
]

/** Indonesian decimals: 0,35 rather than 0.35. */
const num = (n: number) => n.toLocaleString('id-ID')

/**
 * How each savings calculator works, written from the same figures it computes
 * with. Written out by hand they drifted the moment a rate changed, and a wrong
 * rate in a paragraph reads exactly as authoritative as a right one.
 */
function savingsNote(sim: Simulation): string {
  switch (sim.kind) {
    case 'term_deposit': {
      const range = sim.tenors.length > 1 ? `${sim.tenors[0]}–${sim.tenors[sim.tenors.length - 1]}` : `${sim.tenors[0] ?? 12}`
      const rate = simulationRate(sim) ?? 0
      const reward = sim.rewardPercent ?? 0
      return reward
        ? `Simpanan sekali setor ${range} bulan. Mendapat bunga ${num(rate)}% per tahun ditambah reward ${num(reward)}% per tahun, jadi ${num(rate + reward)}% per tahun.`
        : `Simpanan sekali setor ${range} bulan dengan bunga ${num(rate)}% per tahun.`
    }
    case 'monthly_deposit': {
      const years = sim.tenors.map((m) => m / 12)
      const range = years.length > 1 ? `${num(years[0]!)}–${num(years[years.length - 1]!)}` : num(years[0] ?? 1)
      return `Setoran rutin setiap bulan selama ${range} tahun. Bunga ${num(simulationRate(sim) ?? 0)}% per bulan dan berbunga lagi, sehingga hasilnya menumpuk.`
    }
    case 'daily_deposit':
      return `Setoran harian selama ${sim.termDays ?? 210} hari. Bonus ${num(sim.bonusMultiplier ?? 0)} kali setoran harian dibayarkan saat jatuh tempo.`
    default:
      return ''
  }
}

/**
 * The simulator has two sides. Loans answer "berapa angsuran saya", savings
 * answer "berapa yang saya terima nanti", and each carries the explanation that
 * belongs to it rather than one shared paragraph that fits neither.
 */
export function SimulationTabs({
  loans, savings, initialTab = 'pinjaman', initialSimulationId, initialAmount, initialTenor, disclaimer,
}: {
  loans: Simulation[]
  savings: Simulation[]
  initialTab?: Tab
  /** A simulation on either side, opened from a link that named its product. */
  initialSimulationId?: string
  initialAmount?: number
  initialTenor?: number
  disclaimer: string
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const notes = tab === 'pinjaman'
    ? LOAN_METHODS
    : savings.map((x, i) => ({ n: String(i + 1).padStart(2, '0'), title: x.name, body: savingsNote(x) }))
  const loanStart = loans.some((x) => x.id === initialSimulationId) ? initialSimulationId : undefined
  const savingsStart = savings.some((x) => x.id === initialSimulationId) ? initialSimulationId : undefined

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
                tab === key ? 'bg-night-900 text-white' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'pinjaman' ? (
            loans.length ? (
              <SimulationCalculator
                simulations={loans}
                initialSimulationId={loanStart}
                initialAmount={loanStart ? initialAmount : undefined}
                initialTenor={loanStart ? initialTenor : undefined}
                disclaimer={disclaimer}
              />
            ) : (
              <Blank
                title="Simulasi pinjaman belum tersedia"
                body="Suku bunga terbaru sedang dikonfirmasi pengurus koperasi. Hubungi kantor terdekat dan petugas kami akan menghitungkan angsuran yang berlaku saat ini."
                action={<Action href="/kontak">Hubungi kami</Action>}
              />
            )
          ) : savings.length ? (
            <SavingsCalculator
              simulations={savings}
              initialSimulationId={savingsStart}
              initialAmount={savingsStart ? initialAmount : undefined}
              initialTenor={savingsStart ? initialTenor : undefined}
            />
          ) : (
            <Blank
              title="Simulasi simpanan belum tersedia"
              body="Hubungi kantor terdekat dan petugas kami akan menghitungkan hasil simpanan yang berlaku saat ini."
              action={<Action href="/kontak">Hubungi kami</Action>}
            />
          )}
        </div>
      </div>

      <div>
        <Heading
          label={tab === 'pinjaman' ? 'Bunga menurun' : 'Cara kerja simpanan'}
          title={tab === 'pinjaman' ? 'Cara membaca hasil simulasi' : 'Cara menghitung setiap simpanan'}
          lead={
            tab === 'pinjaman'
              ? 'Semua pinjaman memakai bunga menurun, seperti tabel angsuran koperasi. Yang membedakan antarproduk hanya besar suku bunganya.'
              : 'Setiap produk punya tabel resmi sendiri. Simulasi di atas memakai angka dari tabel itu, bukan perkiraan.'
          }
        />
        {notes.length ? <ul className="grid gap-4 md:grid-cols-3">
          {notes.map((item) => (
            <Card as="li" key={item.title} hover className="p-5 sm:p-6">
              <Tile tone="dark" size="sm"><span className="tnum text-[12px] font-bold text-gold-300">{item.n}</span></Tile>
              <h3 className="t-h3 mt-4">{item.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{item.body}</p>
            </Card>
          ))}
        </ul> : null}

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
