import Link from 'next/link'
import { formatRupiahShort } from '@mahendradwipurwanto/ksp-contracts'
import type { Product } from '@/lib/api'
import { Card, Pill, Icon } from './ui'
import { Media } from './ui/Media'

const perMonth = (annual?: number | null) =>
  annual != null ? `${(annual / 12).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}%` : null

const tenorRange = (options: number[]) =>
  options.length ? `${Math.min(...options)}–${Math.max(...options)} bln` : null

const plafonRange = (min?: number | null, max?: number | null) =>
  min != null && max != null ? `${formatRupiahShort(min)}–${formatRupiahShort(max)}` : null

/** The two figures a member actually shops on, ruled like a terms table. */
function Terms({ product, tone = 'light' }: { product: Product; tone?: 'light' | 'dark' }) {
  const rows = [
    ['Plafon', plafonRange(product.minAmount, product.maxAmount)],
    ['Tenor', tenorRange(product.tenorOptions)],
    ['Bunga', perMonth(product.ratePercent) ? `${perMonth(product.ratePercent)} / bulan` : null],
  ].filter(([, v]) => v) as [string, string][]

  if (!rows.length) return null

  const dark = tone === 'dark'
  return (
    <dl className={`tnum grid gap-x-5 gap-y-2 ${rows.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? 'text-white/60' : 'text-slate-400'}`}>
            {label}
          </dt>
          <dd className={`mt-0.5 text-[13px] font-bold ${dark ? 'text-white' : 'text-navy-800'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Product card. Two shapes from one component, chosen by whether the koperasi
 * has uploaded brochure artwork yet:
 *
 *   · with artwork — the poster the approved design calls for, terms rising
 *     over the image on hover;
 *   · without artwork — a terms card, because a 4:3 placeholder panel is a
 *     large piece of nothing and the plafon and tenor are what members compare.
 *
 * Either way the terms are in the markup at rest, not hover-only: a hover
 * overlay is unreachable on a phone, which is where most of this traffic is.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/produk/${product.category}/${product.slug}`
  const hasArtwork = Boolean(product.image)
  const kind = product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'

  return (
    <Card as="li" hover className="group/card relative flex flex-col overflow-hidden">
      {/* Gold seam on hover — the same device as the stats and feature cards. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-gold-300 via-gold-200 to-transparent transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/card:scale-x-100"
      />

      <div className="flex items-center gap-2.5 px-5 pb-3 pt-4">
        <span aria-hidden="true" className="h-4 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-green-400 to-green-600" />
        <h3 className="min-w-0 flex-1 text-[14px] font-bold text-green-600">
          <Link href={href} className="after:absolute after:inset-0 hover:text-green-700">
            {product.name}
          </Link>
        </h3>
        <Pill tone={product.category === 'pinjaman' ? 'gold' : 'green'}>{kind}</Pill>
      </div>

      {hasArtwork ? (
        <div className="relative shadow-[inset_0_1px_0_rgb(31_42_68/0.06)]">
          <Media
            src={product.image}
            alt={`Brosur produk ${product.name}`}
            ratio="4/3"
            priority={priority}
            rounded={false}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-navy-900/94 via-navy-900/72 to-transparent p-4 pt-12 opacity-0 transition-all duration-300 [transition-timing-function:var(--ease-settle)] group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
            <Terms product={product} tone="dark" />
            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-white">
              Selengkapnya
              <Icon.arrow className="size-4" />
            </p>
          </div>
        </div>
      ) : null}

      <div className={`flex flex-1 flex-col px-5 pb-5 ${hasArtwork ? 'pt-4' : 'pt-1'}`}>
        {product.tagline ? (
          <p className="text-[15px] font-semibold leading-snug text-navy-800">{product.tagline}</p>
        ) : null}
        {!hasArtwork && product.summary ? (
          <p className="clamp-2 mt-2 text-[13.5px] leading-relaxed text-slate-500">{product.summary}</p>
        ) : null}

        {!hasArtwork ? (
          <div className="mt-5 border-t border-line pt-4">
            <Terms product={product} />
          </div>
        ) : null}

        <p className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-semibold text-green-700">
          Selengkapnya
          <Icon.arrow className="size-4 transition-transform duration-300 group-hover/card:translate-x-1" />
        </p>
      </div>
    </Card>
  )
}

/** Compact row with full terms, used on the product index pages. */
export function ProductRow({ product, index }: { product: Product; index: number }) {
  const href = `/produk/${product.category}/${product.slug}`
  const rate = perMonth(product.ratePercent)
  const plafon = plafonRange(product.minAmount, product.maxAmount)
  const tenor = tenorRange(product.tenorOptions)

  return (
    <li className="group/row">
      <Link href={href} className="surface surface-i flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        {product.image ? (
          <span className="w-full shrink-0 overflow-hidden rounded-[var(--radius-tile)] sm:w-40">
            <Media src={product.image} alt="" ratio="4/3" rounded={false} sizes="160px" />
          </span>
        ) : (
          /* No artwork: an index numeral keeps the row's left edge deliberate
             rather than leaving a placeholder panel standing in for nothing. */
          <span
            aria-hidden="true"
            className="tnum hidden size-12 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-gradient-to-b from-green-50 to-[#e8f0e2] text-[15px] font-extrabold text-green-600 shadow-[var(--edge-top)] ring-1 ring-inset ring-green-100 sm:grid"
          >
            {String(index).padStart(2, '0')}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={product.category === 'pinjaman' ? 'gold' : 'green'}>
              {product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'}
            </Pill>
            {rate ? <span className="tnum text-[12.5px] font-semibold text-slate-400">{rate} / bulan</span> : null}
          </span>
          <span className="block text-[17px] font-bold text-navy-800 transition-colors group-hover/row:text-green-700">{product.name}</span>
          {product.tagline ? <span className="mt-1 block text-[13.5px] text-slate-500">{product.tagline}</span> : null}
        </span>

        {plafon || tenor ? (
          <span className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-2 border-t border-line pt-4 text-[13px] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {plafon ? (
              <span className="block">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Plafon</span>
                <span className="tnum mt-0.5 block font-bold text-navy-800">{plafon}</span>
              </span>
            ) : null}
            {tenor ? (
              <span className="block">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Tenor</span>
                <span className="tnum mt-0.5 block font-bold text-navy-800">{tenor}</span>
              </span>
            ) : null}
          </span>
        ) : null}

        <Icon.arrow className="hidden size-5 shrink-0 text-slate-300 transition-all group-hover/row:translate-x-1 group-hover/row:text-green-600 sm:block" />
      </Link>
    </li>
  )
}
