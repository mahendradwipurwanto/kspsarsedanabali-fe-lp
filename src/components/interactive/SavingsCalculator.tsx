'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  calculateTermDeposit, calculateMonthlyDeposit, calculateDailyDeposit, cellAmount,
  formatRupiah, formatRupiahShort,
} from '@/contracts'
import type { Simulation } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { AmountInput, Segments } from '../ui/form'

/** Indonesian decimals: 0,35 rather than 0.35. */
const num = (n: number) => n.toLocaleString('id-ID')

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/**
 * Savings side of the simulator, one calculator per simulation filed in the
 * console. The kind picks the formula — a lump sum for a term, a monthly
 * deposit, a daily one — and the row supplies the figures, which for SIGEMAS,
 * SIMAPAN and SIPURA are the ones on the koperasi's printed tables.
 *
 * A simulation that lists table rows shows that table underneath with the
 * chosen row marked, so a member can hold the printed sheet next to the screen
 * and read the same number.
 */
export function SavingsCalculator({
  simulations, initialSimulationId, initialAmount, initialTenor,
}: {
  simulations: Simulation[]
  initialSimulationId?: string
  initialAmount?: number
  initialTenor?: number
}) {
  const [simulationId, setSimulationId] = useState(initialSimulationId ?? simulations[0]?.id ?? '')
  const sim = simulations.find((x) => x.id === simulationId) ?? simulations[0]

  // Each calculator keeps its own figures, so switching away and back does not
  // lose what the visitor had set.
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulations.map((x) => [x.id, startAmount(x, x.id === initialSimulationId ? initialAmount : undefined)])),
  )
  const [tenors, setTenors] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulations.map((x) => [x.id, startTenor(x, x.id === initialSimulationId ? initialTenor : undefined)])),
  )

  if (!sim) return null
  // Typing can run outside the range for a moment; the figures use the nearest allowed amount.
  const amount = clamp(amounts[sim.id] ?? startAmount(sim), sim.minAmount, sim.maxAmount)
  const months = tenors[sim.id] ?? startTenor(sim)
  const onAmount = (v: number) => setAmounts((a) => ({ ...a, [sim.id]: v }))
  const onMonths = (v: number) => setTenors((t) => ({ ...t, [sim.id]: v }))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {simulations.length > 1 ? (
        <div className={`grid gap-2.5 ${simulations.length % 3 === 0 || simulations.length > 4 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {simulations.map((x) => {
            const active = x.id === sim.id
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => { setSimulationId(x.id); track('simulation_change', { plan: x.product.slug }) }}
                aria-pressed={active}
                className={`rounded-[var(--radius-card)] border p-4 text-left transition-colors duration-200 ${
                  active ? 'border-night-900 bg-night-900' : 'border-line bg-white hover:border-ink-900'
                }`}
              >
                <span className={`block text-[15px] font-bold ${active ? 'text-white' : 'text-ink-900'}`}>{x.name}</span>
                {x.tagline || x.product.tagline ? (
                  <span className={`mt-0.5 block text-[12.5px] ${active ? 'text-white/60' : 'text-ink-500'}`}>{x.tagline || x.product.tagline}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {sim.kind === 'term_deposit' ? (
        <TermDeposit key={sim.id} sim={sim} amount={amount} months={months} onAmount={onAmount} onMonths={onMonths} />
      ) : sim.kind === 'monthly_deposit' ? (
        <MonthlyDeposit key={sim.id} sim={sim} deposit={amount} months={months} onDeposit={onAmount} onMonths={onMonths} />
      ) : (
        <DailyDeposit key={sim.id} sim={sim} daily={amount} onDaily={onAmount} />
      )}
    </div>
  )
}

function startAmount(sim: Simulation, wanted?: number) {
  return clamp(wanted ?? sim.defaultAmount ?? sim.minAmount, sim.minAmount, sim.maxAmount)
}

function startTenor(sim: Simulation, wanted?: number) {
  if (wanted && sim.tenors.includes(wanted)) return wanted
  return sim.tenors[0] ?? 12
}

const rateInfoOf = (sim: Simulation) => sim.rateInfo || 'tabel resmi koperasi'

/* ─────────────────────────── shared presentation ────────────────────────── */

function Panel({ children }: { children: ReactNode }) {
  // Spread the input groups down the panel: the result beside it is taller, and
  // a stretched panel with everything bunched at the top reads as unfinished.
  return <div className="surface p-6 sm:p-8"><div className="grid h-full grid-cols-[minmax(0,1fr)] content-between gap-8">{children}</div></div>
}

function Result({
  headline, headlineLabel, rows, total, totalLabel, note, product, footer, rateInfo,
}: {
  headline: number
  headlineLabel: string
  rows: [string, string][]
  total: number
  totalLabel: string
  note: string
  product: Simulation['product']
  footer?: string
  rateInfo: string
}) {
  return (
    <div className="surface-dark relative overflow-hidden p-6 text-white sm:p-8">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
      <span aria-hidden="true" className="grid-dark pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative flex items-center justify-between gap-4">
        <p className="text-[13px] font-medium text-white/60">Hasil simpanan</p>
        <span className="text-[12px] font-medium text-white/45">{rateInfo}</span>
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
        <Action href={`/kontak?produk=${product.slug}`} variant="light" size="lg" full>
          Buka simpanan
          <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
        </Action>
        <Action href={`/produk/${product.category}/${product.slug}`} variant="ghostLight" full>Lihat syarat dan ketentuan</Action>
      </div>

      {footer ? <p className="relative mt-6 border-t border-white/10 pt-5 text-[12px] leading-relaxed text-white/45">{footer}</p> : null}
    </div>
  )
}

export function Table({
  caption, source, head, rows, activeIndex, foot, scroll,
}: {
  caption: string
  source?: string
  head: string[]
  rows: string[][]
  activeIndex: number
  /** Summary rows under the body, set in bold. */
  foot?: string[][]
  /** Cap the height and scroll inside, keeping the header in view — for a long schedule. */
  scroll?: boolean
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-bold text-ink-900">{caption}</h3>
        {source ? <p className="text-[12px] text-ink-400">Sumber: {source}</p> : null}
      </div>
      <div className={`rail overflow-x-auto ${scroll ? 'max-h-[520px] overflow-y-auto' : ''}`}>
        <table className={`w-full text-[13.5px] ${head.length > 2 ? 'min-w-[520px]' : ''}`}>
          <thead className={scroll ? 'sticky top-0 z-10' : undefined}>
            <tr className="border-b border-line bg-paper text-left text-[12.5px] font-semibold text-ink-500">
              {head.map((h, i) => <th key={i} scope="col" className={`px-4 py-2.5 ${i === 0 ? '' : 'text-right'}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="tnum divide-y divide-line">
            {rows.map((row, r) => {
              const active = r === activeIndex
              return (
                <tr key={r} className={active ? 'bg-green-50' : ''}>
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
          {foot?.length ? (
            <tfoot className="tnum border-t-2 border-line-strong">
              {foot.map((row, r) => (
                <tr key={r} className={r ? 'border-t border-line' : ''}>
                  {row.map((cell, c) => (
                    <td key={c} className={`px-4 py-2.5 font-bold text-ink-900 ${c === 0 ? '' : 'text-right'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  )
}

/**
 * The table filed with the simulation in the console, shown as written; the
 * site never works one out itself. The row whose first cell reads as the
 * amount typed in is marked.
 */
export function SavedTable({ sim, amount }: { sim: Simulation; amount: number }) {
  const t = sim.table
  if (!t?.rows.length) return null
  return (
    <Table
      caption={t.caption || `Tabel ${sim.name}`}
      source={t.source}
      head={t.columns}
      rows={t.rows}
      activeIndex={t.rows.findIndex((r) => cellAmount(r[0] ?? '') === amount)}
    />
  )
}

/* ─────────────────────── lump sum, interest + reward ────────────────────── */

function TermDeposit({
  sim, amount, months, onAmount, onMonths,
}: {
  sim: Simulation; amount: number; months: number
  onAmount: (v: number) => void; onMonths: (v: number) => void
}) {
  const rate = sim.ratePercent ?? 0
  const reward = sim.rewardPercent ?? 0
  const result = useMemo(() => calculateTermDeposit(amount, months, rate, reward), [amount, months, rate, reward])

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <AmountInput id="sim-save-amount" label="Jumlah simpanan" value={amount} min={sim.minAmount} max={sim.maxAmount} step={sim.step} onChange={onAmount}
              hint={sim.step ? `Kelipatan ${formatRupiahShort(sim.step)}.` : undefined} />
          </div>

          {sim.tenors.length > 1 ? (
            <div>
              <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
              <Segments options={sim.tenors} value={months} suffix=" bln" ariaLabel="Jangka waktu simpanan" onChange={(v) => onMonths(v)} />
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Bunga</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(rate)}% per tahun</dd>
            </div>
            <div>
              <dt className="text-ink-400">{reward ? 'Reward' : 'Jangka waktu'}</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{reward ? `${num(reward)}% per tahun` : `${months} bulan`}</dd>
            </div>
          </dl>
        </Panel>

        <Result
          rateInfo={rateInfoOf(sim)}
          headlineLabel={`Total imbal hasil ${months} bulan`}
          headline={result.total}
          rows={[
            ['Jumlah simpanan', formatRupiah(amount)],
            ['Nilai bunga', formatRupiah(result.interest)],
            ...(reward ? [['Nilai reward', formatRupiah(result.reward)] as [string, string]] : []),
          ]}
          totalLabel="Diterima saat jatuh tempo"
          total={result.payout}
          note={sim.note || (reward
            ? `Bunga ${num(rate)}% dan reward ${num(reward)}% per tahun, sesuai tabel ${sim.name} yang diterbitkan koperasi.`
            : `Bunga ${num(rate)}% per tahun dari jumlah simpanan, dibayarkan saat jatuh tempo.`)}
          product={sim.product}
          footer={reward ? 'Reward diberikan dalam bentuk barang atau nilai setaranya sesuai ketentuan yang berlaku saat pencairan.' : undefined}
        />
      </div>

      <SavedTable sim={sim} amount={amount} />
    </>
  )
}

/* ───────────────────────── monthly, compounding ─────────────────────────── */

function MonthlyDeposit({
  sim, deposit, months, onDeposit, onMonths,
}: {
  sim: Simulation; deposit: number; months: number
  onDeposit: (v: number) => void; onMonths: (v: number) => void
}) {
  const rate = sim.ratePercent ?? 0
  const years = months / 12
  const result = useMemo(() => calculateMonthlyDeposit(deposit, months, rate), [deposit, months, rate])

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <AmountInput id="sim-save-amount" label="Setoran pokok per bulan" value={deposit} min={sim.minAmount} max={sim.maxAmount} step={sim.step} onChange={onDeposit}
              hint="Disetor rutin setiap bulan." />
          </div>

          {sim.tenors.length > 1 ? (
            <div>
              <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
              <Segments
                options={sim.tenors.map((m) => m / 12)}
                value={years}
                suffix=" th"
                ariaLabel="Jangka waktu simpanan"
                onChange={(v: number) => onMonths(v * 12)}
              />
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Bunga</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(rate)}% per bulan</dd>
            </div>
            <div>
              <dt className="text-ink-400">Jumlah setoran</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{months} kali</dd>
            </div>
          </dl>
        </Panel>

        <Result
          rateInfo={rateInfoOf(sim)}
          headlineLabel={`Nilai simpanan setelah ${num(years)} tahun`}
          headline={result.value}
          rows={[
            ['Setoran pokok per bulan', formatRupiah(deposit)],
            ['Jumlah disetor', formatRupiah(result.deposited)],
            ['Hasil bunga', formatRupiah(result.profit)],
          ]}
          totalLabel="Nilai simpanan akhir"
          total={result.value}
          note={sim.note || `Bunga ${num(rate)}% per bulan yang berbunga lagi setiap bulan, sama dengan tabel ${sim.name} koperasi.`}
          product={sim.product}
          footer="Setoran yang terlambat atau tidak penuh membuat hasil akhir berbeda dari tabel."
        />
      </div>

      <SavedTable sim={sim} amount={deposit} />
    </>
  )
}

/* ─────────────────────────── daily, with a bonus ────────────────────────── */

function DailyDeposit({ sim, daily, onDaily }: { sim: Simulation; daily: number; onDaily: (v: number) => void }) {
  const days = sim.termDays ?? 210
  const multiplier = sim.bonusMultiplier ?? 0
  const result = useMemo(() => calculateDailyDeposit(daily, days, multiplier), [daily, days, multiplier])

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel>
          <div>
            <AmountInput id="sim-save-amount" label="Setoran per hari" value={daily} min={sim.minAmount} max={sim.maxAmount} step={sim.step} onChange={onDaily}
              hint={`Disetor setiap hari selama ${days} hari.`} />
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-[13px]">
            <div>
              <dt className="text-ink-400">Jangka waktu</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{days} hari</dd>
            </div>
            <div>
              <dt className="text-ink-400">Bonus</dt>
              <dd className="tnum mt-0.5 font-bold text-ink-900">{num(multiplier)}× setoran harian</dd>
            </div>
          </dl>
        </Panel>

        <Result
          rateInfo={rateInfoOf(sim)}
          headlineLabel={`Diterima setelah ${days} hari`}
          headline={result.received}
          rows={[
            ['Setoran per hari', formatRupiah(daily)],
            [`Jumlah disetor (${days}×)`, formatRupiah(result.deposited)],
            ['Bonus', formatRupiah(result.bonus)],
          ]}
          totalLabel="Diterima saat jatuh tempo"
          total={result.received}
          note={sim.note || `Bonus dihitung ${num(multiplier)}× setoran harian dan dibulatkan ke bawah ke ribuan terdekat, persis seperti tabel ${sim.name} koperasi.`}
          product={sim.product}
          footer={`Simpanan jatuh tempo setelah ${days} hari setoran.`}
        />
      </div>

      <SavedTable sim={sim} amount={daily} />
    </>
  )
}
