'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  SIGEMAS, SIMAPAN, SIPURA, calculateSigemas, calculateSimapan, calculateSipura,
  formatRupiah, formatRupiahShort, type SavingsTableSlug,
} from '@/contracts'
import type { Product } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { Slider, Segments } from '../ui/form'

/** Indonesian decimals: 0,35 rather than 0.35. */
const num = (n: number) => n.toLocaleString('id-ID')

const PLANS: { slug: SavingsTableSlug; name: string; tagline: string }[] = [
  { slug: 'sigemas', name: 'SIGEMAS', tagline: 'Simpanan Generasi Emas' },
  { slug: 'simapan', name: 'SIMAPAN', tagline: 'Simpanan Masa Depan' },
  { slug: 'sipura', name: 'SIPURA', tagline: 'Simpanan Hari Raya' },
]

/**
 * Savings side of the simulator, driven by the koperasi's own printed tables:
 * SIGEMAS from the brochure, SIMAPAN and SIPURA from the signed spreadsheet.
 *
 * Every figure is reproduced from those tables rather than approximated, and
 * each plan shows its table underneath with the chosen row marked, so a member
 * can hold the printed sheet next to the screen and read the same number.
 */
export function SavingsCalculator({
  products, initialPlan = 'sigemas',
}: {
  products: Product[]
  initialPlan?: SavingsTableSlug
}) {
  const [plan, setPlan] = useState<SavingsTableSlug>(initialPlan)

  const [gemasAmount, setGemasAmount] = useState(100_000_000)
  const [gemasMonths, setGemasMonths] = useState<number>(12)
  const [simapanDeposit, setSimapanDeposit] = useState(500_000)
  const [simapanYears, setSimapanYears] = useState(5)
  const [sipuraDaily, setSipuraDaily] = useState(20_000)

  const product = products.find((p) => p.slug === plan)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {PLANS.map((p) => {
          const active = p.slug === plan
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => { setPlan(p.slug); track('simulation_change', { plan: p.slug }) }}
              aria-pressed={active}
              className={`rounded-[var(--radius-card)] border p-4 text-left transition-colors duration-200 ${
                active ? 'border-ink-900 bg-ink-900' : 'border-line bg-white hover:border-ink-900'
              }`}
            >
              <span className={`block text-[15px] font-bold ${active ? 'text-white' : 'text-ink-900'}`}>{p.name}</span>
              <span className={`mt-0.5 block text-[12.5px] ${active ? 'text-white/60' : 'text-ink-500'}`}>{p.tagline}</span>
            </button>
          )
        })}
      </div>

      {plan === 'sigemas' ? (
        <Sigemas amount={gemasAmount} months={gemasMonths} onAmount={setGemasAmount} onMonths={setGemasMonths} product={product} />
      ) : plan === 'simapan' ? (
        <Simapan deposit={simapanDeposit} years={simapanYears} onDeposit={setSimapanDeposit} onYears={setSimapanYears} product={product} />
      ) : (
        <Sipura daily={sipuraDaily} onDaily={setSipuraDaily} product={product} />
      )}
    </div>
  )
}

/* ─────────────────────────── shared presentation ────────────────────────── */

function Panel({ children }: { children: ReactNode }) {
  // Spread the input groups down the panel: the result beside it is taller, and
  // a stretched panel with everything bunched at the top reads as unfinished.
  return <div className="surface p-6 sm:p-8"><div className="grid h-full content-between gap-8">{children}</div></div>
}

function Amount({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <span className="block text-[13px] font-semibold text-ink-700">{label}</span>
      <output className="figure mt-1.5 block text-[clamp(1.8rem,1.35rem+1.7vw,2.4rem)] text-ink-900">{formatRupiah(value)}</output>
      {hint ? <p className="mt-1 text-[12px] text-ink-400">{hint}</p> : null}
    </div>
  )
}

