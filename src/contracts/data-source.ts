import { z } from 'zod'

/**
 * Data read from a Google Spreadsheet, and the chart drawn from it.
 *
 * Everything here is pure and shared: the API uses it to turn a sheet into a
 * chart, the console to preview that chart before saving, and the website to
 * draw it. One reading of "which column is the label" in three places would be
 * three places for them to disagree.
 */

/** A cell: the number behind it when the sheet holds one, otherwise the text it shows. Empty is null. */
export type SheetCell = string | number | null

export interface SheetTable {
  /** One name per column; a blank header is filled in as "Kolom C". */
  headers: string[]
  rows: SheetCell[][]
}

export interface SheetTab { title: string; gid: string }

/** How the API got in: through the koperasi's service account, or because the sheet is open to anyone with the link. */
export type SheetAccess = 'service_account' | 'public'

export interface ChartSeries { name: string; values: (number | null)[] }
export interface ChartData { labels: string[]; series: ChartSeries[] }

/** What the website receives for a "Diagram Data" block. */
export interface PublicDataSource {
  id: string
  name: string
  chart: ChartData
  syncedAt: string | null
}

export const CHART_TYPES = ['bar', 'bar-horizontal', 'line', 'area', 'pie', 'donut'] as const
export type ChartType = (typeof CHART_TYPES)[number]

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Batang',
  'bar-horizontal': 'Batang mendatar',
  line: 'Garis',
  area: 'Area',
  pie: 'Lingkaran',
  donut: 'Donat',
}

export const CHART_VALUE_FORMATS = ['number', 'compact', 'rupiah', 'rupiah-compact', 'percent'] as const
export type ChartValueFormat = (typeof CHART_VALUE_FORMATS)[number]

/**
 * Series colours, in the order they are handed out: the brand green first.
 *
 * Checked as a set rather than chosen by eye: neighbours stay apart for
 * colour-blind readers (worst adjacent pair ΔE 8.1 deutan) and for everyone
 * else (ΔE 16.5). The gold sits just under 3:1 against white, which is why a
 * chart always carries a legend and a table of its figures.
 */
export const CHART_COLORS = ['#4e8b2c', '#2f6fb0', '#d08a1c', '#8a4fb0', '#c04a5c', '#1f9a93'] as const
/** Slices folded together as "Lainnya", and anything past the last colour. */
export const CHART_COLOR_OTHER = '#8593a6'

/** More series than colours would mean reusing one; more points than this stops being readable. */
export const CHART_MAX_SERIES = CHART_COLORS.length
export const CHART_MAX_POINTS = 60
export const CHART_MAX_SLICES = CHART_COLORS.length

/** How much of a sheet is kept: enough for any chart, small enough to store with the record. */
export const SHEET_MAX_ROWS = 500
export const SHEET_MAX_COLUMNS = 26

/* ------------------------------ spreadsheet link ----------------------------- */

export type ParsedSheetLink =
  | { ok: true; spreadsheetId: string; gid: string | null }
  | { ok: false; reason: 'empty' | 'published' | 'not_sheets' }

/**
 * The spreadsheet a pasted link points at, and the tab it was copied from.
 *
 * Takes what people actually paste: the address bar of an open sheet, the
 * "Salin link" of the share dialog, or the bare id. A "Publikasikan ke web"
 * link is recognised and refused with its own reason, because its id is a
 * different thing that neither way of reading the sheet accepts.
 */
