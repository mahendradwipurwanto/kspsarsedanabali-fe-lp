'use client'

import { useState, type FormEvent } from 'react'
import {
  FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, isValidPhone, isValidEmail,
  cleanPhoneInput, PHONE_ERROR, PHONE_HINT, EMAIL_ERROR, type FeedbackCategory,
} from '@/contracts'
import type { Branch } from '@/lib/api'
import { apiPost, sessionId, track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { Field, Note, Select, field } from '../ui/form'

/**
 * The suggestion box, online.
 *
 * Deliberately answerable without saying who you are: someone complaining
 * about how they were treated at a counter will not fill in a name field
 * first, and a complaint nobody files teaches the koperasi nothing. Name,
 * email and phone stay optional, and only the message is required.
 */
export function FeedbackForm({
  askIdentity, askBranch, askRating, successMessage, note, branches, title = 'Sampaikan Masukan',
}: {
  askIdentity: boolean
  askBranch: boolean
  askRating: boolean
  successMessage: string
  note?: string
  branches: Branch[]
  title?: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [category, setCategory] = useState<FeedbackCategory>('saran')
  const [rating, setRating] = useState(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    setFieldErrors({})

    const form = e.currentTarget
    const fd = new FormData(form)

    // Contact details are optional, but a wrong one is worse than none: it
    // makes the koperasi think it can reply when it cannot.
    const problems: Record<string, string> = {}
    const phone = String(fd.get('phone') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    if (phone && !isValidPhone(phone)) problems.phone = PHONE_ERROR
    if (email && !isValidEmail(email)) problems.email = EMAIL_ERROR
    if (Object.keys(problems).length) {
      setStatus('idle')
      setFieldErrors(problems)
      ;(form.querySelector(problems.phone ? '#fb-phone' : '#fb-email') as HTMLInputElement | null)?.focus()
      return
    }

    const res = await apiPost('/public/feedback', {
      category,
      rating: askRating && rating > 0 ? rating : undefined,
      name: String(fd.get('name') ?? '') || undefined,
      email: email || undefined,
      phone: phone || undefined,
      subject: String(fd.get('subject') ?? '') || undefined,
      message: String(fd.get('message') ?? ''),
      branchId: String(fd.get('branchId') ?? '') || undefined,
      sessionId: await sessionId(),
      website: String(fd.get('website') ?? ''),
    })

    if (res.ok) {
      track('feedback_submit', { category, rating: rating || null })
      setStatus('done')
    } else {
      setStatus('idle')
      setError(res.message)
      if (res.fields) setFieldErrors(res.fields)
    }
  }

  if (status === 'done') {
    return (
      <div className="surface relative overflow-hidden p-8 text-center sm:p-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
        <span className="mx-auto grid size-14 place-items-center rounded-[var(--radius-tile)] bg-green-600 text-white"><Icon.check className="size-7" /></span>
        <h3 className="t-h2 mt-5 text-ink-900">Masukan Anda terkirim</h3>
        <p className="t-lead mt-4">{successMessage}</p>
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-[13.5px] text-ink-500">Ingin menyampaikan hal lain?</p>
          <button
            type="button"
            onClick={() => { setStatus('idle'); setRating(0); setCategory('saran') }}
            className="mt-4 cursor-pointer text-[14px] font-semibold text-green-700 underline underline-offset-4 hover:text-green-800"
          >
            Tulis masukan lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="surface relative overflow-hidden p-6 sm:p-8">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
      <h3 className="t-h3 mb-6">{title}</h3>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <Field label="Jenis masukan" required>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis masukan">
            {FEEDBACK_CATEGORIES.map((c) => {
              const active = c === category
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(c)}
                  className={`min-h-[44px] cursor-pointer rounded-[var(--radius-input)] border px-4 text-[14px] font-semibold transition-colors duration-200 [transition-timing-function:var(--ease-swift)] ${
                    active ? 'border-ink-900 bg-ink-900 text-white' : 'border-line bg-white text-ink-600 hover:border-ink-900 hover:text-ink-900'
                  }`}
                >
                  {FEEDBACK_CATEGORY_LABELS[c]}
                </button>
              )
            })}
          </div>
        </Field>

        {askRating ? (
          <Field label="Penilaian layanan" hint="Opsional. Ketuk bintang untuk memberi nilai.">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Penilaian layanan">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} dari 5 bintang`}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="cursor-pointer p-1 text-gold-400 transition-transform duration-150 hover:scale-110"
                >
                  <Icon.star className={`size-7 ${n <= rating ? 'fill-gold-400' : 'fill-transparent text-line-strong'}`} />
                </button>
              ))}
              {rating > 0 ? <span className="ml-2 text-[13px] text-ink-500">{rating} dari 5</span> : null}
            </div>
          </Field>
        ) : null}

        <Field label="Judul singkat" htmlFor="fb-subject" error={fieldErrors.subject}>
          <input id="fb-subject" name="subject" maxLength={150} placeholder="Contoh: Antrean di kantor pusat" className={field} />
        </Field>

        <Field label="Isi masukan" htmlFor="fb-message" required error={fieldErrors.message}>
          <textarea
            id="fb-message"
            name="message"
            required
            rows={5}
            minLength={10}
            maxLength={4000}
            placeholder="Ceritakan pengalaman, keluhan, atau usulan Anda selengkap mungkin."
            className={field}
            aria-describedby={fieldErrors.message ? 'fb-message-error' : undefined}
          />
        </Field>

        {askBranch && branches.length ? (
          <Field label="Kantor yang dimaksud" htmlFor="fb-branch" hint="Opsional. Membantu kami meneruskan ke kantor yang tepat.">
            <Select
              id="fb-branch"
              name="branchId"
              placeholder="Tidak spesifik"
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Field>
        ) : null}

        {askIdentity ? (
          <>
            <Field label="Nama" htmlFor="fb-name" hint="Opsional. Kosongkan bila ingin anonim.">
              <input id="fb-name" name="name" maxLength={120} autoComplete="name" placeholder="Nama Anda" className={field} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nomor WhatsApp" htmlFor="fb-phone" error={fieldErrors.phone} hint={fieldErrors.phone ? undefined : PHONE_HINT}>
                <input
                  id="fb-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={16} pattern="[0-9+]*"
                  onInput={(e) => { e.currentTarget.value = cleanPhoneInput(e.currentTarget.value) }}
                  placeholder="081234567890" className={field}
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby={fieldErrors.phone ? 'fb-phone-error' : undefined}
                />
              </Field>
              <Field label="Email" htmlFor="fb-email" error={fieldErrors.email}>
                <input id="fb-email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" className={field} aria-invalid={fieldErrors.email ? true : undefined} />
              </Field>
            </div>
          </>
        ) : null}

        {/* Honeypot: off-screen and hidden from assistive tech, never filled by a person. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] size-px opacity-0" />

        {error ? <Note>{error}</Note> : null}

        <Action type="submit" variant="primary" disabled={status === 'sending'} full>
          {status === 'sending' ? 'Mengirim…' : 'Kirim masukan'}
          {status === 'sending' ? null : <Icon.arrow className="size-4" />}
        </Action>

        {note ? <p className="text-center text-[12.5px] leading-relaxed text-ink-400">{note}</p> : null}
      </form>
    </div>
  )
}
