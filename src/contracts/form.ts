import { z } from 'zod'
import type { ChartData } from './data-source'

/**
 * Formulir: forms the koperasi builds in the console and sends out by link.
 *
 * A form is never part of the website's navigation, sitemap or search index.
 * It is reached only through its own address (/formulir/<slug>), handed out on
 * WhatsApp or printed as a QR code, the way a "Survey Pra RAT" or a consent
 * form for the members' meeting is passed around. What it collects stays in
 * the console; the website may show only the tallies of its choice questions,
 * through the "Hasil Formulir" block, never anyone's own answers.
 *
 * Everything here is pure and shared: the console builds and previews with it,
 * the website validates before sending, and the API validates again on arrival.
 */

/* ------------------------------- question kinds ------------------------------ */

export const FORM_FIELD_TYPES = [
  'short_text', 'long_text', 'number', 'email', 'phone', 'date',
  'choice', 'dropdown', 'checkboxes', 'scale',
  'signature', 'image',
  'section', 'picture',
] as const
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_text: 'Jawaban singkat',
  long_text: 'Paragraf',
  number: 'Angka',
  email: 'Email',
  phone: 'Nomor telepon / WhatsApp',
  date: 'Tanggal',
  choice: 'Pilihan ganda (satu jawaban)',
  dropdown: 'Daftar pilihan (dropdown)',
  checkboxes: 'Kotak centang (boleh lebih dari satu)',
  scale: 'Skala nilai (misalnya 1–5)',
  signature: 'Tanda tangan',
  image: 'Unggah foto / gambar',
  section: 'Judul bagian (bukan pertanyaan)',
  picture: 'Gambar (bukan pertanyaan)',
}

/** Kinds with a list of options to pick from. */
export const OPTION_TYPES: readonly FormFieldType[] = ['choice', 'dropdown', 'checkboxes']
/** Kinds whose answers fall into a fixed set of buckets, so they can be counted and drawn as a chart. */
export const CHARTABLE_TYPES: readonly FormFieldType[] = ['choice', 'dropdown', 'checkboxes', 'scale']
/** Kinds whose answer is a file kept in private storage rather than text. */
export const FILE_TYPES: readonly FormFieldType[] = ['signature', 'image']
/** Kinds that can be marked "tidak boleh sama" (one response per member number, say). */
export const UNIQUE_TYPES: readonly FormFieldType[] = ['short_text', 'number', 'email', 'phone']
/**
 * Kinds that only show something and ask nothing: a heading that starts a
 * part of the form, or a picture (a chart from the annual report, a map to
 * the meeting) placed between the questions, as Google Forms' "Tambahkan
 * gambar" does. They are never answered, counted or exported.
 */
export const DISPLAY_TYPES: readonly FormFieldType[] = ['section', 'picture']
export const isQuestion = (t: FormFieldType) => !DISPLAY_TYPES.includes(t)

export const hasOptions = (t: FormFieldType) => OPTION_TYPES.includes(t)
export const isChartable = (t: FormFieldType) => CHARTABLE_TYPES.includes(t)
export const isFileType = (t: FormFieldType) => FILE_TYPES.includes(t)

export const FORM_MAX_FIELDS = 80
export const FORM_MAX_OPTIONS = 40
export const FORM_MAX_IMAGES = 5
/** A photo is shrunk in the browser before upload; this is the cap on what still arrives. */
export const FORM_FILE_MAX_BYTES = 5 * 1024 * 1024
export const FORM_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** The longest side a photo is scaled down to before it leaves the phone. */
export const FORM_IMAGE_MAX_SIDE = 1600
export const FORM_TEXT_MAX = 4000
/** Answers kept per form: far beyond any survey of the membership, and what the console lists at once. */
export const FORM_MAX_RESPONSES = 20000