export function parseSheetLink(input: string | null | undefined): ParsedSheetLink {
  const raw = (input ?? '').trim()
  if (!raw) return { ok: false, reason: 'empty' }
  if (/^[A-Za-z0-9_-]{25,}$/.test(raw)) return { ok: true, spreadsheetId: raw, gid: null }
  if (/\/spreadsheets\/d\/e\//.test(raw)) return { ok: false, reason: 'published' }
  const m = raw.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})/)
  if (!m) return { ok: false, reason: 'not_sheets' }
  const gid = raw.match(/[#&?]gid=(\d+)/)
  return { ok: true, spreadsheetId: m[1]!, gid: gid ? gid[1]! : null }
}

export const SHEET_LINK_ERRORS: Record<'empty' | 'published' | 'not_sheets', string> = {
  empty: 'Tempel dulu link Google Spreadsheet-nya.',
  published:
    'Ini link "Publikasikan ke web", yang tidak bisa dibaca. Buka spreadsheet-nya, klik tombol Bagikan → Salin link, lalu tempel link itu di sini.',
  not_sheets:
    'Link ini bukan link Google Spreadsheet. Buka spreadsheet-nya di browser, salin alamat di bagian atas (diawali https://docs.google.com/spreadsheets/…), lalu tempel di sini.',
}

/** The link to open a spreadsheet at a given tab. */
export const sheetUrl = (spreadsheetId: string, gid?: string | null) =>
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit${gid ? `#gid=${gid}` : ''}`

/* ---------------------------------- numbers --------------------------------- */

/**
 * The number a cell shows, however the sheet wrote it.
 *
 * A sheet read through its public link arrives as text, formatted for whoever
 * owns it: "Rp 1.500.000", "1,500,000", "12,5%", "(250)". Separators are read
 * by position rather than by a locale nobody told us: with both present the
 * last one is the decimal mark; one on its own followed by exactly three
 * digits is a thousands separator, which is what "1.500" means on an
 * Indonesian sheet and "1,500" on an English one.
 */
export function parseSheetNumber(cell: SheetCell | undefined): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null
  if (cell === null || cell === undefined) return null
  let s = String(cell).trim()
  if (!s || s === '-' || s === '–') return null

  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  // Currency marks, units and spaces around the figure; a word in the middle is not a number.
  s = s.replace(/^(?:rp\.?|idr|usd|\$)\s*/i, '').replace(/\s*(?:%|persen)$/i, '').replace(/[\s ]/g, '')
  if (s.startsWith('-') || s.startsWith('−')) { negative = !negative; s = s.slice(1) }
  else if (s.startsWith('+')) s = s.slice(1)
  if (!/^\d[\d.,]*$/.test(s)) return null

  const dots = (s.match(/\./g) ?? []).length
  const commas = (s.match(/,/g) ?? []).length
  let normal: string
  if (dots && commas) {
    const decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ','
    const thousands = decimal === '.' ? ',' : '.'
    normal = s.split(thousands).join('').replace(decimal, '.')
  } else if (dots + commas === 0) {
    normal = s
  } else {
    const mark = dots ? '.' : ','
    const count = dots || commas
    const head = s.slice(0, s.indexOf(mark))
    const tail = s.slice(s.lastIndexOf(mark) + 1)
    // "0.125" is a fraction whatever follows the mark; "1.500" is fifteen hundred.
    const grouped = count > 1 || (tail.length === 3 && head.length >= 1 && head.length <= 3 && head !== '0')
    normal = grouped ? s.split(mark).join('') : s.replace(mark, '.')
  }
  const n = Number(normal)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

/** What a cell reads as when it names a row. */
export function cellText(cell: SheetCell | undefined): string {
  if (cell === null || cell === undefined) return ''
  return typeof cell === 'number' ? String(cell) : cell.trim()
}

/** RFC 4180: quoted cells may hold commas, line breaks and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

/* ------------------------------ rows to a table ------------------------------ */

const columnLetter = (i: number) => {
  let s = ''
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s
  return s
}

/**
 * Raw rows as a table with named columns.
 *
 * Blank rows above and below are dropped, columns that are empty all the way
 * down are dropped, and every column ends up with a name an editor can pick
 * from a list: its header, or "Kolom C" when the header is blank or the sheet
 * has no header row. Two columns with the same header are told apart.
 */
export function tableFromRows(rows: SheetCell[][], hasHeader = true): SheetTable {
  const blank = (c: SheetCell | undefined) => c === null || c === undefined || (typeof c === 'string' && !c.trim())
  const body = rows.filter((r) => r.some((c) => !blank(c))).slice(0, SHEET_MAX_ROWS + 1)
  if (!body.length) return { headers: [], rows: [] }

  const width = Math.min(Math.max(...body.map((r) => r.length)), SHEET_MAX_COLUMNS)
  const keep: number[] = []
  for (let c = 0; c < width; c++) if (body.some((r) => !blank(r[c]))) keep.push(c)

  const head = hasHeader ? body[0]! : []
  const data = hasHeader ? body.slice(1) : body
  const seen = new Map<string, number>()
  const headers = keep.map((c) => {
    const name = cellText(head[c]) || `Kolom ${columnLetter(c)}`
    const n = (seen.get(name) ?? 0) + 1
    seen.set(name, n)
    return n > 1 ? `${name} (${n})` : name
  })

  return {
    headers,
    rows: data.slice(0, SHEET_MAX_ROWS).map((r) => keep.map((c) => {
      const cell = r[c]
      if (blank(cell)) return null
      return typeof cell === 'string' ? cell.trim() : (cell as number)
    })),
  }
}

/* ------------------------------ table to a chart ----------------------------- */

export interface ChartMapping {
  /** Header of the column that names each row: tahun, bulan, nama produk. */
  labelColumn: string
  /** Headers of the columns holding the figures; each becomes one series. Or `COUNT_COLUMN` alone. */
  valueColumns: string[]
}

/**
 * Stands in `valueColumns` for "how many rows carry each name" instead of a
 * column of the sheet. It is what a form's answer sheet needs: one row per
 * respondent, no figures at all, and the chart wanted is 14 "Setuju" against
 * 10 "Tidak Setuju". Chosen, it is the only series: a count and a column of
 * rupiah do not share an axis.
 */
export const COUNT_COLUMN = '__jumlah_baris__'
/** What the counted series is called in legends, tooltips and the table view. */
export const COUNT_SERIES_NAME = 'Jumlah'
export const countsRows = (mapping: Pick<ChartMapping, 'valueColumns'>) => mapping.valueColumns.includes(COUNT_COLUMN)

/** The same answer however it was typed: "Setuju", "setuju " and "SETUJU" are one bar. */
const labelKey = (label: string) => label.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID')

/**
 * How often each name appears in a column, most frequent first.
 *
 * Also what the editor uses to notice a column of repeating answers and offer
 * to count them.
 */
export function countByLabel(table: SheetTable, labelColumn: string): { label: string; count: number }[] {
  const at = table.headers.indexOf(labelColumn)
  if (at < 0) return []
  const groups = new Map<string, { label: string; count: number }>()
  for (const row of table.rows) {
    const label = cellText(row[at])
    if (!label) continue
    const key = labelKey(label)
    const group = groups.get(key)
    if (group) group.count++
    else groups.set(key, { label: label.replace(/\s+/g, ' ').trim(), count: 1 })
  }
  // A stable sort: answers given equally often stay in the order they first appear.
  return [...groups.values()].sort((a, b) => b.count - a.count)
}

/** Share of a column's filled cells that read as numbers. */
function numericShare(table: SheetTable, col: number): number {
  let filled = 0, numeric = 0
  for (const row of table.rows) {
    const cell = row[col]
    if (cell === null || cell === undefined || cell === '') continue
    filled++
    if (parseSheetNumber(cell) !== null) numeric++
  }
  return filled ? numeric / filled : 0
}

/**
 * A first guess at the columns, so most sheets need no choosing at all.
 *
 * The first column names the rows, as it does on nearly every sheet: a year, a
 * month, a product. The one exception is a row counter ("No": 1, 2, 3…), which
 * is passed over for the first column of words. Every other column that is
 * mostly numbers is a series.
 */
export function suggestMapping(table: SheetTable): ChartMapping {
  if (!table.headers.length) return { labelColumn: '', valueColumns: [] }
  const shares = table.headers.map((_, i) => numericShare(table, i))
  const counter = table.rows.length > 1 && table.rows.every((row, r) => parseSheetNumber(row[0]) === r + 1)
  const wordy = shares.findIndex((s) => s < 0.5)
  const label = counter && wordy > 0 ? wordy : 0
  const values = table.headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => i !== label && !(counter && i === 0) && shares[i]! >= 0.6)
    .slice(0, CHART_MAX_SERIES)
    .map(({ h }) => h)
  if (values.length) return { labelColumn: table.headers[label]!, valueColumns: values }

  // No figures anywhere: a sheet of answers. Count the first column whose
  // answers repeat (a choice, not a name or a timestamp), if there is one.
  const answers = table.headers.find((h) => {
    const groups = countByLabel(table, h)
    const filled = groups.reduce((n, g) => n + g.count, 0)
    return groups.length >= 2 && groups.length <= 12 && filled >= groups.length * 2
  })
  return answers ? { labelColumn: answers, valueColumns: [COUNT_COLUMN] } : { labelColumn: table.headers[label]!, valueColumns: [] }
}

/** Why a table and a choice of columns cannot make a chart, in words an editor can act on; null when they can. */
export function mappingProblem(table: SheetTable, mapping: ChartMapping): string | null {
  if (!table.headers.length || !table.rows.length) return 'Lembar ini kosong. Isi dulu datanya di spreadsheet, lalu tekan Tes koneksi lagi.'
  if (!mapping.labelColumn) return 'Pilih kolom yang berisi nama atau periode (misalnya Tahun).'
  if (!table.headers.includes(mapping.labelColumn)) return `Kolom "${mapping.labelColumn}" tidak ada lagi di spreadsheet. Pilih kolom lain.`
  if (!mapping.valueColumns.length) return 'Pilih paling sedikit satu kolom angka, atau “Jumlah jawaban” untuk menghitung baris.'
  if (countsRows(mapping)) return toChartData(table, mapping).labels.length ? null : `Kolom "${mapping.labelColumn}" kosong, jadi tidak ada yang bisa dihitung.`
  const gone = mapping.valueColumns.find((c) => !table.headers.includes(c))
  if (gone) return `Kolom "${gone}" tidak ada lagi di spreadsheet. Pilih kolom lain.`
  if (mapping.valueColumns.length > CHART_MAX_SERIES) return `Paling banyak ${CHART_MAX_SERIES} kolom angka dalam satu diagram.`
  const chart = toChartData(table, mapping)
  if (!chart.labels.length) return 'Tidak ada baris yang berisi angka pada kolom yang dipilih.'
  return null
}

/**
 * The chart a table makes with the chosen columns.
 *
 * A row is drawn when it has a name and at least one figure; a blank or
 * non-numeric cell in a drawn row is a gap, not a zero. Columns that no longer
 * exist are skipped rather than failing, so a renamed header costs one series
 * instead of the whole chart.
 *
 * Rows that share a name are one point, their figures added up: twelve rows of
 * "Pinjaman" are one bar of their total, and a pie never has two slices with
 * the same name. Points keep the order their names first appear in, so a sheet
 * with one row per year draws exactly as it reads. `COUNT_COLUMN` counts the
 * rows of each name instead, most frequent first.
 */
export function toChartData(table: SheetTable, mapping: ChartMapping): ChartData {
  if (countsRows(mapping)) {
    const groups = countByLabel(table, mapping.labelColumn).slice(0, CHART_MAX_POINTS)
    return groups.length
      ? { labels: groups.map((g) => g.label), series: [{ name: COUNT_SERIES_NAME, values: groups.map((g) => g.count) }] }
      : { labels: [], series: [] }
  }
  const labelAt = table.headers.indexOf(mapping.labelColumn)
  const cols = mapping.valueColumns
    .map((name) => ({ name, at: table.headers.indexOf(name) }))
    .filter((c) => c.at >= 0)
    .slice(0, CHART_MAX_SERIES)
  if (labelAt < 0 || !cols.length) return { labels: [], series: [] }

  const labels: string[] = []
  const series: ChartSeries[] = cols.map((c) => ({ name: c.name, values: [] }))
  const pointOf = new Map<string, number>()
  for (const row of table.rows) {
    const label = cellText(row[labelAt]).replace(/\s+/g, ' ').trim()
    const values = cols.map((c) => parseSheetNumber(row[c.at]))
    if (!label || values.every((v) => v === null)) continue
    const key = labelKey(label)
    let at = pointOf.get(key)
    if (at === undefined) {
      // Past the limit only new names are left out; rows of a name already drawn still count.
      if (labels.length >= CHART_MAX_POINTS) continue
      at = labels.length
      pointOf.set(key, at)
      labels.push(label)
      series.forEach((sr) => sr.values.push(null))
    }
    values.forEach((v, i) => {
      if (v === null) return
      const sum = (series[i]!.values[at!] ?? 0) + v
      // Added in floating point: 0.1 + 0.2 must not reach a label as 0.30000000000000004.
      series[i]!.values[at!] = Math.round(sum * 1e6) / 1e6
    })
  }
  return { labels, series }
}

/** How many rows of a table a chart's points stand for, when rows sharing a name were merged; null when none were. */
export function mergedRows(table: SheetTable, mapping: ChartMapping): { rows: number; points: number } | null {
  if (countsRows(mapping)) return null
  const labelAt = table.headers.indexOf(mapping.labelColumn)
  const cols = mapping.valueColumns.map((name) => table.headers.indexOf(name)).filter((c) => c >= 0)
  if (labelAt < 0 || !cols.length) return null
  const rows = table.rows.filter((row) => cellText(row[labelAt]) && cols.some((c) => parseSheetNumber(row[c]) !== null)).length
  const points = toChartData(table, mapping).labels.length
  return points < CHART_MAX_POINTS && rows > points ? { rows, points } : null
}

/* -------------------------------- chart maths -------------------------------- */

/** A y-axis that ends on round numbers and always includes zero, with about `target` steps. */
export function niceScale(min: number, max: number, target = 4): { min: number; max: number; ticks: number[] } {
  let lo = Math.min(0, min), hi = Math.max(0, max)
  if (lo === hi) hi = lo + 1
  const rough = (hi - lo) / Math.max(1, target)
  const pow = 10 ** Math.floor(Math.log10(rough))
  const unit = rough / pow
  let step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * pow
  // Counts (answers to a form, rows) never need a gridline at 0,25: with whole ends, keep whole steps.
  if (Number.isInteger(min) && Number.isInteger(max) && step < 1) step = 1
  if (Number.isInteger(min) && Number.isInteger(max) && step === 2.5) step = 2
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)))
  return { min: lo, max: hi, ticks }
}

const idNumber = (digits: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits })

/** 1.250.000 as "1,25 jt": the short forms Indonesian readers use, not the "K/M/B" of English charts. */
function compact(v: number): string {
  const abs = Math.abs(v)
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'M'], [1e6, 'jt'], [1e3, 'rb']]
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = v / size
      return `${idNumber(Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2).format(scaled)} ${suffix}`
    }
  }
  return idNumber(abs < 10 ? 2 : abs < 100 ? 1 : 0).format(v)
}

/** A figure as the block asked for it to be written. */
export function formatChartValue(v: number | null | undefined, format: ChartValueFormat | string = 'compact'): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–'
  switch (format) {
    case 'number': return idNumber(2).format(v)
    case 'rupiah': return `${v < 0 ? '-' : ''}Rp${idNumber(0).format(Math.abs(v))}`
    case 'rupiah-compact': return `${v < 0 ? '-' : ''}Rp${compact(Math.abs(v))}`
    case 'percent': return `${idNumber(2).format(v)}%`
    default: return compact(v)
  }
}

/** Sample figures for a chart with no data chosen yet, so a preview shows a shape rather than a hole. */
export const SAMPLE_CHART: ChartData = {
  labels: ['2021', '2022', '2023', '2024', '2025'],
  series: [
    { name: 'Simpanan', values: [1_200_000_000, 1_450_000_000, 1_800_000_000, 2_150_000_000, 2_600_000_000] },
    { name: 'Pinjaman', values: [950_000_000, 1_100_000_000, 1_500_000_000, 1_900_000_000, 2_300_000_000] },
  ],
}

/* --------------------------------- the record -------------------------------- */

export const DATA_SOURCE_REFRESH_OPTIONS = [
  { value: 15, label: 'Setiap 15 menit' },
  { value: 60, label: 'Setiap jam' },
  { value: 360, label: 'Setiap 6 jam' },
  { value: 1440, label: 'Sehari sekali' },
  { value: 0, label: 'Hanya saat tombol "Perbarui data" ditekan' },
] as const

/**
 * "Perbarui data sekarang" may be pressed once per this many minutes for each
 * data source. Every press reads Google Sheets and clears the website's cache,
 * and the sheet rarely changes faster than that.
 */
export const DATA_SOURCE_MANUAL_REFRESH_MINUTES = 5

/** When "Perbarui data sekarang" can next be pressed, from the last read (successful or not); null when it can be now. */
export function manualRefreshAvailableAt(last: { syncedAt?: string | Date | null; lastErrorAt?: string | Date | null }, now: Date = new Date()): Date | null {
  const times = [last.syncedAt, last.lastErrorAt].map((t) => (t ? new Date(t).getTime() : NaN)).filter((t) => !Number.isNaN(t))
  if (!times.length) return null
  const at = new Date(Math.max(...times) + DATA_SOURCE_MANUAL_REFRESH_MINUTES * 60_000)
  return at.getTime() > now.getTime() ? at : null
}

/** A range as Sheets writes it: A1:D20, A:D, or 2:40. Empty means the whole tab. */
export const SHEET_RANGE_RULE = /^(?:[A-Za-z]{1,3}\d{0,7}:[A-Za-z]{1,3}\d{0,7}|\d{1,7}:\d{1,7})$/

const sheetLocation = {
  spreadsheetUrl: z.string().trim().min(1, SHEET_LINK_ERRORS.empty).max(600)
    .refine((v) => parseSheetLink(v).ok, { message: SHEET_LINK_ERRORS.not_sheets }),
  sheetName: z.string().trim().max(200).optional().or(z.literal('')),
  sheetGid: z.string().trim().regex(/^\d{1,12}$/, 'Nomor lembar tidak valid').optional().or(z.literal('')),
  range: z.string().trim().max(40).refine((v) => !v || SHEET_RANGE_RULE.test(v), { message: 'Tulis rentang seperti A1:D20, atau kosongkan untuk seluruh lembar.' }).optional().or(z.literal('')),
  hasHeader: z.boolean().default(true),
}

/** What "Tes koneksi" sends: where to look, nothing about how to draw it. */
export const dataSourceInspectSchema = z.object(sheetLocation)

export const dataSourceSchema = z.object({
  name: z.string().trim().min(2, 'Beri nama minimal 2 huruf').max(120),
  ...sheetLocation,
  labelColumn: z.string().trim().min(1, 'Pilih kolom nama atau periode').max(200),
  valueColumns: z.array(z.string().trim().min(1).max(200)).min(1, 'Pilih paling sedikit satu kolom angka').max(CHART_MAX_SERIES, `Paling banyak ${CHART_MAX_SERIES} kolom angka`),
  refreshMinutes: z.number().int().refine((v) => DATA_SOURCE_REFRESH_OPTIONS.some((o) => o.value === v), 'Pilihan tidak valid').default(60),
  isActive: z.boolean().default(true),
})

export type DataSourceInput = z.infer<typeof dataSourceSchema>
export type DataSourceInspectInput = z.infer<typeof dataSourceInspectSchema>

/** What "Tes koneksi" answers with. */
export interface SheetInspection {
  spreadsheetId: string
  /** The spreadsheet's own title; unknown when it was read through a public link. */
  title: string | null
  access: SheetAccess
  /** Every tab, when the service account could list them; empty through a public link. */
  tabs: SheetTab[]
  sheetName: string | null
  sheetGid: string | null
  table: SheetTable
  suggestion: ChartMapping
}

/** The service account as the console may know it: who it is, never its key. */
export interface GoogleSheetsIntegration {
  configured: boolean
  clientEmail: string | null
  projectId: string | null
  updatedAt: string | null
}
