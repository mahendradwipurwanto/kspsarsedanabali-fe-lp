'use client'

import { useMemo, useState } from 'react'
import { calculateInstallment, formatRupiah, formatRupiahShort } from '@/contracts'
import type { Product } from '@/lib/api'
import { track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { Field, Slider, Segments, Select } from '../ui/form'

const RATE_LABELS: Record<string, string> = {
  flat: 'Bunga flat', annuity: 'Anuitas', effective: 'Efektif menurun', none: '—',
}

export function SimulationCalculator({
  products, initialProductId, disclaimer, initialAmount, initialTenor,
}: {
  products: Product[]
  initialProductId?: string
  disclaimer: string
  initialAmount?: number
  initialTenor?: number
}) {
  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? '')
  const product = products.find((p) => p.id === productId) ?? products[0]

  const min = product?.minAmount ?? 5_000_000
  const max = product?.maxAmount ?? 500_000_000
  const tenors = product?.tenorOptions.length ? product.tenorOptions : [12, 24, 36, 48]

  const [amount, setAmount] = useState(initialAmount ?? Math.min(Math.max(75_000_000, min), max))
  const [tenor, setTenor] = useState(initialTenor ?? tenors[Math.min(2, tenors.length - 1)]!)

  const clamped = Math.min(Math.max(amount, min), max)

  // A signed-off rate is used as published. Otherwise fall back to the figure on
  // record — the koperasi's own brochure number — and say so, because a
  // calculator that shows nothing helps nobody and the alternative is a visitor
  // guessing. `estimated` drives the notice.
  const rate = product?.ratePercent ?? product?.ratePercentIndicative ?? null
  const method = product?.ratePercent != null
    ? product.rateMethod
    : (product?.rateMethodIndicative ?? 'none')
  const estimated = product != null && product.ratePercent == null && rate != null

  const result = useMemo(() => {
    if (!rate) return null
    return calculateInstallment({ principal: clamped, annualRatePercent: rate, months: tenor, method })
  }, [rate, method, clamped, tenor])

  if (!product) return null

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      {/* ── Inputs ── */}
      <div className="surface p-6 sm:p-8">
        <div className="grid gap-8">
          <Field label="Produk pinjaman" htmlFor="sim-product" required hint={product.rateNote ?? undefined}>
            <Select
              id="sim-product"
              value={productId}
              options={products.map((p) => ({ value: p.id, label: p.name, hint: p.tagline ?? undefined }))}
              onChange={(next) => {
                const chosen = products.find((p) => p.id === next)
                setProductId(next)
                if (chosen) {
                  setAmount((a) => Math.min(Math.max(a, chosen.minAmount ?? 0), chosen.maxAmount ?? a))
                  if (chosen.tenorOptions.length && !chosen.tenorOptions.includes(tenor)) setTenor(chosen.tenorOptions[0]!)
                }
                track('simulation_change', { productId: next })
              }}
            />
          </Field>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <label htmlFor="sim-amount" className="text-[13px] font-semibold text-ink-700">
                Nominal pinjaman
              </label>
            </div>
            <output htmlFor="sim-amount" className="figure block text-[clamp(1.8rem,1.35rem+1.7vw,2.4rem)] text-ink-900">
              {formatRupiah(clamped)}
            </output>
            <Slider
              id="sim-amount"
              min={min}
              max={max}
              step={Math.max(1_000_000, Math.round((max - min) / 200 / 1_000_000) * 1_000_000)}
              value={clamped}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-describedby="sim-range"
            />
            <p id="sim-range" className="tnum flex justify-between text-[12px] text-ink-400">
              <span>{formatRupiahShort(min)}</span>
              <span>{formatRupiahShort(max)}</span>
            </p>
          </div>

          <div>
            <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
            <Segments
              options={tenors}
              value={tenor}
              suffix=" bln"
              ariaLabel="Jangka waktu angsuran"
              onChange={(t) => { setTenor(t); track('simulation_change', { tenor: t }) }}
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
          <span className="tnum text-[12px] font-medium text-white/45">
            {RATE_LABELS[method] ?? '—'}
          </span>
        </div>

        <p className="relative mt-7 text-[13px] text-white/60">Angsuran per bulan</p>
        <p className="figure relative mt-1.5 text-[clamp(2rem,1.4rem+2.4vw,2.9rem)] text-white">
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
              ['Jangka waktu', `${tenor} bulan`],
              ['Total bunga', formatRupiah(result.totalInterest)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/15 py-3">
                <dt className="text-white/55">{k}</dt>
                <dd className="font-semibold text-white">{v}</dd>
              </div>
            ))}
            {/* The bottom line, ruled off the way a total is on paper. */}
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-double border-white/30 py-4">
              <dt className="text-[13px] font-semibold text-white/80">Total dibayar</dt>
              <dd className="figure text-[19px] text-gold-300">{formatRupiah(result.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="relative mt-6 text-[14px] leading-relaxed text-white/60">
            Produk ini tidak memakai perhitungan angsuran. Hubungi kami untuk penjelasan.
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

        <p className="relative mt-6 border-t border-white/15 pt-5 text-[12px] leading-relaxed text-white/45">
          *{disclaimer}
        </p>
      </div>
    </div>
  )
}
