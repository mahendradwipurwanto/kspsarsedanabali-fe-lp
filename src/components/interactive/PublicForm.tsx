'use client'

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type Ref, type TextareaHTMLAttributes } from 'react'
import Link from 'next/link'
import {
  checkAnswers, formSections, isFileType, isImageKey, isPdfKey, mediaDownloadSrc, mediaProxySrc, mediaSrc, otherLabelOf, pictureCanDownload, pictureImages, scaleRange, sectionAfter, storedFileName, targetProgress, type FormAnswers, OTHER_PREFIX, OTHER_LABEL, FORM_IMAGE_MAX_SIDE, FORM_FILE_MAX_BYTES,
  FORM_DOC_ACCEPT, FORM_DOC_MAX_BYTES, FORM_DOC_TYPES, type FormField, type PublicForm,
} from '@/contracts'
import { API_BASE, apiPost, track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { PdfReader } from './PdfReader'
import { Field, Note, Select, field as fieldCls } from '../ui/form'

/* ───────────────────────────── uploading ──────────────────────────── */

/**
 * One file to the form's private folder. A busy bucket or a dropped mobile
 * connection gets one more try before the member is told; a refusal (a 4xx:
 * wrong type, form closed) does not, because trying again cannot change it.
 */
async function uploadFile(slug: string, blob: Blob, kind: 'signature' | 'image' | 'file', filename = ''): Promise<string> {
  try {
    return await uploadOnce(slug, blob, kind, filename)
  } catch (e) {
    if ((e as { status?: number }).status && (e as { status: number }).status < 500) throw e
    await new Promise((r) => setTimeout(r, 1200))
    return uploadOnce(slug, blob, kind, filename)
  }
}

async function uploadOnce(slug: string, blob: Blob, kind: 'signature' | 'image' | 'file', filename: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/public/forms/${encodeURIComponent(slug)}/files`, {
    method: 'POST',
    // The name travels encoded: a header cannot carry "Surat Kuasa – Bu Made.pdf" as it is.
    headers: { 'content-type': blob.type || 'application/octet-stream', 'x-kind': kind, ...(filename ? { 'x-filename': encodeURIComponent(filename) } : {}) },
    body: blob,
  })
  const json = (await res.json().catch(() => ({}))) as { data?: { key?: string }; error?: { message?: string } }
  if (!res.ok || !json.data?.key) throw Object.assign(new Error(json.error?.message ?? 'Berkas gagal diunggah. Periksa koneksi lalu coba lagi.'), { status: res.status })
  return json.data.key
}

/**
 * A photo as it should travel: no side longer than FORM_IMAGE_MAX_SIDE, as a
 * JPEG. A twelve-megapixel phone photo of 4 MB leaves as a few hundred KB,
 * which matters on a member's prepaid data and on a meeting hall's Wi-Fi.
 */
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const scale = Math.min(1, FORM_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (blob) return blob
  } catch { /* fall through: send it as it is when the browser can read it but not redraw it */ }
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= FORM_FILE_MAX_BYTES) return file
  throw new Error('Format foto tidak didukung. Gunakan foto JPG atau PNG.')
}

/* ───────────────────────────── signature ──────────────────────────── */

export interface SignatureHandle { isEmpty: () => boolean; toBlob: () => Promise<Blob | null>; clear: () => void }

type Point = [number, number]

/**
 * A box to sign in, with a finger or a mouse.
 *
 * Strokes are kept as points relative to the box, so turning the phone or
 * resizing the window redraws the signature at the new size instead of
 * wiping it. Scrolling is held off only while the pen is down inside the box.
 */
function SignaturePad({ ref, id, invalid, onChange }: { ref: Ref<SignatureHandle>; id: string; invalid?: boolean; onChange: (empty: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Point[][]>([])
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    if (canvas.width !== Math.round(width * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr) }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.4
    ctx.strokeStyle = '#0f1b2d'
    for (const s of strokes.current) {
      const pts = s.map(([x, y]) => [x * width, y * height] as Point)
      ctx.beginPath()
      ctx.moveTo(pts[0]![0], pts[0]![1])
      if (pts.length === 1) ctx.lineTo(pts[0]![0] + 0.1, pts[0]![1] + 0.1)
      // Through the midpoints: a smooth line rather than a chain of straight segments.
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i]![0] + pts[i + 1]![0]) / 2, my = (pts[i]![1] + pts[i + 1]![1]) / 2
        ctx.quadraticCurveTo(pts[i]![0], pts[i]![1], mx, my)
      }
      if (pts.length > 1) ctx.lineTo(pts[pts.length - 1]![0], pts[pts.length - 1]![1])
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    redraw()
    const ro = new ResizeObserver(() => redraw())
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [redraw])

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
  }

  const clear = useCallback(() => { strokes.current = []; setEmpty(true); onChange(true); redraw() }, [onChange, redraw])

  useImperativeHandle(ref, () => ({
    isEmpty: () => strokes.current.length === 0,
    clear,
    toBlob: async () => {
      if (!strokes.current.length) return null
      // Drawn again on a white card of fixed size, so every signature on file has the same shape.
      const out = document.createElement('canvas')
      out.width = 900; out.height = 360
      const ctx = out.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#0f1b2d'
      for (const s of strokes.current) {
        ctx.beginPath()
        s.forEach(([x, y], i) => (i ? ctx.lineTo(x * out.width, y * out.height) : ctx.moveTo(x * out.width, y * out.height)))
        if (s.length === 1) ctx.lineTo(s[0]![0] * out.width + 0.5, s[0]![1] * out.height + 0.5)
        ctx.stroke()
      }
      return new Promise((r) => out.toBlob(r, 'image/png'))
    },
  }), [clear])

  return (
    <div>
      <div className={`relative overflow-hidden rounded-[var(--radius-input)] border bg-white ${invalid ? 'border-[#d1483c]' : 'border-line-strong'}`}>
        <canvas
          ref={canvasRef}
          id={id}
          role="img"
          aria-label="Kotak tanda tangan"
          className="block h-[200px] w-full cursor-crosshair touch-none sm:h-[220px]"
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            drawing.current = true
            strokes.current.push([at(e)])
            redraw()
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return
            const events = (e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) as PointerEvent[]
            const r = e.currentTarget.getBoundingClientRect()
            const stroke = strokes.current[strokes.current.length - 1]!
            for (const ev of events) stroke.push([(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height])
            redraw()
          }}
          onPointerUp={() => {
            if (!drawing.current) return
            drawing.current = false
            setEmpty(false)
            // Every finished stroke, not only the first: the parent re-uploads the signature as it now stands.
            onChange(false)
          }}
          onPointerCancel={() => { drawing.current = false }}
        />
        {empty ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-ink-200 text-center" />
        ) : null}
        {empty ? <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-ink-300">Tanda tangan di sini</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-400">Gunakan jari (ponsel) atau mouse (komputer).</p>
        <button type="button" onClick={clear} disabled={empty} className="cursor-pointer text-[13px] font-semibold text-green-700 underline-offset-4 hover:underline disabled:cursor-default disabled:text-ink-300 disabled:no-underline">
          Ulangi tanda tangan
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────── photos ───────────────────────────── */

interface Upload { id: string; preview: string; key: string | null; error: string | null }

function ImageInput({ id, slug, max, value, onChange, invalid }: { id: string; slug: string; max: number; value: Upload[]; onChange: (fn: (prev: Upload[]) => Upload[]) => void; invalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null)

  async function add(files: FileList | null) {
    if (!files?.length) return
    const room = max - value.length
    for (const file of [...files].slice(0, room)) {
      const uid = Math.random().toString(36).slice(2)
      const preview = URL.createObjectURL(file)
      onChange((prev) => [...prev, { id: uid, preview, key: null, error: null }])
      try {
        const blob = await shrinkImage(file)
        const key = await uploadFile(slug, blob, 'image')
        onChange((prev) => prev.map((u) => (u.id === uid ? { ...u, key } : u)))
      } catch (e) {
        onChange((prev) => prev.map((u) => (u.id === uid ? { ...u, error: (e as Error).message } : u)))
      }
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {value.map((u) => (
          <div key={u.id} className={`relative aspect-square overflow-hidden rounded-[var(--radius-input)] border bg-paper ${u.error ? 'border-[#d1483c]' : 'border-line'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.preview} alt="" className={`size-full object-cover ${u.key ? '' : 'opacity-60'}`} />
            {!u.key && !u.error ? <span className="absolute inset-0 grid place-items-center bg-white/40 text-[12px] font-semibold text-ink-700">Mengunggah…</span> : null}
            {u.error ? <span className="absolute inset-x-0 bottom-0 bg-[#c23b2e] px-1.5 py-1 text-[11px] font-medium leading-tight text-white">{u.error}</span> : null}
            <button
              type="button"
              aria-label="Hapus foto"
              onClick={() => { URL.revokeObjectURL(u.preview); onChange((prev) => prev.filter((x) => x.id !== u.id)) }}
              className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-night-900/75 text-white hover:bg-night-900"
            >
              <Icon.close className="size-3.5" />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            id={id}
            onClick={() => input.current?.click()}
            className={`grid aspect-square cursor-pointer place-items-center rounded-[var(--radius-input)] border border-dashed bg-white text-center transition-colors hover:border-green-600 hover:text-green-700 ${invalid ? 'border-[#d1483c] text-[#c23b2e]' : 'border-line-strong text-ink-500'}`}
          >
            <span className="grid justify-items-center gap-1.5 px-2 text-[12.5px] font-semibold">
              <span className="text-[24px] leading-none" aria-hidden="true">+</span>
              {value.length ? 'Tambah foto' : 'Ambil / pilih foto'}
            </span>
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max - value.length > 1} className="sr-only" tabIndex={-1} onChange={(e) => void add(e.target.files)} />
      <p className="mt-2 text-[12.5px] text-ink-400">{max > 1 ? `Paling banyak ${max} foto. ` : ''}Foto diperkecil otomatis sebelum dikirim.</p>
    </div>
  )
}