export interface FormField {
  /** Short and random, fixed for the life of the question: answers are stored under it, so relabelling keeps them. */
  id: string
  type: FormFieldType
  label: string
  help?: string
  required?: boolean
  placeholder?: string
  /** choice, dropdown, checkboxes. */
  options?: string[]
  /** choice and checkboxes: add an "Lainnya: …" option with a text box. */
  allowOther?: boolean
  /** scale: the ends of the range. number: the allowed range, when set. */
  min?: number | null
  max?: number | null
  /** scale: what the two ends mean ("Sangat tidak puas" … "Sangat puas"). */
  minLabel?: string
  maxLabel?: string
  /** image: how many photos may be attached. */
  maxFiles?: number
  /** Refuse a second response with the same answer here: one form per member number. */
  unique?: boolean
  /** picture: the image, a key from the media library (or a full URL). Shown to everyone who opens the form. */
  media?: string
}

/** One answer as stored: text, a number, several picks, or file keys. Absent when left empty. */
export type FormAnswer = string | number | string[]
export type FormAnswers = Record<string, FormAnswer>

/** The prefix an "Lainnya" answer is stored with, so it counts apart from the listed options. */
export const OTHER_PREFIX = 'Lainnya: '
export const OTHER_LABEL = 'Lainnya'

/** A fresh question id: eight characters, enough that two never collide on one form. */
export function newFieldId(): string {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const bytes = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(8)) : null
  for (let i = 0; i < 8; i++) s += abc[(bytes ? bytes[i]! : Math.floor(Math.random() * 256)) % abc.length]
  return s
}

/** A new question of a kind, filled in enough to be saved as it is. */
export function blankField(type: FormFieldType): FormField {
  const base: FormField = { id: newFieldId(), type, label: '', required: false }
  if (hasOptions(type)) return { ...base, options: ['Pilihan 1', 'Pilihan 2'] }
  if (type === 'scale') return { ...base, min: 1, max: 5, minLabel: '', maxLabel: '' }
  if (type === 'image') return { ...base, maxFiles: 1 }
  if (type === 'signature') return { ...base, label: 'Tanda tangan', required: true }
  return base
}

/* ---------------------------------- schemas --------------------------------- */

export const FORM_SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A title as an address: "Survey Pra RAT 2027" → "survey-pra-rat-2027". */
export const slugifyForm = (title: string) =>
  title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '')

export const formFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]{4,16}$/, 'ID pertanyaan tidak valid'),
    type: z.enum(FORM_FIELD_TYPES),
    label: z.string().trim().max(300),
    help: z.string().trim().max(1000).optional().default(''),
    required: z.boolean().optional().default(false),
    placeholder: z.string().trim().max(120).optional().default(''),
    options: z.array(z.string().trim().min(1, 'Pilihan tidak boleh kosong').max(200)).max(FORM_MAX_OPTIONS).optional(),
    allowOther: z.boolean().optional().default(false),
    min: z.number().finite().nullable().optional(),
    max: z.number().finite().nullable().optional(),
    minLabel: z.string().trim().max(60).optional().default(''),
    maxLabel: z.string().trim().max(60).optional().default(''),
    maxFiles: z.number().int().min(1).max(FORM_MAX_IMAGES).optional(),
    unique: z.boolean().optional().default(false),
    media: z.string().trim().max(600).optional().default(''),
  })
  .superRefine((f, ctx) => {
    if (isQuestion(f.type) && !f.label) ctx.addIssue({ code: 'custom', path: ['label'], message: 'Tulis pertanyaannya' })
    if (f.type === 'picture' && !f.media) ctx.addIssue({ code: 'custom', path: ['media'], message: 'Pilih gambarnya' })
    if (f.type === 'section' && !f.label && !f.help) ctx.addIssue({ code: 'custom', path: ['label'], message: 'Tulis judul bagiannya' })
    if (hasOptions(f.type)) {
      const opts = f.options ?? []
      if (opts.length < 1) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Beri paling sedikit satu pilihan' })
      const seen = new Set<string>()
      for (const o of opts) {
        const k = o.toLocaleLowerCase('id-ID')
        if (seen.has(k)) ctx.addIssue({ code: 'custom', path: ['options'], message: `Pilihan "${o}" tertulis dua kali` })
        seen.add(k)
      }
    }
    if (f.type === 'scale') {
      const lo = f.min ?? 1, hi = f.max ?? 5
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || lo > 1 || hi < 2 || hi > 10) {
        ctx.addIssue({ code: 'custom', path: ['max'], message: 'Skala mulai dari 0 atau 1 sampai 2–10' })
      }
    }
    if (f.type === 'number' && f.min != null && f.max != null && f.min > f.max) {
      ctx.addIssue({ code: 'custom', path: ['max'], message: 'Batas atas lebih kecil dari batas bawah' })
    }
  })

