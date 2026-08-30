'use client'

import { useState, type FormEvent } from 'react'
import { apiPost, track, API_BASE } from '@/lib/client'
import { Action, Icon, Label } from '../ui'
import { Field, Note, Check, field } from '../ui/form'

const MAX_CV_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export function JobApplicationForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const fd = new FormData(e.currentTarget)
    const file = fd.get('cv') as File | null
    if (!file || !file.size) return setError('CV wajib diunggah.')
    if (file.size > MAX_CV_BYTES) return setError('Ukuran CV maksimal 5 MB.')
    if (!ACCEPTED.includes(file.type)) return setError('Format CV harus PDF, DOC, atau DOCX.')

    // Presign → upload direct to storage → submit only the key. The file never
    // passes through the API, so Vercel's 4.5 MB body limit does not apply.
    setStatus('uploading')
    const presign = await fetch(`${API_BASE}/v1/public/job-applications/presign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, folder: 'cv' }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ data: { url: string; key: string; headers: Record<string, string> } }>) : null))
      .catch(() => null)

    if (!presign) {
      setStatus('idle')
      return setError('Gagal menyiapkan unggahan. Silakan coba lagi.')
    }

    const uploaded = await fetch(presign.data.url, { method: 'PUT', body: file, headers: presign.data.headers })
      .then((r) => r.ok).catch(() => false)

    if (!uploaded) {
      setStatus('idle')
      return setError('Gagal mengunggah CV. Periksa koneksi Anda dan coba lagi.')
    }

    setStatus('sending')
    const res = await apiPost('/public/job-applications', {
      jobId,
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      bio: String(fd.get('bio') ?? '') || undefined,
      cvKey: presign.data.key,
      consent: fd.get('consent') === 'on',
      website: String(fd.get('website') ?? ''),
    })

    if (!res.ok) {
      setStatus('idle')
      return setError(res.message)
    }

    track('job_apply', { jobId })
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-green-600 text-white"><Icon.check className="size-7" /></span>
        <h2 className="t-h2 mt-5 text-navy-800">Lamaran terkirim</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
          Terima kasih. Lamaran Anda untuk posisi <strong className="font-semibold text-navy-800">{jobTitle}</strong> sudah kami terima.
          Tim kami menghubungi jika berkas Anda sesuai kualifikasi.
        </p>
        <Action href="/karir" variant="outline" className="mt-6">Lihat lowongan lain</Action>
      </div>
    )
  }

  const busy = status === 'uploading' || status === 'sending'

  return (
    <div className="relative rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
      
      <p className="t-label mb-2">Lamar posisi ini</p>
      <p className="text-[14px] text-slate-500">Isi data Anda dan unggah CV terbaru.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-5">
        <Field label="Nama lengkap" htmlFor="job-name" required>
          <input id="job-name" name="name" required autoComplete="name" className={field} />
        </Field>
        <Field label="Email" htmlFor="job-email" required>
          <input id="job-email" name="email" type="email" required autoComplete="email" className={field} />
        </Field>
        <Field label="Nomor WhatsApp" htmlFor="job-phone" required>
          <input id="job-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" className={field} />
        </Field>
        <Field label="Ceritakan singkat tentang Anda" htmlFor="job-bio">
          <textarea id="job-bio" name="bio" rows={4} className={field} placeholder="Pengalaman kerja, keahlian, atau alasan melamar." />
        </Field>

        <Field label="Unggah CV" htmlFor="job-cv" required hint={fileName || 'Format PDF, DOC, atau DOCX. Maksimal 5 MB.'}>
          <input
            id="job-cv" name="cv" type="file" required accept=".pdf,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="w-full rounded-[var(--radius-input)] border border-dashed border-slate-300 bg-surface-alt px-4 py-3.5 text-[14px] text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white hover:file:bg-green-700"
          />
        </Field>

        <div aria-hidden="true" className="absolute -left-[9999px]">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <Check name="consent" required>
          Saya menyetujui penyimpanan dan pengolahan data lamaran saya oleh KSP Sari Sedana Bali.
        </Check>

        {error ? <Note>{error}</Note> : null}

        <Action type="submit" size="lg" disabled={busy} full>
          {status === 'uploading' ? 'Mengunggah CV…' : status === 'sending' ? 'Mengirim…' : 'Kirim Lamaran'}
        </Action>
        <p className="text-center text-[12px] leading-relaxed text-slate-400">
          Berkas lamaran disimpan privat dan dihapus otomatis setelah 12 bulan.
        </p>
      </form>
    </div>
  )
}
