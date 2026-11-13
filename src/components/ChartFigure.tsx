import type { ReactNode } from 'react'
import { CHART_MAX_SLICES, formatChartValue, type ChartData } from '@/contracts'
import { DataChart } from './interactive/DataChart'
import { Icon } from './ui'

/*
 * A chart as a page of a report shows it: the one figure a reader should take
 * away, set large beside the chart it comes from, and a line underneath saying
 * how fresh the numbers are.
 *
 * The figure is worked out here from the data alone, so an editor who links a
 * spreadsheet gets it without writing anything, and it can never disagree with
 * the chart next to it.
 */

interface Highlight {
  /** What kind of figure this is: "Porsi terbesar", "Angka terbaru". */
  kicker: string
  figure: string
  /** What the figure belongs to: the slice, or the series and its period. */
  name: string
  detail?: string
  facts: { label: string; value: string; note?: string }[]
}

const pct = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

/** Years, months, quarters, dates: labels that run in time, where "the latest" is the figure that matters. */
const TIMELIKE = /^(?:\d{4}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?(?:\s.*)?|.*\b(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*\b.*|.*\b(?:tahun|triwulan|semester|kuartal|q[1-4]|tw\s?[1-4])\b.*|.*\b(?:19|20)\d{2}\b.*)$/i

const lastFilled = (values: (number | null)[], before = values.length) => {
  for (let i = before - 1; i >= 0; i--) if (values[i] !== null && values[i] !== undefined) return i
  return -1
}

/** The reading of a chart that deserves the large type, or null when there is nothing honest to single out. */
export function chartHighlight(chart: ChartData, type: string, format: string): Highlight | null {
  const first = chart.series[0]
  if (!first || !chart.labels.length) return null
  const fmt = (v: number | null | undefined) => formatChartValue(v, format)
  const full = (v: number | null | undefined) => formatChartValue(v, format === 'compact' ? 'number' : format === 'rupiah-compact' ? 'rupiah' : format)

  if (type === 'pie' || type === 'donut') {
    const parts = chart.labels.map((name, i) => ({ name, value: first.values[i] ?? 0 })).filter((p) => p.value > 0)
    const total = parts.reduce((sum, p) => sum + p.value, 0)
    if (!total || parts.length < 2) return null
    const top = parts.reduce((a, b) => (b.value > a.value ? b : a))
    return {
      kicker: 'Porsi terbesar',
      figure: `${pct.format((top.value / total) * 100)}%`,
      name: top.name,
      detail: `${full(top.value)} dari ${full(total)}`,
      facts: [
        { label: 'Total', value: full(total) },
        { label: 'Jumlah kategori', value: String(parts.length), note: parts.length > CHART_MAX_SLICES ? `${CHART_MAX_SLICES - 1} terbesar digambar sendiri` : undefined },
      ],
    }
  }

  const at = lastFilled(first.values)
  if (at < 0) return null
  const inTime = chart.labels.length > 1 && TIMELIKE.test(chart.labels[0]!.trim()) && TIMELIKE.test(chart.labels[chart.labels.length - 1]!.trim())
  const filled = first.values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null && p.v !== undefined)
  const high = filled.reduce((a, b) => (b.v > a.v ? b : a))
  const low = filled.reduce((a, b) => (b.v < a.v ? b : a))

  if (inTime) {
    const latest = first.values[at] as number
    const prevAt = lastFilled(first.values, at)
    const prev = prevAt >= 0 ? (first.values[prevAt] as number) : null
    // "Naik" and "turun", never good or bad: a falling figure is good news for some of them.
    const change = prev === null || prev === 0
      ? undefined
      : latest === prev
        ? `Sama dengan ${chart.labels[prevAt]}`
        : `${latest > prev ? 'Naik' : 'Turun'} ${pct.format(Math.abs((latest - prev) / prev) * 100)}% dari ${chart.labels[prevAt]}`
    const others = chart.series.slice(1, 4)
      .filter((s) => s.values[at] !== null && s.values[at] !== undefined)
      .map((s) => ({ label: s.name, value: fmt(s.values[at]) }))
    return {
      kicker: `Angka terbaru, ${chart.labels[at]}`,
      figure: fmt(latest),
      name: first.name,
      detail: change,
      facts: others.length
        ? others
        : filled.length > 2
          ? [{ label: 'Tertinggi', value: fmt(high.v), note: chart.labels[high.i] }, { label: 'Terendah', value: fmt(low.v), note: chart.labels[low.i] }]
          : [],
    }
  }

  if (chart.series.length > 1 || filled.length < 2) return null
  const total = filled.reduce((sum, p) => sum + p.v, 0)
  const allPositive = filled.every((p) => p.v >= 0) && total > 0
  return {
    kicker: 'Tertinggi',
    figure: fmt(high.v),
    name: chart.labels[high.i]!,
    detail: allPositive ? `${pct.format((high.v / total) * 100)}% dari seluruhnya` : first.name,
    facts: [
      ...(allPositive ? [{ label: 'Total', value: fmt(total) }] : []),
      { label: 'Terendah', value: fmt(low.v), note: chart.labels[low.i] },
    ],
  }
}