const isoOrNull = z.union([z.string().datetime({ offset: true }), z.literal(''), z.null()]).optional().transform((v) => v || null)

export const formSchema = z
  .object({
    title: z.string().trim().min(3, 'Beri judul minimal 3 huruf').max(200),
    slug: z.string().trim().toLowerCase().min(3, 'Alamat minimal 3 huruf').max(80).regex(FORM_SLUG_RULE, 'Alamat hanya huruf kecil, angka, dan tanda hubung'),
    description: z.string().max(5000).optional().default(''),
    fields: z.array(formFieldSchema).max(FORM_MAX_FIELDS, `Paling banyak ${FORM_MAX_FIELDS} pertanyaan`),
    isActive: z.boolean().default(true),
    opensAt: isoOrNull,
    closesAt: isoOrNull,
    targetResponses: z.number().int().min(1).max(1_000_000).nullable().optional().default(null),
    closeAtTarget: z.boolean().default(false),
    showProgress: z.boolean().default(true),
    successMessage: z.string().trim().max(1000).optional().default(''),
    submitLabel: z.string().trim().max(40).optional().default(''),
  })
  .superRefine((f, ctx) => {
    if (!f.fields.some((x) => isQuestion(x.type))) ctx.addIssue({ code: 'custom', path: ['fields'], message: 'Tambahkan paling sedikit satu pertanyaan' })
    const ids = new Set<string>()
    f.fields.forEach((x, i) => {
      if (ids.has(x.id)) ctx.addIssue({ code: 'custom', path: ['fields', i, 'id'], message: 'ID pertanyaan kembar' })
      ids.add(x.id)
    })
    if (f.opensAt && f.closesAt && new Date(f.opensAt) >= new Date(f.closesAt)) {
      ctx.addIssue({ code: 'custom', path: ['closesAt'], message: 'Waktu tutup harus setelah waktu buka' })
    }
    if (f.closeAtTarget && !f.targetResponses) ctx.addIssue({ code: 'custom', path: ['targetResponses'], message: 'Isi target responden dulu' })
  })

export type FormInput = z.input<typeof formSchema>
export type FormValues = z.output<typeof formSchema>

/* ---------------------------------- status ---------------------------------- */

export type FormStatus = 'open' | 'inactive' | 'not_started' | 'ended' | 'full'

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  open: 'Menerima jawaban',
  inactive: 'Ditutup',
  not_started: 'Belum dibuka',
  ended: 'Periode berakhir',
  full: 'Target tercapai',
}

interface StatusInput {
  isActive: boolean
  opensAt?: string | Date | null
  closesAt?: string | Date | null
  targetResponses?: number | null
  closeAtTarget?: boolean
}

/** Whether a form takes answers right now, and if not, why. */
export function formStatus(form: StatusInput, responses: number, now: Date = new Date()): FormStatus {
  if (!form.isActive) return 'inactive'
  if (form.opensAt && new Date(form.opensAt).getTime() > now.getTime()) return 'not_started'
  if (form.closesAt && new Date(form.closesAt).getTime() <= now.getTime()) return 'ended'
  if (form.closeAtTarget && form.targetResponses && responses >= form.targetResponses) return 'full'
  return 'open'
}

