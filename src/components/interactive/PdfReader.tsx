'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A PDF read inside the page, scrollable on every device.
 *
 * The browser's own viewer — an <embed>, an <object> or an iframe — shows a
 * PDF on a phone or an iPad as a single page that cannot be scrolled, which
 * is no use for a laporan tahunan attached to a form. So the pages are drawn
 * with pdf.js into an ordinary scrolling column of canvases, which behaves
 * the same on an iPad, an Android phone and a desktop.
 *
 * pdf.js is loaded only when a form actually shows a PDF, and its worker is
 * served from /pdf.worker.min.mjs (put there by scripts/copy-pdf-worker.mjs).
 * A page is drawn when it comes near the viewport and, in a long document,
 * dropped again once it is far behind, so a hundred-page report does not keep
 * a hundred canvases alive on a phone.
 *
 * The pages live in a div React never puts children into: React owns the
 * frame and the message, pdf.js owns what is inside the column.
 */

/** Drawn at the screen's own pixels, capped: past 2× a canvas costs memory without looking better. */
const MAX_DPR = 2
/** Pages past this are not drawn; a document that long is meant to be downloaded. */
const MAX_PAGES = 200
/** Below this many pages everything stays drawn, which keeps scrolling back instant. */
const KEEP_ALL_BELOW = 12

export function PdfReader({ src, label, className }: { src: string; label: string; className?: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const column = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const box = frame.current
    const pages = column.current
    if (!box || !pages) return
    let dead = false
    const stop: (() => void)[] = []

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        if (dead) return
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        // The loading task, not the document, is what closes the worker again.
        const task = pdfjs.getDocument({ url: src })
        const doc = await task.promise
        if (dead) { void task.destroy(); return }
        stop.push(() => void task.destroy())

        /** Draw one page at the width it is shown at; drawn again only when that width changes. */
        const draw = async (wrap: HTMLElement, n: number) => {
          const canvas = wrap.querySelector('canvas')
          const width = Math.floor(wrap.clientWidth)
          if (!canvas || !width || canvas.dataset.width === String(width)) return
          canvas.dataset.width = String(width)
          const page = await doc.getPage(n)
          if (dead) return
          const scale = (width / page.getViewport({ scale: 1 }).width) * Math.min(window.devicePixelRatio || 1, MAX_DPR)
          const viewport = page.getViewport({ scale })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          try {
            await page.render({ canvas, viewport }).promise
          } catch {
            // A render cancelled by a resize or by leaving the page is not a failure; let it be drawn again.
            delete canvas.dataset.width
          }
        }

        const count = Math.min(doc.numPages, MAX_PAGES)
        const watcher = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const wrap = e.target as HTMLElement
              if (e.isIntersecting) void draw(wrap, Number(wrap.dataset.page))
              else if (count > KEEP_ALL_BELOW) {
                // Far behind or far ahead: give the memory back, and draw it again on the way past.
                const canvas = wrap.querySelector('canvas')
                if (canvas?.dataset.width) { canvas.width = 0; canvas.height = 0; delete canvas.dataset.width }
              }
            }
          },
          { root: box, rootMargin: '600px 0px' },
        )
        stop.push(() => watcher.disconnect())
        stop.push(() => pages.replaceChildren())

        for (let n = 1; n <= count; n++) {
          const page = await doc.getPage(n)
          if (dead) return
          const view = page.getViewport({ scale: 1 })
          const wrap = document.createElement('div')
          wrap.dataset.page = String(n)
          wrap.className = 'w-full bg-white'
          wrap.style.aspectRatio = `${view.width} / ${view.height}`
          const canvas = document.createElement('canvas')
          canvas.className = 'block h-full w-full'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `${label} — halaman ${n} dari ${doc.numPages}`)
          wrap.append(canvas)
          pages.append(wrap)
          watcher.observe(wrap)
          if (n === 1) setStatus('ready')
        }

        // Turning the iPad, or a phone's address bar sliding away, changes the
        // width the pages were drawn at; whatever is already drawn is redrawn.
        let timer: ReturnType<typeof setTimeout> | undefined
        const sizes = new ResizeObserver(() => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            for (const wrap of Array.from(pages.children) as HTMLElement[]) {
              if (wrap.querySelector('canvas')?.dataset.width) void draw(wrap, Number(wrap.dataset.page))
            }
          }, 250)
        })
        sizes.observe(box)
        stop.push(() => { clearTimeout(timer); sizes.disconnect() })
      } catch {
        if (!dead) setStatus('failed')
      }
    })()

    return () => {
      dead = true
      for (const fn of stop) fn()
    }
  }, [src, label])

  return (
    <div
      ref={frame}
      // The scrolling column itself: tall enough to read a page, never taller than the screen.
      className={`max-h-[min(78vh,760px)] min-h-[320px] overflow-y-auto overscroll-contain rounded-[var(--radius-input)] border border-line bg-ink-100 p-2 ${className ?? ''}`}
      aria-busy={status === 'loading'}
      aria-label={label}
    >
      <div ref={column} className="grid gap-2" />
      {status !== 'ready' ? (
        <p className="p-6 text-center text-[13px] leading-relaxed text-ink-500">
          {status === 'loading' ? 'Memuat PDF…' : 'PDF ini tidak bisa ditampilkan di sini. Unduh berkasnya untuk membacanya.'}
        </p>
      ) : null}
    </div>
  )
}
