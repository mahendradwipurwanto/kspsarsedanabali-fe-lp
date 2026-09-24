/**
 * Installment maths for the simulator and the profiling wizard.
 *
 * These figures are shown to the public, so every result carries a disclaimer and
 * every method is unit-tested. Rates come from the CMS `products` table — never
 * hardcode a rate here.
 */

import type { LoanTable, LoanTableColumn } from './schemas/index'

export type RateMethod = 'flat' | 'annuity' | 'effective' | 'none'

export interface InstallmentInput {
  /** Principal in rupiah. */
  principal: number
  /** Annual nominal rate as a percentage, e.g. 15.6 for 1.3%/month. */
  annualRatePercent: number
  /** Tenor in months. */
  months: number
  method: RateMethod
}

export interface InstallmentResult {
  monthly: number
  total: number
  totalInterest: number
  method: RateMethod
  /** Per-period schedule; empty for `none`. */
  schedule: { period: number; principal: number; interest: number; payment: number; balance: number }[]
}

const round = (n: number) => Math.round(n)

/**
 * Flat / "bunga menurun" style used by most Indonesian cooperatives:
 * interest is charged on the original principal for every period.
 */
function flat({ principal, annualRatePercent, months }: InstallmentInput): InstallmentResult {
  const monthlyRate = annualRatePercent / 100 / 12
  const interestPerMonth = principal * monthlyRate
  const principalPerMonth = principal / months
  const monthly = round(principalPerMonth + interestPerMonth)
  const schedule = []
  let balance = principal
  for (let p = 1; p <= months; p++) {
    balance -= principalPerMonth
    schedule.push({ period: p, principal: round(principalPerMonth), interest: round(interestPerMonth), payment: round(principalPerMonth + interestPerMonth), balance: round(Math.max(balance, 0)) })
  }
  return { monthly, total: monthly * months, totalInterest: round(interestPerMonth * months), method: 'flat', schedule }
}

/** Annuity: equal payments, interest recomputed on the declining balance. */
function annuity({ principal, annualRatePercent, months }: InstallmentInput): InstallmentResult {
  const r = annualRatePercent / 100 / 12
  if (r === 0) return flat({ principal, annualRatePercent: 0, months, method: 'flat' })
  const factor = Math.pow(1 + r, months)
  const monthly = round((principal * r * factor) / (factor - 1))
  const schedule = []
  let balance = principal
  let totalInterest = 0
  for (let p = 1; p <= months; p++) {
    const interest = balance * r
    const principalPart = monthly - interest
    balance -= principalPart
    totalInterest += interest
    schedule.push({ period: p, principal: round(principalPart), interest: round(interest), payment: monthly, balance: round(Math.max(balance, 0)) })
  }
  return { monthly, total: monthly * months, totalInterest: round(totalInterest), method: 'annuity', schedule }
}

/** Effective declining: principal fixed, interest on the remaining balance. */
function effective({ principal, annualRatePercent, months }: InstallmentInput): InstallmentResult {
  const r = annualRatePercent / 100 / 12
  const principalPerMonth = principal / months
  const schedule = []
  let balance = principal
  let total = 0
  let totalInterest = 0
  for (let p = 1; p <= months; p++) {
    const interest = balance * r
    balance -= principalPerMonth
    total += principalPerMonth + interest
    totalInterest += interest
    schedule.push({ period: p, principal: round(principalPerMonth), interest: round(interest), payment: round(principalPerMonth + interest), balance: round(Math.max(balance, 0)) })
  }
  return { monthly: schedule[0].payment, total: round(total), totalInterest: round(totalInterest), method: 'effective', schedule }
}

/**
 * Every loan the koperasi offers is bunga menurun: principal repaid in equal
 * parts, interest on what is still owed. Products differ only in the rate, so
 * the simulator never reads a method from a product.
 */
export const LOAN_RATE_METHOD: RateMethod = 'effective'

/**
 * The monthly rate a loan simulation starts from, as the koperasi quotes it
 * (1,1% a month, not 13,2% a year): the simulation's own figure when the editor
 * set one, else the product's annual rate over twelve. `estimated` when that
 * fallback is the product's unconfirmed brochure figure.
 */
export function loanReferenceRate(
  simulationMonthlyPercent: number | null | undefined,
  product?: { ratePercent?: number | null; ratePercentIndicative?: number | null } | null,
): { monthly: number | null; estimated: boolean } {
  if (simulationMonthlyPercent != null) return { monthly: simulationMonthlyPercent, estimated: false }
  if (product?.ratePercent != null) return { monthly: product.ratePercent / 12, estimated: false }
  if (product?.ratePercentIndicative != null) return { monthly: product.ratePercentIndicative / 12, estimated: true }
  return { monthly: null, estimated: false }
}

