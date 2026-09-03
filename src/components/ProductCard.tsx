import Link from 'next/link'
import { formatRupiahShort } from '@/contracts'
import type { Product } from '@/lib/api'
import { Card, Pill, Icon } from './ui'
import { Media } from './ui/Media'

const perMonth = (annual?: number | null) =>
  annual != null ? `${(annual / 12).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}%` : null

const tenorRange = (options: number[]) =>
  options.length ? `${Math.min(...options)}–${Math.max(...options)} bln` : null

const plafonRange = (min?: number | null, max?: number | null) =>
  min != null && max != null ? `${formatRupiahShort(min)}–${formatRupiahShort(max)}` : null

/** The figures a member actually shops on, set like a terms table. */
function Terms({ product, tone = 'light' }: { product: Product; tone?: 'light' | 'dark' }) {
  const rate = perMonth(product.ratePercent)
  const rows = [
    ['Bunga', rate ? `${rate} / bln` : null],
    ['Plafon', plafonRange(product.minAmount, product.maxAmount)],
    ['Jangka waktu', tenorRange(product.tenorOptions)],
  ].filter(([, v]) => v) as [string, string][]

  if (!rows.length) return null
  const dark = tone === 'dark'
  return (
    <dl className={`tnum grid gap-x-4 gap-y-2.5 ${rows.length > 2 ? 'grid-cols-3' : rows.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className={`text-[11.5px] font-medium ${dark ? 'text-white/55' : 'text-ink-400'}`}>{label}</dt>
          <dd className={`mt-0.5 truncate text-[13.5px] font-bold ${dark ? 'text-white' : 'text-ink-900'} ${label === 'Bunga' ? (dark ? '!text-gold-300' : '!text-green-700') : ''}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Product card. Two shapes from one component, chosen by whether the koperasi
 * has uploaded brochure artwork yet: a poster with terms rising on hover, or
 * a terms card, since the plafon and term are what members compare. Terms are
 * in the markup at rest either way: hover is unreachable on a phone.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/produk/${product.category}/${product.slug}`
  const hasArtwork = Boolean(product.image)
  const kind = product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'

  return (
    <Card as="li" hover className="group/card relative flex flex-col overflow-hidden">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-gold-300 via-gold-200 to-transparent transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/card:scale-x-100"
      />

      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <h3 className="min-w-0 flex-1 text-[16px] font-bold leading-snug text-ink-900">
          <Link href={href} className="transition-colors after:absolute after:inset-0 hover:text-green-700">
            {product.name}
          </Link>
        </h3>
        <Pill tone={product.category === 'pinjaman' ? 'gold' : 'green'}>{kind}</Pill>
      </div>

      {hasArtwork ? (
        <div className="relative border-t border-line">
          <Media
            src={product.image}
            alt={`Brosur produk ${product.name}`}
            ratio="4/3"
            priority={priority}
            rounded={false}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink-900/95 via-ink-900/75 to-transparent p-4 pt-12 opacity-0 transition-all duration-300 [transition-timing-function:var(--ease-settle)] group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
            <Terms product={product} tone="dark" />
          </div>
        </div>
      ) : null}

      <div className={`flex flex-1 flex-col px-5 pb-5 ${hasArtwork ? 'pt-4' : 'pt-0'}`}>
        {product.tagline ? (
          <p className="text-[14px] leading-snug text-ink-600">{product.tagline}</p>
        ) : null}
        {!hasArtwork && product.summary ? (
          <p className="clamp-2 mt-2 text-[13.5px] leading-relaxed text-ink-500">{product.summary}</p>
        ) : null}

        {!hasArtwork ? (
          <div className="mt-5 border-t border-line pt-4">
            <Terms product={product} />
          </div>
        ) : null}

        {!product.isVerified && product.category === 'pinjaman' ? (
          <p className="mt-3 text-[11.5px] text-ink-400">Suku bunga menunggu verifikasi pengurus.</p>
        ) : null}

        <p className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-semibold text-green-700">
          Lihat detail
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
          <span
            aria-hidden="true"
            className="tnum hidden size-12 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-[14px] font-extrabold text-gold-300 sm:grid"
          >
            {String(index).padStart(2, '0')}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={product.category === 'pinjaman' ? 'gold' : 'green'}>
              {product.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'}
            </Pill>
            {rate ? <span className="tnum text-[12.5px] font-semibold text-green-700">{rate} / bln</span> : null}
          </span>
          <span className="block text-[17px] font-bold text-ink-900 transition-colors group-hover/row:text-green-700">{product.name}</span>
          {product.tagline ? <span className="mt-1 block text-[13.5px] text-ink-500">{product.tagline}</span> : null}
        </span>

        {plafon || tenor ? (
          <span className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-2 border-t border-line pt-4 text-[13px] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {plafon ? (
              <span className="block">
                <span className="block text-[11.5px] font-medium text-ink-400">Plafon</span>
                <span className="tnum mt-0.5 block font-bold text-ink-900">{plafon}</span>
              </span>
            ) : null}
            {tenor ? (
              <span className="block">
                <span className="block text-[11.5px] font-medium text-ink-400">Jangka waktu</span>
                <span className="tnum mt-0.5 block font-bold text-ink-900">{tenor}</span>
              </span>
            ) : null}
          </span>
        ) : null}

        <Icon.arrow className="hidden size-5 shrink-0 text-ink-300 transition-all group-hover/row:translate-x-1 group-hover/row:text-green-600 sm:block" />
      </Link>
    </li>
  )
}