export function ChartFigure({
  chart, type, format, showSummary = true, showValues, showLegend, showTable, height, title, updated, note, notice,
}: {
  chart: ChartData
  type: string
  format: string
  showSummary?: boolean
  showValues?: boolean
  showLegend?: boolean
  showTable?: boolean
  height?: string
  title?: string
  /** "13 November 2026": when the figures were last read from the sheet. */
  updated?: string
  /** The editor's own footnote: a source, a definition, a caveat. */
  note?: ReactNode
  /** Shown above the chart in a draft that is drawing sample figures. */
  notice?: ReactNode
}) {
  const highlight = showSummary ? chartHighlight(chart, type, format) : null
  const round = type === 'pie' || type === 'donut'

  return (
    <div className="surface overflow-hidden">
      <div className={highlight ? 'grid lg:grid-cols-[minmax(0,19.5rem)_minmax(0,1fr)]' : ''}>
        {highlight ? (
          // The site's dark instrument panel, as on the hero: the reading in
          // gold, what it measures in white, the supporting figures on hairlines.
          <div className="grid-dark flex flex-col bg-night-900 px-6 py-7 text-white sm:px-8 sm:py-8 lg:py-10">
            <p className="text-[13px] font-semibold text-white/60">{highlight.kicker}</p>
            <p className="figure mt-4 break-words text-[2.75rem] text-gold-300 sm:text-[3.25rem]">{highlight.figure}</p>
            <p className="mt-4 line-clamp-3 text-[1.0625rem] font-bold leading-snug">{highlight.name}</p>
            {highlight.detail ? <p className="tnum mt-1.5 text-[13.5px] leading-relaxed text-white/65">{highlight.detail}</p> : null}

            {highlight.facts.length ? (
              <dl className="mt-8 lg:mt-auto lg:pt-10">
                {highlight.facts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-4 border-t border-white/12 py-3 last:pb-0">
                    <dt className="min-w-0 truncate text-[13px] text-white/60">{fact.label}</dt>
                    <dd className="tnum shrink-0 text-right text-[14.5px] font-bold">
                      {fact.value}
                      {fact.note ? <span className="ml-2 text-[12px] font-medium text-white/50">{fact.note}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        {/* Centred against the panel, which is often the taller of the two. */}
        <div className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 lg:flex lg:flex-col lg:justify-center lg:px-10 ${round ? 'lg:py-10' : 'lg:py-9'}`}>
          {notice}
          <DataChart
            data={chart}
            type={type}
            format={format}
            showValues={showValues}
            showLegend={showLegend}
            showTable={showTable}
            height={height}
            title={title}
          />
        </div>
      </div>

      {note || updated ? (
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 border-t border-line bg-paper px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-500 sm:px-8 lg:px-10">
          <div className="min-w-0 max-w-[80ch]">{note}</div>
          {updated ? (
            <p className="flex shrink-0 items-center gap-1.5">
              <Icon.clock className="size-3.5 text-ink-400" />
              Data diperbarui {updated}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