export function calculateInstallment(input: InstallmentInput): InstallmentResult {
  if (input.principal <= 0 || input.months <= 0) {
    return { monthly: 0, total: 0, totalInterest: 0, method: input.method, schedule: [] }
  }
  switch (input.method) {
    case 'flat': return flat(input)
    case 'annuity': return annuity(input)
    case 'effective': return effective(input)
    default: return { monthly: 0, total: input.principal, totalInterest: 0, method: 'none', schedule: [] }
  }
}

/** Simple compounding projection for savings products. */
export function calculateSavings(monthlyDeposit: number, annualRatePercent: number, months: number) {
  const r = annualRatePercent / 100 / 12
  let balance = 0
  for (let i = 0; i < months; i++) balance = (balance + monthlyDeposit) * (1 + r)
  const deposited = monthlyDeposit * months
  return { finalBalance: round(balance), deposited, interest: round(balance - deposited) }
}

/* ───────────────────────── savings, from the printed tables ─────────────── */

/**
 * The three savings products the koperasi publishes a table for. The figures
 * below reproduce those tables exactly rather than approximating them, so a
 * member comparing the website against the printed sheet sees the same number.
 *
 * Sources: "Tabel SIGEMAS — Simpanan Generasi Emas" (brochure) and the
 * koperasi's spreadsheet of SIMAPAN and SIPURA tables, signed by the Ketua and
 * Sekretaris under Badan Hukum AHU-0002642.AH.01.27.TAHUN 2021.
 */

/**
 * SIGEMAS — Simpanan Generasi Emas.
 *
 * A lump sum held for 12, 24 or 36 months. It earns 1% a year in interest plus
 * a gold reward worth 4% a year, so 5% a year in total. The printed table runs
 * from Rp50 juta to Rp500 juta in Rp50 juta steps.
 */
export const SIGEMAS = {
  interestPercentPerYear: 1,
  rewardPercentPerYear: 4,
  minAmount: 50_000_000,
  maxAmount: 500_000_000,
  step: 50_000_000,
  tenors: [12, 24, 36] as const,
  amounts: Array.from({ length: 10 }, (_, i) => (i + 1) * 50_000_000),
} as const

export interface SigemasResult {
  years: number
  /** Cash interest over the whole term. */
  interest: number
  /** Value of the gold reward over the whole term. */
  reward: number
  /** Interest plus reward. */
  total: number
  /** Deposit returned plus everything it earned. */
  payout: number
}

export function calculateSigemas(amount: number, months: number): SigemasResult {
  return calculateTermDeposit(amount, months, SIGEMAS.interestPercentPerYear, SIGEMAS.rewardPercentPerYear)
}

/**
 * A lump sum held for a term, earning simple interest plus an optional reward,
 * both quoted per year. SIGEMAS is this with 1% and 4%; a simulation filed in
 * the console under "Simpanan berjangka" supplies its own two figures.
 */
export function calculateTermDeposit(amount: number, months: number, interestPercentPerYear: number, rewardPercentPerYear = 0): SigemasResult {
  const years = months / 12
  const interest = round((amount * interestPercentPerYear / 100) * years)
  const reward = round((amount * rewardPercentPerYear / 100) * years)
  return { years, interest, reward, total: interest + reward, payout: amount + interest + reward }
}

/**
 * SIMAPAN — Simpanan Masa Depan.
 *
 * A fixed amount paid in every month, compounding at 0.35% a month (4.2% a year
 * nominal, 4.28% effective). This is an ordinary annuity: the deposit for a
 * month earns from the end of that month. It reproduces all ninety cells of the
 * koperasi's table, every deposit from Rp50 ribu to Rp2 juta over one to ten
 * years, to the rupiah.
 */
export const SIMAPAN = {
  monthlyRatePercent: 0.35,
  deposits: [50_000, 100_000, 200_000, 300_000, 400_000, 500_000, 1_000_000, 1_500_000, 2_000_000],
  years: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  minDeposit: 50_000,
  maxDeposit: 5_000_000,
} as const

export interface SimapanResult {
  months: number
  /** What the member pays in over the term. */
  deposited: number
  /** Balance at the end of the term. */
  value: number
  /** Value less deposits. */
  profit: number
}

export function calculateSimapan(monthlyDeposit: number, months: number): SimapanResult {
  return calculateMonthlyDeposit(monthlyDeposit, months, SIMAPAN.monthlyRatePercent)
}

/**
 * A fixed deposit every month, compounding monthly as an ordinary annuity.
 * SIMAPAN is this at 0.35% a month.
 */
