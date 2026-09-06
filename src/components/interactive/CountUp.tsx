'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A figure that counts up from zero when it scrolls into view.
 *
 * The value is whatever the editor typed — "Rp500M+", "5.000+", "98%" — so the
 * number is found inside the text and the rest is kept around it. Separators
 * follow the original: "5.000" counts in Indonesian thousands, "3,5" keeps its
 * decimal comma. The server renders the final figure, so a crawler or a
 * reader without JavaScript never sees a zero.
 */
interface Parsed { prefix: string; target: number; suffix: string; format: (n: number) => string }

function parse(value: string): Parsed | null {
  const m = value.match(/^([^\d]*)(\d[\d.,]*)(.*)$/)
  if (!m) return null
  const [, prefix, raw, suffix] = m
  const num = raw ?? ''
  // "5.000" or "1.250.000": dots grouping exactly three digits.
  if (/^\d{1,3}(\.\d{3})+$/.test(num)) {
    const target = Number(num.replace(/\./g, ''))
    return { prefix: prefix ?? '', target, suffix: suffix ?? '', format: (n) => Math.round(n).toLocaleString('id-ID') }
  }
  // "3,5": a decimal comma.
  if (/^\d+,\d+$/.test(num)) {
    const decimals = num.split(',')[1]!.length
    const target = Number(num.replace(',', '.'))
    return { prefix: prefix ?? '', target, suffix: suffix ?? '', format: (n) => n.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) }
  }
  // "12.5" or "1,000": English separators, kept as written.
  if (/^\d+\.\d+$/.test(num)) {
    const decimals = num.split('.')[1]!.length
    return { prefix: prefix ?? '', target: Number(num), suffix: suffix ?? '', format: (n) => n.toFixed(decimals) }
  }
  if (/^\d{1,3}(,\d{3})+$/.test(num)) {
    return { prefix: prefix ?? '', target: Number(num.replace(/,/g, '')), suffix: suffix ?? '', format: (n) => Math.round(n).toLocaleString('en-US') }
  }
  if (/^\d+$/.test(num)) return { prefix: prefix ?? '', target: Number(num), suffix: suffix ?? '', format: (n) => String(Math.round(n)) }
  return null
}

export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const parsed = parse(value)
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !parsed) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Start from zero only once the browser is in charge; the server markup
    // carried the final figure.
    setShown(0)
    let frame = 0
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setShown(parsed.target * eased)
        if (t < 1) frame = requestAnimationFrame(tick)
        else setShown(null)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.35 })
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
    // The value is a string from the CMS; re-parsing it on every render is cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  if (!parsed) return <>{value}</>
  return (
    <span ref={ref} className="tnum">
      {shown === null ? value : `${parsed.prefix}${parsed.format(shown)}${parsed.suffix}`}
    </span>
  )
}