function Result({
  headline, headlineLabel, rows, total, totalLabel, note, product, footer,
}: {
  headline: number
  headlineLabel: string
  rows: [string, string][]
  total: number
  totalLabel: string
  note: string
  product?: Product
  footer?: string
}) {
  return (
    <div className="surface-dark relative overflow-hidden p-6 text-white sm:p-8">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
      <span aria-hidden="true" className="grid-dark pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative flex items-center justify-between gap-4">
        <p className="text-[13px] font-medium text-white/60">Hasil simpanan</p>
        <span className="text-[12px] font-medium text-white/45">tabel resmi koperasi</span>
      </div>

      <p className="relative mt-7 text-[13px] text-white/60">{headlineLabel}</p>
      <p className="figure relative mt-1.5 text-[clamp(2rem,1.4rem+2.4vw,2.9rem)] text-gold-300">{formatRupiah(headline)}</p>

      <dl className="tnum relative mt-8 border-t border-white/15 text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/10 py-3">
            <dt className="text-white/55">{k}</dt>
            <dd className="font-semibold text-white">{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-double border-white/25 py-4">
          <dt className="text-[13px] font-semibold text-white/80">{totalLabel}</dt>
          <dd className="figure text-[19px] text-white">{formatRupiah(total)}</dd>
        </div>
      </dl>

      <p className="relative mt-4 flex items-start gap-2 rounded-[var(--radius-input)] bg-white/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/70 ring-1 ring-inset ring-white/10">
        <Icon.info className="mt-0.5 size-4 shrink-0 text-gold-300" />
        <span>{note}</span>
      </p>

      <div className="relative mt-7 grid gap-2.5">
        <Action href={product ? `/kontak?produk=${product.slug}` : '/kontak'} variant="light" size="lg" full>
          Buka simpanan
          <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
        </Action>
        {product ? (
          <Action href={`/produk/simpanan/${product.slug}`} variant="ghostLight" full>Lihat syarat dan ketentuan</Action>
        ) : null}
      </div>

      {footer ? <p className="relative mt-6 border-t border-white/10 pt-5 text-[12px] leading-relaxed text-white/45">{footer}</p> : null}
    </div>
  )
}

function Table({
  caption, head, rows, activeIndex,
}: {
  caption: string
  head: string[]
  rows: string[][]
  activeIndex: number
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-bold text-ink-900">{caption}</h3>
        <p className="text-[12px] text-ink-400">Sumber: tabel resmi KSP Sari Sedana Bali</p>
      </div>
      <div className="rail overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-[12.5px] font-semibold text-ink-500">
              {head.map((h, i) => <th key={h} scope="col" className={`px-4 py-2.5 ${i === 0 ? '' : 'text-right'}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="tnum divide-y divide-line">
            {rows.map((row, r) => {
              const active = r === activeIndex
              return (
                <tr key={row[0]} className={active ? 'bg-green-50' : ''}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-4 py-2.5 ${c === 0 ? 'font-semibold' : 'text-right'} ${
                        active ? 'text-green-800' : c === 0 ? 'text-ink-900' : 'text-ink-700'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────────────────────────── SIGEMAS ──────────────────────────────── */

function Sigemas({
  amount, months, onAmount, onMonths, product,
}: {
  amount: number; months: number
  onAmount: (v: number) => void; onMonths: (v: number) => void
  product?: Product
}) {
  const result = useMemo(() => calculateSigemas(amount, months), [amount, months])
  const rows = SIGEMAS.amounts.map((a) => {
    const r = calculateSigemas(a, months)
    return [formatRupiah(a), formatRupiah(r.interest), formatRupiah(r.reward), formatRupiah(r.total)]
  })

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <Amount label="Jumlah simpanan" value={amount} hint={`Kelipatan ${formatRupiahShort(SIGEMAS.step)}, sesuai tabel resmi.`} />
            <Slider
              min={SIGEMAS.minAmount}
              max={SIGEMAS.maxAmount}
              step={SIGEMAS.step}
              value={amount}
              onChange={(e) => onAmount(Number(e.target.value))}
              aria-label="Jumlah simpanan"
            />
            <p className="tnum flex justify-between text-[12px] text-ink-400">
              <span>{formatRupiahShort(SIGEMAS.minAmount)}</span>
              <span>{formatRupiahShort(SIGEMAS.maxAmount)}</span>
            </p>
          </div>

          <div>
            <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
            <Segments options={[...SIGEMAS.tenors]} value={months} suffix=" bln" ariaLabel="Jangka waktu simpanan" onChange={(v) => onMonths(v)} />
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Bunga</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(SIGEMAS.interestPercentPerYear)}% per tahun</dd>
            </div>
            <div>
              <dt className="text-ink-400">Reward emas</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(SIGEMAS.rewardPercentPerYear)}% per tahun</dd>
            </div>
          </dl>
        </Panel>

        <Result
          headlineLabel={`Total imbal hasil ${months} bulan`}
          headline={result.total}
          rows={[
            ['Jumlah simpanan', formatRupiah(amount)],
            ['Nilai bunga', formatRupiah(result.interest)],
            ['Nilai reward emas', formatRupiah(result.reward)],
          ]}
          totalLabel="Diterima saat jatuh tempo"
          total={result.payout}
          note={`Bunga ${num(SIGEMAS.interestPercentPerYear)}% dan reward emas ${num(SIGEMAS.rewardPercentPerYear)}% per tahun, persis seperti tabel SIGEMAS yang diterbitkan koperasi.`}
          product={product}
          footer="Reward diberikan dalam bentuk emas atau nilai setaranya sesuai ketentuan yang berlaku saat pencairan."
        />
      </div>

      <Table
        caption={`Tabel SIGEMAS · jangka waktu ${months} bulan`}
        head={['Jumlah simpanan', 'Nilai bunga', 'Reward emas', 'Total']}
        rows={rows}
        activeIndex={SIGEMAS.amounts.indexOf(amount)}
      />
    </>
  )
}

/* ───────────────────────────────── SIMAPAN ──────────────────────────────── */

function Simapan({
  deposit, years, onDeposit, onYears, product,
}: {
  deposit: number; years: number
  onDeposit: (v: number) => void; onYears: (v: number) => void
  product?: Product
}) {
  const months = years * 12
  const result = useMemo(() => calculateSimapan(deposit, months), [deposit, months])
  const rows = SIMAPAN.deposits.map((d) => {
    const r = calculateSimapan(d, months)
    return [formatRupiah(d), formatRupiah(r.deposited), formatRupiah(r.value)]
  })

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <Amount label="Setoran per bulan" value={deposit} hint="Disetor rutin setiap bulan selama jangka waktu yang dipilih." />
            <Slider
              min={SIMAPAN.minDeposit}
              max={SIMAPAN.maxDeposit}
              step={50_000}
              value={deposit}
              onChange={(e) => onDeposit(Number(e.target.value))}
              aria-label="Setoran per bulan"
            />
            <p className="tnum flex justify-between text-[12px] text-ink-400">
              <span>{formatRupiahShort(SIMAPAN.minDeposit)}</span>
              <span>{formatRupiahShort(SIMAPAN.maxDeposit)}</span>
            </p>
          </div>

          <div>
            <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
            <Segments options={[...SIMAPAN.years]} value={years} suffix=" th" ariaLabel="Jangka waktu simpanan" onChange={(v) => onYears(v)} />
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Bunga</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(SIMAPAN.monthlyRatePercent)}% per bulan</dd>
            </div>
            <div>
              <dt className="text-ink-400">Jumlah setoran</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{months} kali</dd>
            </div>
          </dl>
        </Panel>

        <Result
          headlineLabel={`Nilai simpanan setelah ${years} tahun`}
          headline={result.value}
          rows={[
            ['Setoran per bulan', formatRupiah(deposit)],
            ['Jumlah disetor', formatRupiah(result.deposited)],
            ['Hasil bunga', formatRupiah(result.profit)],
          ]}
          totalLabel="Nilai simpanan akhir"
          total={result.value}
          note={`Bunga ${num(SIMAPAN.monthlyRatePercent)}% per bulan yang berbunga lagi setiap bulan, sama dengan tabel SIMAPAN koperasi.`}
          product={product}
          footer="Setoran yang terlambat atau tidak penuh membuat hasil akhir berbeda dari tabel."
        />
      </div>

      <Table
        caption={`Tabel SIMAPAN · ${years} tahun (${months} bulan)`}
        head={['Setoran per bulan', 'Jumlah disetor', 'Nilai simpanan akhir']}
        rows={rows}
        activeIndex={SIMAPAN.deposits.findIndex((d) => d === deposit)}
      />
    </>
  )
}

/* ────────────────────────────────── SIPURA ──────────────────────────────── */

function Sipura({ daily, onDaily, product }: { daily: number; onDaily: (v: number) => void; product?: Product }) {
  const result = useMemo(() => calculateSipura(daily), [daily])
  const rows = SIPURA.deposits.map((d) => {
    const r = calculateSipura(d)
    return [formatRupiah(d), formatRupiah(r.deposited), formatRupiah(r.received)]
  })

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <Amount label="Setoran per hari" value={daily} hint={`Disetor setiap hari selama ${SIPURA.days} hari, satu putaran wuku.`} />
            <Slider
              min={SIPURA.minDeposit}
              max={SIPURA.maxDeposit}
              step={5_000}
              value={daily}
              onChange={(e) => onDaily(Number(e.target.value))}
              aria-label="Setoran per hari"
            />
            <p className="tnum flex justify-between text-[12px] text-ink-400">
              <span>{formatRupiahShort(SIPURA.minDeposit)}</span>
              <span>{formatRupiahShort(SIPURA.maxDeposit)}</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Jangka waktu</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{SIPURA.days} hari</dd>
            </div>
            <div>
              <dt className="text-ink-400">Bonus</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(SIPURA.bonusMultiplier)}× setoran harian</dd>
            </div>
          </dl>
        </Panel>

        <Result
          headlineLabel={`Diterima setelah ${SIPURA.days} hari`}
          headline={result.received}
          rows={[
            ['Setoran per hari', formatRupiah(daily)],
            [`Jumlah disetor (${SIPURA.days}×)`, formatRupiah(result.deposited)],
            ['Bonus', formatRupiah(result.bonus)],
          ]}
          totalLabel="Diterima saat jatuh tempo"
          total={result.received}
          note={`Bonus dihitung ${num(SIPURA.bonusMultiplier)}× setoran harian dan dibulatkan ke bawah ke ribuan terdekat, persis seperti tabel SIPURA koperasi.`}
          product={product}
          footer="Simpanan jatuh tempo menjelang hari raya, mengikuti perhitungan 210 hari kalender Bali."
        />
      </div>

      <Table
        caption={`Tabel SIPURA · ${SIPURA.days} hari`}
        head={['Setoran per hari', 'Jumlah disetor', 'Diterima']}
        rows={rows}
        activeIndex={SIPURA.deposits.findIndex((d) => d === daily)}
      />
    </>
  )
}