export function calculateMonthlyDeposit(monthlyDeposit: number, months: number, monthlyRatePercent: number): SimapanResult {
  const i = monthlyRatePercent / 100
  const value = i === 0 ? monthlyDeposit * months : monthlyDeposit * (((1 + i) ** months - 1) / i)
  const deposited = monthlyDeposit * months
  return { months, deposited, value: round(value), profit: round(value) - deposited }
}

/**
 * SIPURA — Simpanan Hari Raya.
 *
 * A small amount paid in daily for 210 days, one Balinese pawukon year, so the
 * savings mature in time for the next round of ceremonies. The bonus is 1.9
 * times one deposit, rounded down to the nearest thousand rupiah, which is how
 * every row of the printed table is calculated.
 */
export const SIPURA = {
  days: 210,
  bonusMultiplier: 1.9,
  deposits: [5_000, 10_000, 20_000, 25_000, 30_000, 50_000, 75_000, 100_000, 200_000],
  minDeposit: 5_000,
  maxDeposit: 500_000,
} as const

export interface SipuraResult {
  days: number
  /** What the member pays in over the 210 days. */
  deposited: number
  bonus: number
  /** Deposits plus bonus, paid out at maturity. */
  received: number
}

export function calculateSipura(dailyDeposit: number): SipuraResult {
  return calculateDailyDeposit(dailyDeposit, SIPURA.days, SIPURA.bonusMultiplier)
}

/**
 * A deposit every day for a fixed number of days, with a bonus of some multiple
 * of one day's deposit, rounded down to the thousand. SIPURA is 210 days and 1.9×.
 */
export function calculateDailyDeposit(dailyDeposit: number, days: number, bonusMultiplier: number): SipuraResult {
  const deposited = dailyDeposit * days
  const bonus = Math.floor((dailyDeposit * bonusMultiplier) / 1000) * 1000
  return { days, deposited, bonus, received: deposited + bonus }
}

/** Slugs the savings tables belong to, so a product page can link to its table. */
export const SAVINGS_TABLE_SLUGS = ['sigemas', 'simapan', 'sipura'] as const
export type SavingsTableSlug = (typeof SAVINGS_TABLE_SLUGS)[number]

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export const formatRupiahShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`
  if (n >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`
  return `Rp${n}`
}

/* ─────────────────────── a simulation's table, from its formula ─────────── */

export interface FormulaTableInput {
  kind: 'installment' | 'term_deposit' | 'monthly_deposit' | 'daily_deposit'
  name: string
  minAmount: number
  maxAmount: number
  step?: number | null
  tenors: number[]
  tableAmounts?: number[]
  ratePercent?: number | null
  rewardPercent?: number | null
  bonusMultiplier?: number | null
  termDays?: number | null
  /** Installment only: the product's annual rate and method. */
  loanRatePercent?: number | null
  loanMethod?: RateMethod
}

/** The amounts a table lists: the ones filed, else six across the range on the step. */
function tableAmountsOf(t: FormulaTableInput): number[] {
  if (t.tableAmounts?.length) return t.tableAmounts
  const n = 6
  const step = t.step && t.step > 0 ? t.step : 0
  const out = new Set<number>()
  for (let i = 0; i < n; i++) {
    let a = t.minAmount + ((t.maxAmount - t.minAmount) * i) / (n - 1)
    if (step) a = t.minAmount + Math.round((a - t.minAmount) / step) * step
    else {
      const mag = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(a, 1))) - 1)
      a = Math.round(a / mag) * mag
    }
    out.add(Math.min(Math.max(a, t.minAmount), t.maxAmount))
  }
  return [...out]
}

/**
 * A table worked out from a simulation's own figures, as a starting point the
 * editor can then change: one row per amount, one column per tenor where the
 * kind has tenors. Every cell is text, formatted as the website shows money.
 */
export function formulaTable(t: FormulaTableInput): { caption: string; source: string; columns: string[]; rows: string[][] } {
  return { source: 'Tabel resmi KSP Sari Sedana Bali', ...formulaTableBody(t) }
}

