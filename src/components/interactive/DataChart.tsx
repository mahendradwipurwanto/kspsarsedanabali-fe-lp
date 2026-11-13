'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CHART_COLORS, CHART_COLOR_OTHER, CHART_MAX_SLICES, formatChartValue, niceScale,
  type ChartData, type ChartSeries, type ChartType, type ChartValueFormat,
} from '@/contracts'

/**
 * A chart drawn from a spreadsheet's figures.
 *
 * The same file lives in the website and in the console, so the preview an
 * editor sees while choosing columns is the chart a visitor gets. It draws
 * plain SVG at the width it is given: no charting library to ship to a phone
 * for the sake of five bars.
 *
 * Reading order of the rules it follows: marks are thin and the grid recedes;
 * text is always ink, never a series colour, so a pale series stays legible;
 * two or more series always get a legend; and the figures are also there as a
 * table for a screen reader, whatever the picture shows.
 */

const INK = '#0f1b2d'
const MUTED = '#5b6b82'
const GRID = '#e6e9ee'
const AXIS = '#c4ccd5'
const SURFACE = '#ffffff'

const HEIGHTS = { short: 260, standard: 340, tall: 440 } as const
export type ChartHeight = keyof typeof HEIGHTS

/** Close enough to the rendered width to decide what fits, without measuring every label. */
const textWidth = (text: string, size = 11.5) => text.length * size * 0.57
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)
const colorAt = (i: number) => CHART_COLORS[i] ?? CHART_COLOR_OTHER
const share = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

