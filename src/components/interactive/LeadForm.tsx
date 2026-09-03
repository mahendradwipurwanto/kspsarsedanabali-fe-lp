'use client'

import { useState, type FormEvent } from 'react'
import type { Product, Branch } from '@/lib/api'
import { apiPost, sessionId, track } from '@/lib/client'
import { Action, Icon } from '../ui'
import { Field, Note, Check, Select, field } from '../ui/form'

export function LeadForm({
  askProduct, askBranch, successMessage, products, branches, source = 'contact_form', defaultProductId,
  title = 'Kirim Permintaan',
}: {
  title?: string
  askProduct: boolean
  askBranch: boolean
  successMessage: string
  products: Product[]
  branches: Branch[]
  source?: string
  defaultProductId?: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    setFieldErrors({})

    const fd = new FormData(e.currentTarget)
    const productId = String(fd.get('productId') ?? '')
    const product = products.find((p) => p.id === productId)

    const res = await apiPost('/public/leads', {
      name: String(fd.get('name') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      email: String(fd.get('email') ?? '') || undefined,
      message: String(fd.get('message') ?? '') || undefined,
      productId: productId || undefined,
      branchId: String(fd.get('branchId') ?? '') || undefined,
      interest: product?.category ?? undefined,
      source,
      sessionId: sessionId(),
      consent: fd.get('consent') === 'on',
      website: String(fd.get('website') ?? ''),
    })

    if (res.ok) {
      track('lead_submit', { source, productId: productId || null })
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
        <h3 className="t-h2 mt-5 text-ink-900">Pesan Anda sudah kami terima</h3>
        <p className="t-lead mt-4">{successMessage}</p>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-[13.5px] text-ink-500">Butuh lebih cepat? Hubungi kantor terdekat langsung.</p>
          <Action href="/lokasi" variant="outline" className="mt-4">
            Lihat kantor terdekat
            <Icon.arrow className="size-4" />
          </Action>
        </div>
      </div>
    )
  }

  return (
    <div className="surface relative overflow-hidden p-6 sm:p-8 lg:sticky lg:top-24">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
            
      <h3 className="mb-6 t-h3">{title}</h3>


      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <Field label="Nama lengkap" htmlFor="lead-name" required error={fieldErrors.name}>
          <input id="lead-name" name="name" required autoComplete="name" placeholder="Nama lengkap Anda" className={field}
            aria-describedby={fieldErrors.name ? 'lead-name-error' : undefined} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nomor WhatsApp" htmlFor="lead-phone" required error={fieldErrors.phone}>
            <input id="lead-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel"
              placeholder="08xx xxxx xxxx" className={field} aria-describedby={fieldErrors.phone ? 'lead-phone-error' : undefined} />
          </Field>
          <Field label="Email" htmlFor="lead-email" error={fieldErrors.email}>
            <input id="lead-email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" className={field} />
          </Field>
        </div>

        {askProduct && products.length ? (
          <Field label="Produk yang diminati" htmlFor="lead-product">
            {/* The old `<optgroup>` becomes a per-row hint: the category still
                reads, and every row stays selectable and reachable by type-ahead. */}
            <Select
              id="lead-product"
              name="productId"
              defaultValue={defaultProductId ?? ''}
              placeholder="Belum tahu, mohon dibantu"
              options={[
                { value: '', label: 'Belum tahu, mohon dibantu' },
                ...[...products]
                  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                    hint: p.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan',
                  })),
              ]}
            />
          </Field>
        ) : null}

        {askBranch && branches.length ? (
          <Field label="Cabang terdekat" htmlFor="lead-branch" hint="Agar petugas cabang yang tepat yang menghubungi Anda.">
            <Select
              id="lead-branch"
              name="branchId"
              placeholder="Pilih kantor terdekat"
              options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.district ?? undefined }))}
            />
          </Field>
        ) : null}

        <Field label="Pesan" htmlFor="lead-message">
          <textarea id="lead-message" name="message" rows={3} placeholder="Ceritakan kebutuhan Anda secara singkat." className={field} />
        </Field>

        {/* Honeypot — invisible to people, irresistible to bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px]">
          <label htmlFor="lead-website">Website</label>
          <input id="lead-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <Check name="consent" required>
          Saya bersedia dihubungi petugas KSP Sari Sedana Bali. Data Anda hanya
          dipakai untuk menindaklanjuti permintaan ini.
        </Check>

        {error ? <Note>{error}</Note> : null}

        <Action type="submit" size="lg" shape="rect" disabled={status === 'sending'} full className="mt-1">
          {status === 'sending' ? 'Mengirim…' : 'Kirim dan minta dihubungi'}
          {status === 'idle' ? <Icon.arrow className="size-4 transition-transform duration-300 group-hover/act:translate-x-1" /> : null}
        </Action>

        <p className="text-center text-[12px] leading-relaxed text-ink-400">
          Data Anda hanya dipakai untuk menghubungi Anda dan tidak dibagikan ke pihak lain.
        </p>
      </form>
    </div>
  )
}