function formulaTableBody(t: FormulaTableInput): { caption: string; columns: string[]; rows: string[][] } {
  const amounts = tableAmountsOf(t)
  const years = (m: number) => (m % 12 === 0 ? `${m / 12} th` : `${m} bln`)
  switch (t.kind) {
    case 'term_deposit':
      return {
        caption: `Tabel ${t.name} · total imbal hasil`,
        columns: ['Jumlah simpanan', ...t.tenors.map((m) => `${m} bulan`)],
        rows: amounts.map((a) => [formatRupiah(a), ...t.tenors.map((m) => formatRupiah(calculateTermDeposit(a, m, t.ratePercent ?? 0, t.rewardPercent ?? 0).total))]),
      }
    case 'monthly_deposit':
      return {
        caption: `Tabel ${t.name} · nilai simpanan akhir`,
        columns: ['Setoran pokok per bulan', ...t.tenors.map(years)],
        rows: amounts.map((a) => [formatRupiah(a), ...t.tenors.map((m) => formatRupiah(calculateMonthlyDeposit(a, m, t.ratePercent ?? 0).value))]),
      }
    case 'daily_deposit': {
      const days = t.termDays ?? 210
      return {
        caption: `Tabel ${t.name} · ${days} hari`,
        columns: ['Setoran per hari', 'Jumlah disetor', 'Bonus', 'Diterima'],
        rows: amounts.map((a) => {
          const r = calculateDailyDeposit(a, days, t.bonusMultiplier ?? 0)
          return [formatRupiah(a), formatRupiah(r.deposited), formatRupiah(r.bonus), formatRupiah(r.received)]
        }),
      }
    }
    default:
      return {
        caption: `Tabel angsuran ${t.name} · per bulan`,
        columns: ['Nominal pinjaman', ...t.tenors.map((m) => `${m} bulan`)],
        rows: amounts.map((a) => [
          formatRupiah(a),
          ...t.tenors.map((m) => t.loanRatePercent
            ? formatRupiah(calculateInstallment({ principal: a, annualRatePercent: t.loanRatePercent, months: m, method: t.loanMethod ?? 'flat' }).monthly)
            : '—'),
        ]),
      }
  }
}

/* ──────────────────────── a loan's tables, worked out live ───────────────── */

/**
 * The koperasi's loan spreadsheet ("contoh admin"): a month-by-month schedule
 * of pokok, bunga, total and saldo, and beside it the fees taken from the
 * plafon at disbursement. A new loan simulation starts from this layout.
 */
export const DEFAULT_LOAN_TABLE: LoanTable = {
  caption: '',
  source: 'Tabel angsuran KSP Sari Sedana Bali',
  columns: [
    { key: 'period', label: 'No', visible: true },
    { key: 'principal', label: 'Pokok', visible: true },
    { key: 'interest', label: 'Bunga', visible: true },
    { key: 'installment', label: 'Total', visible: true },
    { key: 'balance', label: 'Saldo', visible: true },
  ],
  feesCaption: '',
  fees: [
    { label: 'Administrasi', basis: 'percent', value: 0.5, visible: true },
    { label: 'Wajib peminjam', basis: 'percent', value: 0.5, visible: true },
    { label: 'Anggota', basis: 'fixed', value: 120_000, visible: true },
    { label: 'Asuransi', basis: 'percent', value: 1, visible: true },
    { label: 'Brins', basis: 'fixed', value: 50_000, visible: true },
  ],
}

/**
 * The repayment schedule as the website shows it: the visible columns in the
 * editor's order, one row per month, every cell formatted.
 */
export function loanScheduleTable(config: LoanTable, result: InstallmentResult): { columns: string[]; rows: string[][] } {
  const shown = config.columns.filter((c) => c.visible)
  const cell: Record<LoanTableColumn, (r: InstallmentResult['schedule'][number]) => string> = {
    period: (r) => String(r.period),
    principal: (r) => formatRupiah(r.principal),
    interest: (r) => formatRupiah(r.interest),
    installment: (r) => formatRupiah(r.payment),
    balance: (r) => formatRupiah(r.balance),
  }
  return {
    columns: shown.map((c) => c.label),
    rows: result.schedule.map((r) => shown.map((c) => cell[c.key](r))),
  }
}

export interface LoanFeesResult {
  items: { label: string; amount: number }[]
  total: number
  /** The plafon less every fee: what the member actually receives. */
  received: number
}

/** The fees the website shows: every one not switched off. Saved before the switch existed, a fee is shown. */
export const shownLoanFees = (fees: LoanTable['fees'] | undefined) => (fees ?? []).filter((f) => f.visible !== false)

/** The fees on a plafon, each a percentage of it or a fixed amount, and what is left. Hidden fees are left out. */
export function calculateLoanFees(principal: number, fees: LoanTable['fees']): LoanFeesResult {
  const items = shownLoanFees(fees).map((f) => ({ label: f.label, amount: round(f.basis === 'percent' ? (principal * f.value) / 100 : f.value) }))
  const total = items.reduce((sum, f) => sum + f.amount, 0)
  return { items, total, received: principal - total }
}

/** The number a table cell names, if it names one: "Rp 2.500.000" → 2500000. */
export const cellAmount = (cell: string) => {
  const digits = cell.replace(/\D/g, '')
  return digits ? Number(digits) : null
}