const longDate = (d: string | Date) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).format(new Date(d))

/** What a visitor reads in place of the form when it is not taking answers. */
export function formClosedMessage(status: FormStatus, form: StatusInput): string {
  switch (status) {
    case 'not_started': return `Formulir ini baru bisa diisi mulai ${longDate(form.opensAt!)} WITA.`
    case 'ended': return 'Periode pengisian formulir ini sudah berakhir. Terima kasih atas perhatian Anda.'
    case 'full': return 'Jumlah responden untuk formulir ini sudah mencapai target. Terima kasih atas partisipasi Anda.'
    case 'inactive': return 'Formulir ini sedang tidak menerima jawaban.'
    default: return ''
  }
}

/** Responses against the target, as a whole percentage capped at 100; null without a target. */
export function targetProgress(responses: number, target: number | null | undefined): number | null {
  if (!target || target <= 0) return null
  return Math.min(100, Math.floor((responses / target) * 100))
}

/* --------------------------------- answers ---------------------------------- */

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Indonesian numbers as people type them: 08…, +62…, 62…; 9–15 digits once the noise is gone. */
const PHONE_RULE = /^(?:\+?62|0)\d{8,13}$/
const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)

/** The range a scale question runs over. */
export const scaleRange = (f: Pick<FormField, 'min' | 'max'>) => {
  const lo = f.min ?? 1
  const hi = f.max ?? 5
  return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i)
}

export interface AnswerCheck {
  answers: FormAnswers
  /** By question id, in words a member can act on. */
  errors: Record<string, string>
}

/**
 * Answers as sent, checked against the questions and tidied for storage.
 *
 * Unknown keys are dropped, text is trimmed, a choice must be one of the
 * options (or "Lainnya: …" when the question allows it), and a number is a
 * number. File answers are only checked for shape here: each is a storage key,
 * and the API checks the keys belong to this form before keeping them.
 */