/** Axis ticks stay short even when the values themselves are written in full. */
const axisFormat = (format: string) => (format === 'rupiah' ? 'rupiah-compact' : format === 'number' ? 'compact' : format)

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(Math.max(240, Math.round(el.clientWidth)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

interface ChartProps {
  data: ChartData
  type?: ChartType | string
  format?: ChartValueFormat | string
  showValues?: boolean
  showLegend?: boolean
  height?: ChartHeight | string
  /** Names the chart for a screen reader and captions its table. */
  title?: string
  /** Show the figures as a table under the chart, not only to screen readers. */
  showTable?: boolean
}

export function DataChart({
  data, type = 'bar', format = 'compact', showValues = true, showLegend = true, height = 'standard', title, showTable = false,
}: ChartProps) {
  const series = data.series.slice(0, CHART_COLORS.length)
  if (!data.labels.length || !series.length) return null

  const round = type === 'pie' || type === 'donut'
  const tall = HEIGHTS[height as ChartHeight] ?? HEIGHTS.standard
  const label = title || series.map((s) => s.name).join(', ')

  return (
    <figure className="m-0 min-w-0">
      {round ? (
        <RoundChart labels={data.labels} series={series[0]!} donut={type === 'donut'} format={format} showLegend={showLegend} label={label} />
      ) : type === 'bar-horizontal' ? (
        <HorizontalBars labels={data.labels} series={series} format={format} showValues={showValues} label={label} />
      ) : (
        <AxisChart labels={data.labels} series={series} kind={type === 'line' || type === 'area' ? type : 'bar'} format={format} showValues={showValues} height={tall} label={label} />
      )}

      {!round && showLegend && series.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2 text-[12.5px] font-medium text-ink-600">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colorAt(i) }} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}

      {/* The figures themselves: read out by a screen reader and by a search
          engine whatever the picture looks like, and shown when asked for. */}
      <div className={showTable ? 'mt-6 overflow-x-auto' : 'sr-only'}>
        <table className="w-full min-w-[320px] border-collapse text-left text-[13px]">
          {title ? <caption className="sr-only">{title}</caption> : null}
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pr-4 font-semibold text-ink-500">&nbsp;</th>
              {series.map((s) => <th key={s.name} scope="col" className="py-2 pl-4 text-right font-semibold text-ink-500">{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.labels.map((row, i) => (
              <tr key={`${row}-${i}`} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-4 font-medium text-ink-800">{row}</th>
                {series.map((s) => (
                  <td key={s.name} className="py-2 pl-4 text-right text-ink-700 [font-variant-numeric:tabular-nums]">
                    {formatChartValue(s.values[i], format === 'compact' ? 'number' : format === 'rupiah-compact' ? 'rupiah' : format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

/* ─────────────────────────────── tooltip ─────────────────────────────── */

function Tip({ x, y, flip, heading, rows }: { x: number; y: number; flip: boolean; heading: string; rows: { color: string; name: string; value: string }[] }) {
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 min-w-[120px] max-w-[240px] rounded-[8px] border border-line bg-white px-3 py-2 shadow-[0_8px_24px_-12px_rgb(15_27_45/0.35)]"
      style={{ left: x, top: y, transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, 0)` }}
    >
      <p className="text-[12px] font-bold text-ink-900">{heading}</p>
      <ul className="mt-1 grid gap-0.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-[12px] text-ink-600">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ background: row.color }} />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="font-semibold text-ink-900 [font-variant-numeric:tabular-nums]">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────────────── bars, lines and areas ──────────────────────── */

function AxisChart({
  labels, series, kind, format, showValues, height, label,
}: { labels: string[]; series: ChartSeries[]; kind: 'bar' | 'line' | 'area'; format: string; showValues: boolean; height: number; label: string }) {
  const [ref, W] = useWidth()
  const [active, setActive] = useState<number | null>(null)

  const n = labels.length
  const k = series.length
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  const scale = niceScale(Math.min(...all), Math.max(...all))
  const ticks = scale.ticks.map((t) => ({ value: t, text: formatChartValue(t, axisFormat(format)) }))

  const top = 24
  const bottom = 30
  const plotH = height - top - bottom
  const y = (v: number) => top + plotH * (1 - (v - scale.min) / (scale.max - scale.min))
  const zero = y(0)

  // A line's last value is written at its end, but only while the ends stay
  // apart: labels nudged off their lines read as noise, and the legend and the
  // tooltip already carry every figure.
  const ends = series.map((s) => {
    let at = -1
    for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] !== null && s.values[i] !== undefined) { at = i; break }
    return at < 0 ? null : { at, value: s.values[at] as number, text: formatChartValue(s.values[at], format) }
  })
  const endYs = ends.filter((e): e is NonNullable<typeof e> => !!e).map((e) => y(e.value)).sort((a, b) => a - b)
  const endsClear = endYs.every((v, i) => i === 0 || v - endYs[i - 1]! >= 15)
  const endLabels = kind !== 'bar' && showValues && k <= 4 && endsClear && W >= 420

  const left = Math.ceil(Math.max(...ticks.map((t) => textWidth(t.text)))) + 10
  const right = endLabels ? Math.ceil(Math.max(...ends.map((e) => (e ? textWidth(e.text, 12) : 0)))) + 14 : 12
  const plotW = Math.max(40, W - left - right)
  const band = plotW / n
  const x = (i: number) => left + band * (i + 0.5)

  const gap = 2
  const barW = Math.max(2, Math.min(24, (band * 0.72 - gap * (k - 1)) / k))
  const groupW = barW * k + gap * (k - 1)

  // Names along the bottom: every one while they fit side by side, then every second, third…
  const widest = Math.max(...labels.map((l) => textWidth(clip(l, 14))))
  const every = Math.max(1, Math.ceil((widest + 12) / band))

  // A figure on each bar only where one series leaves room for it.
  const capLabels = kind === 'bar' && showValues && k === 1 && n <= 16
    && series[0]!.values.every((v) => v === null || textWidth(formatChartValue(v, format), 11.5) + 6 <= band)
  const markers = kind !== 'bar' && n <= 24

  const bar = (i: number, j: number, v: number): ReactNode => {
    const bx = x(i) - groupW / 2 + j * (barW + gap)
    const tip = y(v)
    const h = Math.abs(tip - zero)
    if (h < 0.5) return null
    const r = Math.min(4, barW / 2, h)
    const dir = v >= 0 ? 1 : -1
    // Rounded at the data end only; the baseline end stays square.
    const d = `M${bx},${zero}V${tip + dir * r}Q${bx},${tip} ${bx + r},${tip}H${bx + barW - r}Q${bx + barW},${tip} ${bx + barW},${tip + dir * r}V${zero}Z`
    return <path key={`${i}-${j}`} d={d} fill={colorAt(j)} />
  }

  /** A line broken wherever the sheet has no figure, rather than drawn through a gap as if it were zero. */
  const runs = (s: ChartSeries) => {
    const out: { i: number; v: number }[][] = []
    let run: { i: number; v: number }[] = []
    s.values.forEach((v, i) => {
      if (v === null || v === undefined) { if (run.length) out.push(run); run = [] } else run.push({ i, v })
    })
    if (run.length) out.push(run)
    return out
  }

  return (
    <div ref={ref} className="relative w-full touch-pan-y" onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={label} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t.value}>
            <line x1={left} x2={left + plotW} y1={y(t.value)} y2={y(t.value)} stroke={t.value === 0 ? AXIS : GRID} strokeWidth={1} />
            <text x={left - 8} y={y(t.value) + 4} textAnchor="end" fontSize={11.5} fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{t.text}</text>
          </g>
        ))}

        {active !== null ? (
          kind === 'bar'
            ? <rect x={left + band * active} y={top} width={band} height={plotH} fill={INK} opacity={0.045} />
            : <line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke={AXIS} strokeWidth={1} />
        ) : null}

        {kind === 'bar'
          ? series.map((s, j) => s.values.map((v, i) => (v === null || v === undefined ? null : bar(i, j, v))))
          : series.map((s, j) => (
            <g key={s.name}>
              {runs(s).map((run, r) => {
                const path = run.map((p, q) => `${q ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join('')
                return (
                  <g key={r}>
                    {kind === 'area' ? <path d={`${path}L${x(run[run.length - 1]!.i)},${zero}L${x(run[0]!.i)},${zero}Z`} fill={colorAt(j)} opacity={0.1} /> : null}
                    <path d={path} fill="none" stroke={colorAt(j)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                )
              })}
              {s.values.map((v, i) => (v === null || v === undefined || !(markers || i === active || runs(s).some((run) => run.length === 1 && run[0]!.i === i)) ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r={i === active ? 5 : 4} fill={colorAt(j)} stroke={SURFACE} strokeWidth={2} />
              )))}
            </g>
          ))}

        {capLabels ? series[0]!.values.map((v, i) => (v === null || v === undefined ? null : (
          <text key={i} x={x(i)} y={v >= 0 ? y(v) - 7 : y(v) + 15} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={INK} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatChartValue(v, format)}
          </text>
        ))) : null}

        {endLabels ? ends.map((e, j) => (e ? (
          <text key={j} x={x(e.at) + 9} y={y(e.value) + 4} fontSize={12} fontWeight={600} fill={INK} style={{ fontVariantNumeric: 'tabular-nums' }}>{e.text}</text>
        ) : null)) : null}

        {labels.map((l, i) => (i % every === 0 ? (
          <text key={i} x={x(i)} y={height - 9} textAnchor="middle" fontSize={11.5} fill={i === active ? INK : MUTED} fontWeight={i === active ? 600 : 400}>{clip(l, 14)}</text>
        ) : null))}

        {/* One target per name, as tall as the plot: far easier to land on than a 2px line or a thin bar. */}
        {labels.map((_, i) => (
          <rect key={i} x={left + band * i} y={top} width={band} height={plotH + bottom} fill="transparent" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
        ))}
      </svg>

      {active !== null ? (
        <Tip
          x={x(active)}
          y={top}
          flip={x(active) > W / 2}
          heading={labels[active]!}
          rows={series.map((s, j) => ({ color: colorAt(j), name: s.name, value: formatChartValue(s.values[active], format) }))}
        />
      ) : null}
    </div>
  )
}

/* ──────────────────────────── horizontal bars ─────────────────────────── */

function HorizontalBars({
  labels, series, format, showValues, label,
}: { labels: string[]; series: ChartSeries[]; format: string; showValues: boolean; label: string }) {
  const [ref, W] = useWidth()
  const [active, setActive] = useState<number | null>(null)

  const n = labels.length
  const k = series.length
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  const scale = niceScale(Math.min(...all), Math.max(...all))
  const ticks = scale.ticks.map((t) => ({ value: t, text: formatChartValue(t, axisFormat(format)) }))

  const gap = 2
  const barH = k === 1 ? 16 : 11
  const rowH = barH * k + gap * (k - 1) + 14
  const top = 6
  const bottom = 26
  const height = top + rowH * n + bottom

  const nameMax = W < 480 ? 14 : 26
  const left = Math.min(Math.ceil(Math.max(...labels.map((l) => textWidth(clip(l, nameMax), 12.5)))) + 12, W * 0.45)
  const tipLabels = showValues && k === 1
  const right = tipLabels ? Math.ceil(Math.max(...series[0]!.values.map((v) => textWidth(formatChartValue(v, format), 12)))) + 12 : 14
  const plotW = Math.max(40, W - left - right)
  const x = (v: number) => left + plotW * ((v - scale.min) / (scale.max - scale.min))
  const zero = x(0)
  // Ticks along the bottom thin out before they collide.
  const tickEvery = Math.max(1, Math.ceil((Math.max(...ticks.map((t) => textWidth(t.text))) + 14) / (plotW / Math.max(1, ticks.length - 1))))

  return (
    <div ref={ref} className="relative w-full touch-pan-y" onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={label} className="block overflow-visible">
        {ticks.map((t, i) => (
          <g key={t.value}>
            <line x1={x(t.value)} x2={x(t.value)} y1={top} y2={top + rowH * n} stroke={t.value === 0 ? AXIS : GRID} strokeWidth={1} />
            {i % tickEvery === 0 ? <text x={x(t.value)} y={height - 8} textAnchor="middle" fontSize={11.5} fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{t.text}</text> : null}
          </g>
        ))}

        {labels.map((l, i) => {
          const rowTop = top + rowH * i
          return (
            <g key={i}>
              {active === i ? <rect x={0} y={rowTop} width={W} height={rowH} fill={INK} opacity={0.045} /> : null}
              <text x={left - 10} y={rowTop + rowH / 2 + 4} textAnchor="end" fontSize={12.5} fill={INK}>{clip(l, nameMax)}</text>
              {series.map((s, j) => {
                const v = s.values[i]
                if (v === null || v === undefined) return null
                const by = rowTop + 7 + j * (barH + gap)
                const tip = x(v)
                const w = Math.abs(tip - zero)
                const r = Math.min(4, barH / 2, w)
                const dir = v >= 0 ? 1 : -1
                return (
                  <g key={j}>
                    {w >= 0.5 ? <path d={`M${zero},${by}H${tip - dir * r}Q${tip},${by} ${tip},${by + r}V${by + barH - r}Q${tip},${by + barH} ${tip - dir * r},${by + barH}H${zero}Z`} fill={colorAt(j)} /> : null}
                    {tipLabels ? (
                      <text x={v >= 0 ? tip + 7 : tip - 7} y={by + barH / 2 + 4} textAnchor={v >= 0 ? 'start' : 'end'} fontSize={12} fontWeight={600} fill={INK} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatChartValue(v, format)}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              <rect x={0} y={rowTop} width={W} height={rowH} fill="transparent" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
            </g>
          )
        })}
      </svg>

      {/* With one series the figure is already at the end of each bar. */}
      {active !== null && !tipLabels ? (
        <Tip
          x={left + plotW / 2}
          y={top + rowH * active + rowH}
          flip={false}
          heading={labels[active]!}
          rows={series.map((s, j) => ({ color: colorAt(j), name: s.name, value: formatChartValue(s.values[active], format) }))}
        />
      ) : null}
    </div>
  )
}

/* ───────────────────────────── pie and donut ──────────────────────────── */

function RoundChart({
  labels, series, donut, format, showLegend, label,
}: { labels: string[]; series: ChartSeries; donut: boolean; format: string; showLegend: boolean; label: string }) {
  const [active, setActive] = useState<number | null>(null)

  // Parts of a whole: only what is above zero can be a slice.
  let slices = labels.map((name, i) => ({ name, value: series.values[i] ?? 0 })).filter((s) => s.value > 0)
  if (slices.length > CHART_MAX_SLICES) {
    // Past the palette, the smallest shares are told as one rather than given a colour nobody could tell apart.
    const ranked = [...slices].sort((a, b) => b.value - a.value)
    const kept = ranked.slice(0, CHART_MAX_SLICES - 1)
    slices = [...slices.filter((s) => kept.includes(s)), { name: 'Lainnya', value: ranked.slice(CHART_MAX_SLICES - 1).reduce((sum, s) => sum + s.value, 0) }]
  }
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (!total) return <p className="text-[13.5px] text-ink-500">Diagram lingkaran membutuhkan angka di atas nol.</p>

  const folded = slices.length === CHART_MAX_SLICES && slices[slices.length - 1]!.name === 'Lainnya' && labels.length > CHART_MAX_SLICES
  const color = (i: number) => (folded && i === slices.length - 1 ? CHART_COLOR_OTHER : colorAt(i))

  const R = 100
  const inner = donut ? 62 : 0
  const point = (angle: number, radius: number) => `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`
  let from = -Math.PI / 2
  const arcs = slices.map((s) => {
    const sweep = (s.value / total) * Math.PI * 2
    const to = from + sweep
    const large = sweep > Math.PI ? 1 : 0
    const d = inner
      ? `M${point(from, R)}A${R},${R} 0 ${large} 1 ${point(to, R)}L${point(to, inner)}A${inner},${inner} 0 ${large} 0 ${point(from, inner)}Z`
      : `M0,0L${point(from, R)}A${R},${R} 0 ${large} 1 ${point(to, R)}Z`
    from = to
    return d
  })

  return (
    <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:gap-9 lg:gap-12" onPointerLeave={() => setActive(null)}>
      <svg viewBox="-104 -104 208 208" role="img" aria-label={label} className="block w-full max-w-[240px] shrink-0 lg:max-w-[272px]">
        {slices.length === 1 ? (
          <>
            <circle r={R} fill={color(0)} />
            {inner ? <circle r={inner} fill={SURFACE} /> : null}
          </>
        ) : arcs.map((d, i) => (
          // The white line between slices is a gap in the surface colour, not an outline.
          <path key={i} d={d} fill={color(i)} stroke={SURFACE} strokeWidth={2} strokeLinejoin="round" opacity={active === null || active === i ? 1 : 0.35} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} style={{ transition: 'opacity 150ms' }} />
        ))}
        {donut ? (
          <>
            <text y={2} textAnchor="middle" fontSize={25} fontWeight={800} fill={INK} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
              {formatChartValue(active === null ? total : slices[active]!.value, axisFormat(format))}
            </text>
            <text y={20} textAnchor="middle" fontSize={10.5} fontWeight={500} fill={MUTED}>{clip(active === null ? 'Total' : slices[active]!.name, 20)}</text>
          </>
        ) : null}
      </svg>

      {/* The legend is the figures' ledger: one line per part on a hairline,
          its amount and its share in columns that line up, and a bar that
          makes two small shares comparable where two thin slices are not. */}
      {showLegend ? (
        <div className="w-full min-w-0 flex-1">
          <div aria-hidden="true" className="flex items-center gap-3 border-b border-line-strong px-1.5 pb-2 text-[11.5px] font-semibold text-ink-400">
            <span className="min-w-0 flex-1">Rincian</span>
            <span className="w-[76px] shrink-0 text-right">Jumlah</span>
            <span className="w-[52px] shrink-0 text-right">Porsi</span>
          </div>
          <ul>
            {slices.map((s, i) => {
              const part = (s.value / total) * 100
              return (
                <li
                  key={i}
                  onPointerEnter={() => setActive(i)}
                  className={`border-b border-line px-1.5 py-3 transition-colors last:border-b-0 ${active === i ? 'bg-ink-50' : ''}`}
                >
                  <div className="flex items-center gap-3 text-[13.5px]">
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color(i) }} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink-800" title={s.name}>{s.name}</span>
                    <span className="w-[76px] shrink-0 text-right font-semibold text-ink-900 [font-variant-numeric:tabular-nums]">{formatChartValue(s.value, format)}</span>
                    <span className="w-[52px] shrink-0 text-right text-ink-500 [font-variant-numeric:tabular-nums]">{share.format(part)}%</span>
                  </div>
                  <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(part, 1.5)}%`, background: color(i) }} />
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-3 border-t border-line-strong px-1.5 pt-2.5 text-[13px]">
            <span className="min-w-0 flex-1 font-semibold text-ink-500">Total</span>
            <span className="w-[76px] shrink-0 text-right font-bold text-ink-900 [font-variant-numeric:tabular-nums]">{formatChartValue(total, format)}</span>
            <span className="w-[52px] shrink-0 text-right text-ink-500 [font-variant-numeric:tabular-nums]">100%</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