/* ───────────────────────────── documents ──────────────────────────── */

interface DocUpload { id: string; name: string; key: string | null; error: string | null }

/** Why a document cannot go, before it is sent: its type by name, and its size. */
function docProblem(file: File): string | null {
  const ext = (file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? '').toLowerCase()
  if (!FORM_DOC_TYPES[ext]) return 'Hanya PDF, Word, Excel, PowerPoint, atau foto.'
  if (file.size > FORM_DOC_MAX_BYTES) return `Lebih dari ${FORM_DOC_MAX_BYTES / 1024 / 1024} MB.`
  return null
}

const sizeText = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/**
 * "Unggah berkas": documents uploaded as soon as they are picked, each named
 * as it was on the member's phone. A photo picked here is sent as it is, not
 * shrunk: someone who asked for a scan wants to read it.
 */
function DocumentInput({ id, slug, max, value, onChange, invalid }: { id: string; slug: string; max: number; value: DocUpload[]; onChange: (fn: (prev: DocUpload[]) => DocUpload[]) => void; invalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null)

  async function add(files: FileList | null) {
    if (!files?.length) return
    const room = max - value.length
    for (const file of [...files].slice(0, room)) {
      const uid = Math.random().toString(36).slice(2)
      const problem = docProblem(file)
      onChange((prev) => [...prev, { id: uid, name: `${file.name} · ${sizeText(file.size)}`, key: null, error: problem }])
      if (problem) continue
      try {
        const key = await uploadFile(slug, file, 'file', file.name)
        onChange((prev) => prev.map((u) => (u.id === uid ? { ...u, key } : u)))
      } catch (e) {
        onChange((prev) => prev.map((u) => (u.id === uid ? { ...u, error: (e as Error).message } : u)))
      }
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="grid gap-2">
      {value.map((u) => (
        <div key={u.id} className={`flex items-center gap-3 rounded-[var(--radius-input)] border bg-white px-3.5 py-2.5 ${u.error ? 'border-[#d1483c]' : 'border-line'}`}>
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-paper text-ink-500">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink-900">{u.name}</span>
            <span className={`block text-[12px] ${u.error ? 'font-medium text-[#c23b2e]' : u.key ? 'text-green-700' : 'text-ink-400'}`}>
              {u.error ?? (u.key ? 'Terunggah' : 'Mengunggah…')}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Hapus ${u.name}`}
            onClick={() => onChange((prev) => prev.filter((x) => x.id !== u.id))}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-400 hover:bg-paper hover:text-ink-900"
          >
            <Icon.close className="size-3.5" />
          </button>
        </div>
      ))}
      {value.length < max ? (
        <button
          type="button"
          id={id}
          onClick={() => input.current?.click()}
          className={`flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-input)] border border-dashed bg-white px-4 text-[14px] font-semibold transition-colors hover:border-green-600 hover:text-green-700 ${invalid ? 'border-[#d1483c] text-[#c23b2e]' : 'border-line-strong text-ink-600'}`}
        >
          <span className="text-[20px] leading-none" aria-hidden="true">+</span>
          {value.length ? 'Tambah berkas' : 'Pilih berkas'}
        </button>
      ) : null}
      <input ref={input} type="file" accept={FORM_DOC_ACCEPT} multiple={max - value.length > 1} className="sr-only" tabIndex={-1} onChange={(e) => void add(e.target.files)} />
      <p className="text-[12.5px] text-ink-400">PDF, Word, Excel, PowerPoint, atau foto; paling besar {FORM_DOC_MAX_BYTES / 1024 / 1024} MB per berkas{max > 1 ? `, paling banyak ${max} berkas` : ''}.</p>
    </div>
  )
}

/* ────────────────────────── pictures and PDFs ─────────────────────── */

/**
 * Save a file to the device instead of opening it.
 *
 * A plain link with `download` and an attachment header is not enough on an
 * iPhone or iPad: Safari opens a PDF in its own viewer in a new tab anyway.
 * Handing it the file as a blob of no particular type, under its name, is
 * what makes every browser — iOS Safari included — offer to save it. When
 * the fetch fails the link is simply followed, as it would have been.
 */
async function saveFile(e: MouseEvent<HTMLAnchorElement>, name: string) {
  const link = e.currentTarget
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  try {
    const res = await fetch(link.href)
    if (!res.ok) throw new Error(String(res.status))
    const blob = new Blob([await res.arrayBuffer()], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
    // Safari reads the blob after the click returns; let it go a while later.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    window.location.href = link.href
  }
}

/** A text box that grows with what is typed, so a long "Lainnya" answer is read whole rather than cut off. */
function GrowingText({ value, onChange, className, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`
  }, [value])
  return (
    <textarea
      ref={box}
      rows={1}
      value={value}
      // One answer, not a paragraph: Enter does not start a new line.
      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
      className={`${className ?? ''} resize-none overflow-hidden break-words`}
      {...rest}
    />
  )
}

/**
 * One file of a "Gambar/File" item: a picture at its own proportions, a PDF
 * read right here in the form — the laporan tahunan is read where it is
 * being asked about, never in another tab — or any other document offered by
 * name. When the form allows it, a small "Unduh" button sits in the corner,
 * pointing at the website's own media proxy, which is what answers with
 * "save this file".
 */
function PictureFile({ value, alt, canDownload }: { value: string; alt: string; canDownload: boolean }) {
  const pdf = isPdfKey(value)
  const image = isImageKey(value)
  const name = storedFileName(value)
  return (
    <div className="relative">
      {pdf ? (
        <PdfReader src={mediaProxySrc(value)} label={alt} />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaSrc(value, { publicBase: process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL })}
          alt={alt}
          loading="lazy"
          className="h-auto w-full rounded-[var(--radius-input)] border border-line bg-white"
        />
      ) : (
        // Word, Excel and the rest cannot be drawn in the page; they are offered as what they are.
        <span className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-line bg-white px-4 py-3 pr-14 text-[13.5px] text-ink-700">
          <Icon.download className="size-4 shrink-0" aria-hidden="true" /> {name}
        </span>
      )}
      {canDownload ? (
        <a
          href={mediaDownloadSrc(value)}
          download={name}
          onClick={(e) => void saveFile(e, name)}
          aria-label={`Unduh ${name}`}
          title={`Unduh ${name}`}
          className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full border border-line bg-white/95 text-ink-700 shadow-sm backdrop-blur transition-colors hover:border-ink-900 hover:text-ink-900"
        >
          <Icon.download className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )
}

/* ───────────────────────────── the form ───────────────────────────── */

const choiceBox = (active: boolean) =>
  `flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[var(--radius-input)] border px-4 py-2.5 text-[14.5px] transition-colors ${
    active ? 'border-green-600 bg-green-50 text-ink-900' : 'border-line bg-white text-ink-700 hover:border-line-strong'
  }`

function Marker({ round, on }: { round: boolean; on: boolean }) {
  return (
    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center border-2 ${round ? 'rounded-full' : 'rounded-[5px]'} ${on ? 'border-green-600 bg-green-600' : 'border-ink-300 bg-white'}`}>
      {on ? (round ? <span className="size-2 rounded-full bg-white" /> : <svg viewBox="0 0 16 16" className="size-3 text-white" fill="none"><path d="m3 8.5 3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>) : null}
    </span>
  )
}

/**
 * A form from the Formulir menu, filled in on the website.
 *
 * Checked here with the same rules the API applies, so a member learns what
 * is missing before anything is sent. Photos upload as soon as they are
 * picked; the signature is uploaded when the form is sent, then the answers.
 */
export function PublicFormView({ form, bare = false }: {
  form: PublicForm
  /** Opened through the "hanya formulir" link: nothing points away from the form, not even home. */
  bare?: boolean
}) {
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const [others, setOthers] = useState<Record<string, string>>({})
  const [images, setImages] = useState<Record<string, Upload[]>>({})
  const [docs, setDocs] = useState<Record<string, DocUpload[]>>({})
  const [signed, setSigned] = useState<Record<string, boolean>>({})
  const pads = useRef<Record<string, SignatureHandle | null>>({})
  /**
   * Signatures go up in the background once the member pauses, so pressing
   * "Kirim" does not wait on the bucket. Each new stroke starts a new version;
   * only the upload of the version on screen is used.
   */
  const sigUploads = useRef<Record<string, { version: number; timer: ReturnType<typeof setTimeout> | null; key: Promise<string> | null }>>({})
  const scheduleSignature = (fid: string, empty: boolean) => {
    const prev = sigUploads.current[fid]
    if (prev?.timer) clearTimeout(prev.timer)
    const version = (prev?.version ?? 0) + 1
    const entry: { version: number; timer: ReturnType<typeof setTimeout> | null; key: Promise<string> | null } = { version, timer: null, key: null }
    sigUploads.current[fid] = entry
    if (empty) return
    entry.timer = setTimeout(() => {
      entry.timer = null
      entry.key = signatureKey(fid)
      entry.key.catch(() => { if (sigUploads.current[fid] === entry) entry.key = null })
    }, 1500)
  }
  const signatureKey = async (fid: string) => {
    const blob = await pads.current[fid]?.toBlob()
    if (!blob) throw new Error('Bubuhkan tanda tangan Anda.')
    return uploadFile(form.slug, blob, 'signature')
  }
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [success, setSuccess] = useState('')

  const set = (id: string, v: string | string[]) => {
    setValues((x) => ({ ...x, [id]: v }))
    if (errors[id]) setErrors((x) => { const n = { ...x }; delete n[id]; return n })
  }

  const progress = form.progress ? targetProgress(form.progress.responses, form.progress.target) : null

  /**
   * The form as the pages it is built from: one per "Judul bagian", answered
   * one at a time, as in Google Forms. The trail is what "Kembali" walks back
   * along, because with a jump the page before this one is not always the one
   * above it. A form without sections is a single page, exactly as before.
   */
  const sections = useMemo(() => formSections(form.fields), [form.fields])
  const [rawAt, setAt] = useState(0)
  const [trail, setTrail] = useState<number[]>([])
  const at = Math.min(rawAt, sections.length - 1)
  const here = sections[at]!
  // A page's route can hang on what was answered on it ("Buka bagian
  // berdasarkan jawaban"), so the walk reads the answers, not the form alone.
  const picked = useMemo(() => {
    const out: FormAnswers = {}
    for (const [k, v] of Object.entries(values)) if (typeof v === 'string') out[k] = v
    return out
  }, [values])
  const nextAt = sectionAfter(sections, at, picked)
  const last = nextAt === null
  const paged = sections.length > 1
  /** Every page passed through, this one included: the only questions that are asked. */
  const walked = useMemo(() => [...trail, at].flatMap((i) => sections[i]?.fields ?? []), [trail, at, sections])

  /** "Kirim jawaban lain": an empty form again, as if the page had just been opened. */
  function again() {
    for (const list of Object.values(images)) for (const u of list) URL.revokeObjectURL(u.preview)
    for (const up of Object.values(sigUploads.current)) if (up.timer) clearTimeout(up.timer)
    sigUploads.current = {}
    setValues({}); setOthers({}); setImages({}); setDocs({}); setSigned({})
    setErrors({}); setError(''); setSuccess(''); setStatus('idle')
    setAt(0); setTrail([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (form.status !== 'open' || status === 'done') {
    const done = status === 'done'
    return (
      <div className="surface relative overflow-hidden p-8 text-center sm:p-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
        <span className={`mx-auto grid size-14 place-items-center rounded-[var(--radius-tile)] ${done ? 'bg-green-600 text-white' : 'bg-paper text-ink-500'}`}>
          {done ? <Icon.check className="size-7" /> : <Icon.clock className="size-7" />}
        </span>
        <h1 className="t-h2 mt-5 text-ink-900">{done ? 'Jawaban terkirim' : form.title}</h1>
        <p className="t-lead mx-auto mt-4 max-w-md whitespace-pre-line">{done ? success : form.closedMessage}</p>
        {done && form.allowAnother ? (
          <button type="button" onClick={again} className="mt-6 cursor-pointer text-[15px] font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">
            Kirim jawaban lain
          </button>
        ) : null}
        {bare ? null : (
          <div className="mt-8 border-t border-line pt-6">
            <Link href="/" className="text-[14px] font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">Ke beranda KSP Sari Sedana</Link>
          </div>
        )}
      </div>
    )
  }

  /** What would be sent for the given questions, with the files left for the upload step. */
  function collect(list: FormField[]): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const f of list) {
      const v = values[f.id]
      if (v === undefined) continue
      if ((f.type === 'choice') && v === OTHER_LABEL) out[f.id] = `${OTHER_PREFIX}${(others[f.id] ?? '').trim()}`
      else if (f.type === 'checkboxes' && Array.isArray(v)) out[f.id] = v.map((x) => (x === OTHER_LABEL ? `${OTHER_PREFIX}${(others[f.id] ?? '').trim()}` : x))
      // The box holds only what follows the fixed start; the answer is the two together.
      else if (f.type === 'short_text' && f.prefix && typeof v === 'string') out[f.id] = v.trim() ? `${f.prefix}${v.trim()}` : ''
      else out[f.id] = v
    }
    return out
  }

  function localErrors(list: FormField[]): Record<string, string> {
    const plain = list.filter((f) => !isFileType(f.type))
    const { errors: found } = checkAnswers(plain, collect(list))
    for (const f of list) {
      if (f.type === 'signature' && f.required && !signed[f.id]) found[f.id] = 'Bubuhkan tanda tangan Anda.'
      if (f.type === 'image') {
        const list = images[f.id] ?? []
        if (list.some((u) => !u.key && !u.error)) found[f.id] = 'Tunggu sampai foto selesai terunggah.'
        else if (list.some((u) => u.error)) found[f.id] = 'Ada foto yang gagal terunggah. Hapus lalu pilih ulang.'
        else if (f.required && !list.length) found[f.id] = 'Unggah foto yang diminta.'
      }
      if (f.type === 'file') {
        const list = docs[f.id] ?? []
        if (list.some((u) => !u.key && !u.error)) found[f.id] = 'Tunggu sampai berkas selesai terunggah.'
        else if (list.some((u) => u.error)) found[f.id] = 'Ada berkas yang tidak bisa dikirim. Hapus lalu pilih ulang.'
        else if (f.required && !list.length) found[f.id] = 'Unggah berkas yang diminta.'
      }
    }
    return found
  }

  /** One page back along the trail actually walked, not simply the section above. */
  function back() {
    const t = [...trail]
    const prev = t.pop()
    if (prev === undefined) return
    setTrail(t)
    setAt(prev)
    setErrors({})
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function focusFirst(found: Record<string, string>) {
    const first = here.fields.find((f) => found[f.id]) ?? form.fields.find((f) => found[f.id])
    if (!first) return
    const el = document.getElementById(`q-${first.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el?.querySelector('input,textarea,button,canvas') as HTMLElement | null)?.focus({ preventScroll: true })
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Read now: React clears currentTarget once the handler has awaited anything.
    const honeypot = String(new FormData(e.currentTarget).get('website') ?? '')
    setError('')
    const found = localErrors(here.fields)
    setErrors(found)
    if (Object.keys(found).length) { focusFirst(found); return }

    // Not the end of the form yet: on to the page this one leads to.
    if (!last) {
      setTrail([...trail, at])
      setAt(nextAt!)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Everything the walk passed through. Pages jumped over were never shown,
    // so their questions were never asked and are not required here either.
    const all = localErrors(walked)
    setErrors(all)
    if (Object.keys(all).length) {
      const page = [...trail, at].find((i) => sections[i]!.fields.some((f) => all[f.id]))
      if (page !== undefined && page !== at) { setAt(page); setTrail([...trail, at].slice(0, [...trail, at].indexOf(page))) }
      else focusFirst(all)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setStatus('sending')
    try {
      const answers = collect(walked)
      for (const f of walked) {
        if (f.type === 'image' || f.type === 'file') {
          const keys = ((f.type === 'image' ? images : docs)[f.id] ?? []).map((u) => u.key).filter(Boolean)
          if (keys.length) answers[f.id] = keys
        }
        if (f.type === 'signature' && signed[f.id]) {
          const up = sigUploads.current[f.id]
          if (up?.timer) { clearTimeout(up.timer); up.timer = null }
          // The background upload of what is on screen, or a fresh one if it has not started or it failed.
          answers[f.id] = await (up?.key ?? signatureKey(f.id)).catch(() => signatureKey(f.id))
        }
      }
      const res = await apiPost<{ successMessage: string }>(`/public/forms/${encodeURIComponent(form.slug)}/responses`, { answers, website: honeypot })
      if (!res.ok) {
        setStatus('idle')
        setError(res.message)
        if (res.fields) { setErrors(res.fields); focusFirst(res.fields) }
        return
      }
      track('form_submit', { form: form.slug })
      setSuccess(res.data.successMessage)
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setStatus('idle')
      setError((err as Error).message)
    }
  }

  function render(f: FormField) {
    const id = `q-${f.id}-input`
    const v = values[f.id]
    const err = errors[f.id]
    const text = typeof v === 'string' ? v : ''
    switch (f.type) {
      case 'short_text':
      case 'email':
      case 'phone':
      case 'number': {
        const digits = f.type === 'short_text' && !!f.digitsOnly
        const prefix = f.type === 'short_text' ? f.prefix : ''
        const box = (
          <input
            id={id}
            value={text}
            onChange={(e) => {
              let next = e.target.value
              if (f.type === 'phone') next = next.replace(/[^\d+\s-]/g, '')
              // Pasting the whole number, start included, keeps only the part the box is for.
              // Only on a paste: typing "0121…" after a start of "0121" is an answer, not a repeat.
              if (prefix && next.length > text.length + 1 && next.startsWith(prefix)) next = next.slice(prefix.length)
              if (digits) next = next.replace(/\D/g, '')
              if (f.type === 'short_text' && f.maxLength) next = next.slice(0, f.maxLength)
              set(f.id, next)
            }}
            type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
            inputMode={digits ? 'numeric' : f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined}
            autoComplete={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'off'}
            // Without a length set, room for a pasted number with its start, which the handler then trims.
            maxLength={f.type === 'short_text' ? (f.maxLength ? f.maxLength + (prefix?.length ?? 0) : 500) : 200}
            placeholder={f.placeholder || undefined}
            aria-invalid={err ? true : undefined}
            aria-describedby={prefix ? `${id}-prefix` : undefined}
            className={prefix ? `${fieldCls} !rounded-l-none` : fieldCls}
          />
        )
        if (!prefix) return box
        // The fixed start sits in the box's frame, so the member types only what follows it.
        return (
          <div className="flex items-stretch">
            <span id={`${id}-prefix`} className="tnum grid shrink-0 place-items-center rounded-l-[var(--radius-input)] border border-r-0 border-line-strong bg-paper px-3.5 text-[15px] font-semibold text-ink-700">
              {prefix}
            </span>
            {box}
          </div>
        )
      }
      case 'long_text':
        return <textarea id={id} value={text} onChange={(e) => set(f.id, e.target.value)} rows={4} maxLength={f.maxLength ?? 4000} placeholder={f.placeholder || undefined} aria-invalid={err ? true : undefined} className={fieldCls} />
      case 'date':
        return <input id={id} type="date" value={text} onChange={(e) => set(f.id, e.target.value)} aria-invalid={err ? true : undefined} className={`${fieldCls} max-w-[240px]`} />
      case 'dropdown':
        return <Select id={id} value={text} onChange={(x) => set(f.id, x)} placeholder="Pilih…" options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
      case 'choice':
      case 'checkboxes': {
        const multi = f.type === 'checkboxes'
        const picked = multi ? (Array.isArray(v) ? v : []) : [text]
        const opts = [...(f.options ?? []), ...(f.allowOther ? [OTHER_LABEL] : [])]
        return (
          <div role={multi ? 'group' : 'radiogroup'} aria-label={f.label} className="grid gap-2">
            {opts.map((o) => {
              const on = picked.includes(o)
              return (
                <div key={o}>
                  <button
                    type="button"
                    role={multi ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    onClick={() => set(f.id, multi ? (on ? picked.filter((x) => x !== o) : [...picked, o]) : o)}
                    className={`${choiceBox(on)} w-full text-left`}
                  >
                    <Marker round={!multi} on={on} />
                    <span className="min-w-0 flex-1">{o === OTHER_LABEL ? otherLabelOf(f) : o}</span>
                  </button>
                  {o === OTHER_LABEL && on ? (
                    <GrowingText
                      value={others[f.id] ?? ''}
                      onChange={(text) => setOthers((x) => ({ ...x, [f.id]: text }))}
                      maxLength={300}
                      placeholder="Tuliskan jawaban Anda"
                      className={`${fieldCls} mt-2`}
                      autoFocus
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )
      }
      case 'scale': {
        const range = scaleRange(f)
        return (
          <div className="w-fit max-w-full">
            <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">
              {range.map((n) => {
                const on = text === String(n)
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set(f.id, String(n))}
                    className={`tnum grid size-12 cursor-pointer place-items-center rounded-[var(--radius-input)] border text-[15px] font-semibold transition-colors ${on ? 'border-night-900 bg-night-900 text-white' : 'border-line bg-white text-ink-700 hover:border-ink-900'}`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
            {f.minLabel || f.maxLabel ? (
              <p className="mt-2 flex justify-between gap-4 text-[12.5px] text-ink-500">
                <span>{range[0]} = {f.minLabel || '–'}</span><span>{range[range.length - 1]} = {f.maxLabel || '–'}</span>
              </p>
            ) : null}
          </div>
        )
      }
      case 'signature':
        return (
          <SignaturePad
            ref={(h) => { pads.current[f.id] = h }}
            id={id}
            invalid={!!err}
            onChange={(empty) => {
              scheduleSignature(f.id, empty)
              setSigned((x) => ({ ...x, [f.id]: !empty }))
              if (!empty && errors[f.id]) setErrors((x) => { const n = { ...x }; delete n[f.id]; return n })
            }}
          />
        )
      case 'image':
        return (
          <ImageInput
            id={id}
            slug={form.slug}
            max={f.maxFiles ?? 1}
            value={images[f.id] ?? []}
            invalid={!!err}
            onChange={(fn) => {
              setImages((x) => ({ ...x, [f.id]: fn(x[f.id] ?? []) }))
              if (errors[f.id]) setErrors((x) => { const n = { ...x }; delete n[f.id]; return n })
            }}
          />
        )
      case 'file':
        return (
          <DocumentInput
            id={id}
            slug={form.slug}
            max={f.maxFiles ?? 1}
            value={docs[f.id] ?? []}
            invalid={!!err}
            onChange={(fn) => {
              setDocs((x) => ({ ...x, [f.id]: fn(x[f.id] ?? []) }))
              if (errors[f.id]) setErrors((x) => { const n = { ...x }; delete n[f.id]; return n })
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="surface relative overflow-hidden">
      <span aria-hidden="true" className="block h-1.5 bg-green-600" />
      <header className="border-b border-line p-6 sm:p-8">
        <h1 className="t-h2 text-ink-900">{form.title}</h1>
        {form.description ? <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">{form.description}</p> : null}
        {paged ? (
          <p className="mt-5 flex items-center gap-3 text-[12.5px] font-semibold text-ink-500">
            Bagian {at + 1} dari {sections.length}
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
              <span className="block h-full rounded-full bg-green-600 transition-[width] duration-300" style={{ width: `${((at + 1) / sections.length) * 100}%` }} />
            </span>
          </p>
        ) : null}
        {form.progress ? (
          <div className="mt-5 rounded-[var(--radius-input)] bg-paper px-4 py-3">
            <p className="text-[13px] text-ink-600">
              <span className="tnum font-bold text-ink-900">{form.progress.responses.toLocaleString('id-ID')}</span>
              {form.progress.target ? <> dari <span className="tnum font-bold text-ink-900">{form.progress.target.toLocaleString('id-ID')}</span> responden</> : ' responden'} sudah mengisi
            </p>
            {progress !== null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                <div className="h-full rounded-full bg-green-600" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}
        {here.id && (here.title || here.help) ? (
          <div className="mt-5 border-t border-line pt-5">
            {here.title ? <h2 className="t-h3 text-ink-900">{here.title}</h2> : null}
            {here.help ? <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-500">{here.help}</p> : null}
          </div>
        ) : null}
        <p className="mt-4 text-[12.5px] text-ink-400"><span className="text-[#d1483c]">*</span> wajib diisi</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="grid gap-7 p-6 sm:p-8">
        {here.fields.map((f) =>
          f.type === 'picture' ? (
            // Shown at its own proportions, the full width of the form: a chart from the annual
            // report has to stay readable, so it is never cropped into a fixed box.
            <figure key={f.id} className="grid gap-2.5">
              {f.label ? <p className="text-[15px] font-bold text-ink-900">{f.label}</p> : null}
              {pictureImages(f).map((m, i, all) => (
                <PictureFile key={`${i}-${m}`} value={m} alt={`${f.help || f.label || 'Gambar'}${all.length > 1 ? ` (${i + 1} dari ${all.length})` : ''}`} canDownload={pictureCanDownload(f)} />
              ))}
              {f.help ? <figcaption className="whitespace-pre-line text-[13px] leading-relaxed text-ink-500">{f.help}</figcaption> : null}
            </figure>
          ) : (
            <div key={f.id} id={`q-${f.id}`} className="scroll-mt-24">
              <Field label={f.label} htmlFor={`q-${f.id}-input`} required={f.required} error={errors[f.id]} hint={f.help || undefined}>
                {render(f)}
              </Field>
            </div>
          ),
        )}

        {/* Honeypot: off-screen and hidden from assistive tech, never filled by a person. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] size-px opacity-0" />

        {error ? <Note>{error}</Note> : null}
        {Object.keys(errors).length && !error ? <Note>Ada {Object.keys(errors).length} isian yang perlu diperbaiki. Periksa yang bertanda merah.</Note> : null}

        <div className="flex items-center gap-3">
          {trail.length ? (
            <Action type="button" variant="outline" onClick={back}>Kembali</Action>
          ) : null}
          <span className="flex-1">
            <Action type="submit" variant="primary" disabled={status === 'sending'} full>
              {status === 'sending' ? 'Mengirim…' : last ? form.submitLabel : 'Berikutnya'}
              {status === 'sending' ? null : <Icon.arrow className="size-4" />}
            </Action>
          </span>
        </div>
        <p className="text-center text-[12px] leading-relaxed text-ink-400">
          Jawaban Anda hanya dibaca oleh pengurus KSP Sari Sedana Bali dan tidak ditampilkan di website.
        </p>
      </form>
    </div>
  )
}