export function checkAnswers(fields: FormField[], raw: Record<string, unknown>): AnswerCheck {
  const answers: FormAnswers = {}
  const errors: Record<string, string> = {}

  for (const f of fields) {
    if (!isQuestion(f.type)) continue
    let v = raw[f.id]
    if (typeof v === 'string') v = v.trim()
    if (isEmpty(v)) {
      if (f.required) errors[f.id] = f.type === 'signature' ? 'Bubuhkan tanda tangan Anda.' : f.type === 'image' ? 'Unggah foto yang diminta.' : hasOptions(f.type) || f.type === 'scale' ? 'Pilih salah satu jawaban.' : 'Pertanyaan ini wajib diisi.'
      continue
    }

    switch (f.type) {
      case 'short_text':
      case 'long_text': {
        const s = String(v)
        if (s.length > (f.type === 'short_text' ? 500 : FORM_TEXT_MAX)) { errors[f.id] = 'Jawaban terlalu panjang.'; break }
        answers[f.id] = s
        break
      }
      case 'email': {
        const s = String(v).toLowerCase()
        if (!EMAIL_RULE.test(s) || s.length > 200) { errors[f.id] = 'Alamat email tidak valid.'; break }
        answers[f.id] = s
        break
      }
      case 'phone': {
        const s = String(v).replace(/[\s().-]/g, '')
        if (!PHONE_RULE.test(s)) { errors[f.id] = 'Nomor telepon tidak valid. Contoh: 081234567890.'; break }
        answers[f.id] = s
        break
      }
      case 'number': {
        const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
        if (!Number.isFinite(n)) { errors[f.id] = 'Isi dengan angka.'; break }
        if (f.min != null && n < f.min) { errors[f.id] = `Paling kecil ${f.min}.`; break }
        if (f.max != null && n > f.max) { errors[f.id] = `Paling besar ${f.max}.`; break }
        answers[f.id] = n
        break
      }
      case 'date': {
        const s = String(v)
        if (!DATE_RULE.test(s) || Number.isNaN(new Date(`${s}T00:00:00Z`).getTime())) { errors[f.id] = 'Tanggal tidak valid.'; break }
        answers[f.id] = s
        break
      }
      case 'scale': {
        const n = Number(v)
        if (!scaleRange(f).includes(n)) { errors[f.id] = 'Pilih salah satu nilai.'; break }
        answers[f.id] = n
        break
      }
      case 'choice':
      case 'dropdown': {
        const s = String(v)
        const picked = pickOption(f, s)
        if (picked === null) { errors[f.id] = f.allowOther && s.startsWith(OTHER_PREFIX) ? 'Tuliskan jawaban “Lainnya”.' : 'Pilihan tidak dikenal.'; break }
        answers[f.id] = picked
        break
      }
      case 'checkboxes': {
        const list = (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean)
        const picked: string[] = []
        let bad = false
        for (const s of list) {
          const p = pickOption(f, s)
          if (p === null) { bad = true; break }
          if (!picked.includes(p)) picked.push(p)
        }
        if (bad) { errors[f.id] = 'Pilihan tidak dikenal.'; break }
        if (picked.length) answers[f.id] = picked
        else if (f.required) errors[f.id] = 'Pilih paling sedikit satu jawaban.'
        break
      }
      case 'signature': {
        const s = String(v)
        if (!/^forms\/[\w/.-]{10,300}$/.test(s)) { errors[f.id] = 'Tanda tangan belum terunggah. Coba lagi.'; break }
        answers[f.id] = s
        break
      }
      case 'image': {
        const list = (Array.isArray(v) ? v : [v]).map(String)
        if (list.length > (f.maxFiles ?? 1)) { errors[f.id] = `Paling banyak ${f.maxFiles ?? 1} foto.`; break }
        if (list.some((s) => !/^forms\/[\w/.-]{10,300}$/.test(s))) { errors[f.id] = 'Foto belum terunggah. Coba lagi.'; break }
        answers[f.id] = list
        break
      }
    }
  }
  return { answers, errors }
}

/** The stored form of a choice: the option as written in the form, or "Lainnya: …"; null when it is neither. */
function pickOption(f: FormField, s: string): string | null {
  const hit = (f.options ?? []).find((o) => o.toLocaleLowerCase('id-ID') === s.toLocaleLowerCase('id-ID'))
  if (hit) return hit
  if (f.allowOther && f.type !== 'dropdown' && s.startsWith(OTHER_PREFIX)) {
    const rest = s.slice(OTHER_PREFIX.length).trim().slice(0, 300)
    return rest ? `${OTHER_PREFIX}${rest}` : null
  }
  return null
}

/** The value a "tidak boleh sama" question is compared by: case and spacing ignored. */
export const uniqueKey = (v: FormAnswer | undefined) =>
  v === undefined ? '' : String(Array.isArray(v) ? v.join(',') : v).replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID')

/** File keys an answer set refers to, in question order. */
export function answerFiles(fields: FormField[], answers: FormAnswers): string[] {
  const keys: string[] = []
  for (const f of fields) {
    if (!isFileType(f.type)) continue
    const v = answers[f.id]
    if (typeof v === 'string') keys.push(v)
    else if (Array.isArray(v)) keys.push(...v)
  }
  return keys
}

const idNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 })

/** An answer as one line of text: for the table, the export and search. Files read as a count. */
export function answerText(f: FormField, v: FormAnswer | undefined): string {
  if (v === undefined || v === null || v === '') return ''
  if (f.type === 'signature') return 'Ada tanda tangan'
  if (f.type === 'image') return `${Array.isArray(v) ? v.length : 1} foto`
  if (f.type === 'date' && typeof v === 'string' && DATE_RULE.test(v)) {
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }
  if (typeof v === 'number') return idNumber.format(v)
  if (Array.isArray(v)) return v.join(', ')
  return v
}

