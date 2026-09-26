'use client'

import { useMemo, useState } from 'react'
import { calculateInstallment, calculateLoanFees, loanScheduleTable, loanReferenceRate, simulationMonthlyRate, shownLoanFees, isHtml, formatRupiah, loanMethod, schemePeriodMonths, type InstallmentResult, type LoanFeesResult } from '@/contracts'
import type { Simulation } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon, RichText } from '../ui'
import { Table } from './SavingsCalculator'
import { Field, AmountInput, Segments, Select } from '../ui/form'

/** Indonesian decimals: 1,1 rather than 1.1. */
const pct = (n: number) => `${String(Math.round(n * 1000) / 1000).replace('.', ',')}%`

/**
 * Loan side of the simulator. Each option is a simulation filed in the console:
 * its range, tenors, rate, how often its instalments fall due (monthly, or
 * every six months for a seasonal loan), what its interest is charged on
 * (the remaining balance, or the plafon), and its table. Those are the
 * koperasi's to set; the visitor picks the amount and the tenor.
 */
export function SimulationCalculator({
  simulations, initialSimulationId, disclaimer, initialAmount, initialTenor,
}: {
  simulations: Simulation[]
  initialSimulationId?: string
  disclaimer: string
  initialAmount?: number
  initialTenor?: number
}) {
  const [simulationId, setSimulationId] = useState(initialSimulationId ?? simulations[0]?.id ?? '')
  const sim = simulations.find((x) => x.id === simulationId) ?? simulations[0]
  const product = sim?.product

  // Each product keeps its own figures, opened at its own "Nominal awal" and
  // tenor. One shared amount, only clamped on a switch, meant the second
  // product opened at whatever the first had been set to, and an editor who
  // changed a product's starting amount saw nothing move.
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulations.map((x) => [x.id, startAmount(x, x.id === initialSimulationId ? initialAmount : undefined)])),
  )
  const [tenors, setTenors] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulations.map((x) => [x.id, startTenor(x, x.id === initialSimulationId ? initialTenor : undefined)])),
  )

  const min = sim?.minAmount ?? 0
  const max = sim?.maxAmount ?? 0
  const tenorOptions = tenorsOf(sim)
  const amount = sim ? (amounts[sim.id] ?? startAmount(sim)) : 0
  const tenor = sim ? (tenors[sim.id] ?? startTenor(sim)) : 0
  const clamped = clamp(amount, min, max)

  // A seasonal loan is paid every six months; its interest is six months' worth per instalment.
  const periodMonths = schemePeriodMonths(sim?.installmentScheme)
  const flat = sim?.interestMethod === 'flat'

  // The simulation's own monthly rate, else the product's: signed off, or the
  // koperasi's brochure figure labelled as unconfirmed. `estimated` drives the notice.
  const { monthly: monthlyRate, estimated } = loanReferenceRate(simulationMonthlyRate(sim?.ratePercent, sim?.ratePeriod), product)

  const result = useMemo(() => {
    if (monthlyRate == null || !sim) return null
    return calculateInstallment({ principal: clamped, annualRatePercent: monthlyRate * 12, months: tenor, method: loanMethod(sim.interestMethod), periodMonths })
  }, [monthlyRate, clamped, tenor, sim, periodMonths])
  const fees = useMemo(
    () => (shownLoanFees(sim?.loanTable?.fees).length ? calculateLoanFees(clamped, sim!.loanTable!.fees) : null),
    [sim?.loanTable, clamped],
  )

  if (!sim || !product) return null

  // Flat: every instalment is the same. Menurun: the first is the largest, so the headline says which one it is.
  const per = periodMonths === 1 ? 'bulan' : `${periodMonths} bulan`
  const headline = flat ? `Angsuran per ${per}` : `Angsuran ${per} pertama`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        {/* ── Inputs ── */}
        <div className="surface p-6 sm:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
            <Field label="Produk pinjaman" htmlFor="sim-product" required hint={product.rateNote ?? undefined}>
              <Select
                id="sim-product"
                value={sim.id}
                options={simulations.map((x) => ({ value: x.id, label: x.name, hint: x.tagline ?? x.product.tagline ?? undefined }))}
                onChange={(next) => {
                  setSimulationId(next)
                  track('simulation_change', { productId: simulations.find((x) => x.id === next)?.product.id ?? next })
                }}
              />
            </Field>

            <AmountInput
              id="sim-amount"
              label="Nominal pinjaman"
              value={amount}
              min={min}
              max={max}
              step={sim.step}
              onChange={(v) => setAmounts((a) => ({ ...a, [sim.id]: v }))}
            />

            <div>
              <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
              <Segments
                options={tenorOptions}
                value={tenor}
                suffix=" bln"
                ariaLabel="Jangka waktu angsuran"
                onChange={(t: number) => { setTenors((m) => ({ ...m, [sim.id]: t })); track('simulation_change', { tenor: t }) }}
              />
            </div>

          </div>
        </div>

        {/* ── Result: the statement ── */}
        <div className="surface-dark relative overflow-hidden p-6 text-white sm:p-8">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
          <span aria-hidden="true" className="grid-dark pointer-events-none absolute inset-0 opacity-70" />

          <div className="relative flex items-center justify-between gap-4">
            <p className="t-label !text-white/80">Estimasi</p>
            {/* Only what the editor wrote: the rate is already in the rows below, so an empty field shows nothing. */}
            {sim.rateInfo ? <span className="tnum text-[12px] font-medium text-white/45">{sim.rateInfo}</span> : null}
          </div>

          <p className="relative mt-7 text-[13px] text-white/60">{headline}</p>
          <p className="figure relative mt-1.5 text-[clamp(2rem,1.4rem+2.4vw,2.9rem)] text-gold-300">
            {result ? formatRupiah(result.monthly) : '—'}
          </p>

          {estimated ? (
            <p className="relative mt-4 flex items-start gap-2 rounded-[var(--radius-input)] bg-gold-300/15 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-gold-200 ring-1 ring-inset ring-gold-300/30">
              <Icon.info className="mt-0.5 size-4 shrink-0" />
              <span>
                Suku bunga mengacu pada materi publikasi koperasi dan <strong className="font-semibold">belum diverifikasi ulang</strong> oleh
                pengurus. Konfirmasikan ke petugas sebelum mengambil keputusan.
              </span>
            </p>
          ) : null}

          {result ? (
            <dl className="tnum relative mt-8 border-t border-white/20 text-[14px]">
              {[
                ['Pokok pinjaman', formatRupiah(clamped)],
                ['Jangka waktu', periodMonths === 1 ? `${tenor} bulan` : `${tenor} bulan · ${result.schedule.length}× angsuran`],
                ['Suku bunga', `${pct(monthlyRate!)} per bulan`],
                ...(fees ? [['Biaya administrasi', formatRupiah(fees.total)], ['Dana diterima', formatRupiah(fees.received)]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-white/15 py-3">
                  <dt className="text-white/55">{k}</dt>
                  <dd className="font-semibold text-white">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="relative mt-6 text-[14px] leading-relaxed text-white/60">
              Isi suku bunga untuk melihat angsuran, atau hubungi kami untuk penjelasan.
            </p>
          )}

          <div className="relative mt-8 grid gap-2.5">
            <Action href={`/kontak?produk=${product.slug}&nominal=${clamped}&tenor=${tenor}`} variant="light" size="lg" full>
              Ajukan sekarang
              <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" />
            </Action>
            <Action href={`/produk/${product.category}/${product.slug}`} variant="ghostLight" full>
              Lihat syarat dan ketentuan
            </Action>
          </div>

          {isHtml(disclaimer) ? (
            <RichText value={disclaimer} className="relative mt-6 border-t border-white/15 pt-5 text-[12px] leading-relaxed text-white/45" />
          ) : (
            <p className="relative mt-6 border-t border-white/15 pt-5 text-[12px] leading-relaxed text-white/45">
              *{disclaimer}
            </p>
          )}
        </div>
      </div>
      {result ? <LoanTables sim={sim} result={result} fees={fees} amount={clamped} tenor={tenor} /> : null}
    </div>
  )
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/** The tenors a product offers; a loan filed without any gets the usual four. */
const tenorsOf = (sim: Simulation | undefined) => (sim?.tenors.length ? sim.tenors : [12, 24, 36, 48])

/** Where a product's calculator opens: the amount its editor chose, else its minimum, as the console promises. */
function startAmount(sim: Simulation, wanted?: number) {
  return clamp(wanted ?? sim.defaultAmount ?? sim.minAmount, sim.minAmount, sim.maxAmount)
}

/** The tenor a product opens on: the one a link asked for, else the middle of its choices. */
function startTenor(sim: Simulation, wanted?: number) {
  const options = tenorsOf(sim)
  if (wanted && options.includes(wanted)) return wanted
  return options[Math.min(2, options.length - 1)]!
}

/**
 * The loan's tables, laid out as the simulation's editor chose and worked out
 * from the amount and tenor on screen: the month-by-month schedule, and beside
 * it the fees taken from the plafon and what is left to receive.
 */
function LoanTables({ sim, result, fees, amount, tenor }: {
  sim: Simulation; result: InstallmentResult; fees: LoanFeesResult | null; amount: number; tenor: number
}) {
  const layout = sim.loanTable
  const schedule = useMemo(() => (layout ? loanScheduleTable(layout, result) : null), [layout, result])
  if (!layout || !schedule?.rows.length) return null

  return (
    <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 ${fees ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] lg:items-start' : ''}`}>
      <Table
        caption={`${layout.caption || `Jadwal angsuran ${sim.name}`} · ${formatRupiah(amount)} · ${tenor} bulan`}
        source={layout.source}
        head={schedule.columns}
        rows={schedule.rows}
        activeIndex={-1}
        scroll
      />
      {fees ? (
        <Table
          caption={layout.feesCaption || 'Biaya administrasi'}
          head={['Biaya', 'Nominal']}
          rows={fees.items.map((f) => [f.label, formatRupiah(f.amount)])}
          foot={[['Total biaya', formatRupiah(fees.total)], ['Dana diterima', formatRupiah(fees.received)]]}
          activeIndex={-1}
        />
      ) : null}
    </div>
  )
}
