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

  return (
    <nav aria-label="Navigasi halaman" className="mt-12">
      <div className="flex items-center justify-between gap-4">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:border-green-300 hover:text-green-700">
            <Icon.arrow className="size-4 rotate-180" />
            Sebelumnya
          </Link>
        ) : <span />}

        <ol className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1.5 text-slate-300">···</li>
            ) : (
              <li key={p}>
                <Link
                  href={href(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`tnum grid size-10 place-items-center rounded-full text-[14px] font-semibold transition-colors ${
                    p === page
                      ? 'bg-green-600 text-white shadow-[0_2px_8px_-2px_rgb(78_139_44/0.45)]'
                      : 'text-slate-500 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {p}
                </Link>
              </li>
            ),
          )}
        </ol>

        {page < totalPages ? (
          <Link href={href(page + 1)} rel="next"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:border-green-300 hover:text-green-700">
            Berikutnya
            <Icon.arrow className="size-4" />
          </Link>
        ) : <span />}
      </div>
    </nav>
  )
}