/* ---------------------------------- charts ---------------------------------- */

/**
 * How a choice question was answered, as a chart: one bar per option in the
 * order the form lists them, options nobody picked included (a zero is an
 * answer too), and every "Lainnya: …" folded into one "Lainnya" bar.
 * Checkboxes count each tick, so the bars can add up to more than the number
 * of respondents.
 */
export function questionChart(f: FormField, answers: (FormAnswer | undefined)[]): ChartData {
  if (!isChartable(f.type)) return { labels: [], series: [] }
  const labels: string[] = f.type === 'scale' ? scaleRange(f).map(String) : [...(f.options ?? [])]
  const index = new Map(labels.map((l, i) => [l.toLocaleLowerCase('id-ID'), i]))
  const counts = labels.map(() => 0)
  let other = 0
  for (const v of answers) {
    if (v === undefined || v === null || v === '') continue
    for (const one of Array.isArray(v) ? v : [v]) {
      const at = index.get(String(one).toLocaleLowerCase('id-ID'))
      if (at !== undefined) counts[at]!++
      else if (String(one).startsWith(OTHER_PREFIX)) other++
    }
  }
  if (other || (f.allowOther && f.type !== 'scale')) { labels.push(OTHER_LABEL); counts.push(other) }
  if (f.type === 'scale') {
    if (f.minLabel) labels[0] = `${labels[0]} · ${f.minLabel}`
    if (f.maxLabel) labels[labels.length - 1] = `${labels[labels.length - 1]} · ${f.maxLabel}`
  }
  return { labels, series: [{ name: 'Jawaban', values: counts }] }
}

/** How many responses answered a question at all. */
export const answeredCount = (fieldId: string, responses: { answers: FormAnswers }[]) =>
  responses.reduce((n, r) => (isEmpty(r.answers[fieldId]) ? n : n + 1), 0)

/** The average of a scale or number question, or null when nobody answered it. */
export function averageOf(fieldId: string, responses: { answers: FormAnswers }[]): number | null {
  let sum = 0, n = 0
  for (const r of responses) {
    const v = r.answers[fieldId]
    if (typeof v === 'number' && Number.isFinite(v)) { sum += v; n++ }
  }
  return n ? Math.round((sum / n) * 100) / 100 : null
}

/* ------------------------- the website's "Hasil Formulir" -------------------- */

/** A "Hasil Formulir" block points at one question of one form, stored as "<formId>:<questionId>". */
export const formQuestionRef = (formId: string, fieldId: string) => `${formId}:${fieldId}`
export function parseFormQuestionRef(ref: string | null | undefined): { formId: string; fieldId: string } | null {
  const m = String(ref ?? '').match(/^([0-9a-f-]{36}):([a-z0-9]{4,16})$/i)
  return m ? { formId: m[1]!, fieldId: m[2]! } : null
}

/** What the website receives for a "Hasil Formulir" block: tallies only, never an answer of anyone's own. */
export interface PublicFormResult {
  formId: string
  formTitle: string
  question: string
  chart: ChartData
  /** Everyone who sent the form. */
  responses: number
  /** Of them, those who answered this question. */
  answered: number
  target: number | null
  updatedAt: string
}

/** What the website receives to draw a form. */
export interface PublicForm {
  id: string
  slug: string
  title: string
  description: string
  fields: FormField[]
  status: FormStatus
  /** Set when the form is not taking answers; what to show instead. */
  closedMessage: string
  submitLabel: string
  /** Shown only when the form asks to show its progress. */
  progress: { responses: number; target: number | null } | null
  closesAt: string | null
}

export const DEFAULT_FORM_SUCCESS = 'Terima kasih, jawaban Anda sudah kami terima.'
export const DEFAULT_FORM_SUBMIT = 'Kirim jawaban'
