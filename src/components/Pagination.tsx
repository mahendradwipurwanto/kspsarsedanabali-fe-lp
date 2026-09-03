import Link from 'next/link'
import { Icon } from './ui'

/**
 * Every page is a real crawlable link with a self-referencing canonical —
 * `noindex` on page 2+ would orphan older posts from the index.
 */
export function Pagination({ page, totalPages, basePath }: { page: number; totalPages: number; basePath: string }) {
  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`)

  const window = 1
  const pages: (number | 'gap')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) pages.push(i)
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
  }

  const edge = 'inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-input)] border border-line bg-white px-4 text-[13px] font-semibold text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900'

  return (
    <nav aria-label="Navigasi halaman" className="mt-12">
      <div className="flex items-center justify-between gap-4">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={edge}>
            <Icon.arrow className="size-4 rotate-180" />
            Sebelumnya
          </Link>
        ) : <span />}

        <ol className="tnum flex items-center gap-1">
          {pages.map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1.5 text-ink-300">···</li>
            ) : (
              <li key={p}>
                <Link
                  href={href(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`grid size-10 place-items-center rounded-[var(--radius-input)] text-[14px] font-semibold transition-colors ${
                    p === page ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper hover:text-ink-900'
                  }`}
                >
                  {p}
                </Link>
              </li>
            ),
          )}
        </ol>

        {page < totalPages ? (
          <Link href={href(page + 1)} rel="next" className={edge}>
            Berikutnya
            <Icon.arrow className="size-4" />
          </Link>
        ) : <span />}
      </div>
    </nav>
  )
}
