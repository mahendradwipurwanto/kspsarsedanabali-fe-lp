'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LEAD_PURPOSES, calculateInstallment, formatRupiah, formatRupiahShort, waLink } from '@/contracts'
import type { Product, Branch } from '@/lib/api'
import { apiPost, sessionId, track, API_BASE } from '@/lib/client'
import { Action, Icon } from '../ui'
import { Field, Slider, Segments, Check, Note, Select, field } from '../ui/form'

interface Answers { need?: 'pinjaman' | 'simpanan'; purposes: string[]; amount: number; tenorMonths: number }
interface Recommendation {
  best: { product: Product; score: number; reasons: string[]; estimate: { monthly: number; total: number; totalInterest: number } | null } | null
  alternatives: { product: Product; score: number }[]
}

const TOTAL = 4
const STEP_TITLES = ['Kebutuhan', 'Keperluan', 'Nominal', 'Kontak']

const PURPOSE_ICONS: Record<string, typeof Icon.wallet> = {
  modal_usaha: Icon.wallet,
  renovasi_rumah: Icon.shield,
  biaya_pendidikan: Icon.award,
  upacara_adat: Icon.spark,
  beli_kendaraan: Icon.arrow,
  kebutuhan_lain: Icon.compass,
}

export function ProfilingWizard({ products, branches }: { products: Product[]; branches: Branch[] }) {
  const router = useRouter()
  const params = useSearchParams()

  // Step lives in the URL so back/forward works and the funnel is measurable.
  const step = Math.min(Math.max(Number(params.get('step') ?? 1) || 1, 1), TOTAL)
  const [answers, setAnswers] = useState<Answers>({ purposes: [], amount: 75_000_000, tenorMonths: 36 })
  const [result, setResult] = useState<Recommendation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const setStep = useCallback((next: number) => {
    const sp = new URLSearchParams(params.toString())
    sp.set('step', String(next))
    router.push(`/profiling?${sp}`, { scroll: false })
  }, [params, router])

  // Partial answers persist at every step, so an abandoned wizard still shows
  // the koperasi where people drop off.
  useEffect(() => {
    if (!answers.need) return
    void apiPost('/public/profiling/session', { sessionId: sessionId(), step, answers })
  }, [step, answers])

  useEffect(() => { track('profiling_step', { step }) }, [step])

  const loanProducts = useMemo(() => products.filter((p) => p.category === 'pinjaman'), [products])
  const bounds = useMemo(() => {
    const relevant = answers.need === 'simpanan' ? products.filter((p) => p.category === 'simpanan') : loanProducts
    return {
      min: Math.min(...relevant.map((p) => p.minAmount ?? 1_000_000)),
      max: Math.max(...relevant.map((p) => p.maxAmount ?? 500_000_000)),
    }
  }, [answers.need, loanProducts, products])

  const liveEstimate = useMemo(() => {
    if (answers.need !== 'pinjaman') return null
    const cheapest = loanProducts.filter((p) => p.ratePercent != null).sort((a, b) => (a.ratePercent ?? 0) - (b.ratePercent ?? 0))[0]
    if (!cheapest?.ratePercent) return null
    return calculateInstallment({
      principal: answers.amount, annualRatePercent: cheapest.ratePercent, months: answers.tenorMonths, method: cheapest.rateMethod,
    })
  }, [answers, loanProducts])

  async function onSubmitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    // The server computes the recommendation, so stored figures are the API's,
    // not whatever the browser claimed.
    const recRes = await fetch(`${API_BASE}/v1/public/profiling/recommend`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...answers, sessionId: sessionId() }),
    }).then((r) => (r.ok ? (r.json() as Promise<{ data: Recommendation }>) : null)).catch(() => null)

    const leadRes = await apiPost('/public/leads', {
      name: String(fd.get('name') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      branchId: String(fd.get('branchId') ?? '') || undefined,
      productId: recRes?.data.best?.product.id,
      interest: answers.need,
      amount: answers.need === 'pinjaman' ? answers.amount : undefined,
      tenorMonths: answers.need === 'pinjaman' ? answers.tenorMonths : undefined,
      purposes: answers.purposes,
      source: 'profiling',
      sessionId: sessionId(),
      consent: fd.get('consent') === 'on',
      website: String(fd.get('website') ?? ''),
    })

    setSubmitting(false)
    if (!leadRes.ok) return setError(leadRes.message)
    track('profiling_complete', { need: answers.need, amount: answers.amount, tenor: answers.tenorMonths })
    setResult(recRes?.data ?? { best: null, alternatives: [] })
    setDone(true)
  }

  if (done) return <ResultPanel result={result} answers={answers} branches={branches} />

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress as a ruled register, not a rounded bar. */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {STEP_TITLES.map((title, i) => {
          const n = i + 1
          const state = n < step ? 'done' : n === step ? 'now' : 'todo'
          return (
            <li key={title}>
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-colors duration-500 [transition-timing-function:var(--ease-settle)] ${
                  state === 'now' ? 'bg-ink-900' : state === 'done' ? 'bg-green-500' : 'bg-ink-100'
                }`}
              />
              <span className="mt-2.5 block pb-1">
                <span className={`tnum block text-[10.5px] font-bold tracking-[0.16em] ${state === 'todo' ? 'text-ink-300' : state === 'now' ? 'text-ink-900' : 'text-green-600'}`}>
                  {String(n).padStart(2, '0')}
                </span>
                <span className={`mt-0.5 hidden text-[12.5px] font-semibold sm:block ${state === 'now' ? 'text-ink-900' : 'text-ink-400'}`}>
                  {title}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="surface relative p-5 sm:p-9">
        
        {step === 1 ? (
          <fieldset>
            <legend className="t-h2 text-ink-900">Apa yang Anda butuhkan hari ini?</legend>
            <p className="mt-3 text-[14.5px] text-ink-500">Pilih salah satu.</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { value: 'pinjaman' as const, n: '01', title: 'Saya butuh pinjaman', body: 'Modal usaha, renovasi, pendidikan, kendaraan, atau kebutuhan mendesak.', IconCmp: Icon.wallet },
                { value: 'simpanan' as const, n: '02', title: 'Saya mau menabung', body: 'Simpanan harian, berjangka, SIGEMAS, dan SIMAPAN untuk masa depan.', IconCmp: Icon.piggy },
              ].map((opt) => {
                const active = answers.need === opt.value
                return (
                  <label
                    key={opt.value}
                    className={`group relative flex cursor-pointer flex-col gap-4 rounded-[var(--radius-card)] border p-5 transition-all duration-200 sm:min-h-[240px] sm:p-6 ${
                      active ? 'border-ink-900 bg-paper' : 'border-line bg-white hover:border-ink-900'
                    }`}
                  >
                    <input type="radio" name="need" value={opt.value} checked={active}
                      onChange={() => setAnswers((a) => ({ ...a, need: opt.value }))} className="sr-only" />
                    <span className="flex items-center justify-between">
                      <span className={`grid size-14 place-items-center rounded-[var(--radius-tile)] border transition-colors duration-300 ${active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-line bg-paper text-ink-700 group-hover:border-ink-900'}`}>
                        <opt.IconCmp className="size-7" />
                      </span>
                      <span className={`tnum text-[11px] font-bold tracking-[0.16em] ${active ? 'text-ink-900' : 'text-ink-300'}`}>{opt.n}</span>
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[17px] font-bold text-ink-900`}>{opt.title}</span>
                      <span className="mt-1.5 block text-[14px] leading-relaxed text-ink-500">{opt.body}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute right-5 top-5 grid size-5 place-items-center rounded-full border-2 transition-colors ${
                        active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-line-strong'
                      }`}
                    >
                      {active ? <Icon.check className="size-3.5" /> : null}
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="mt-8">
              <Action onClick={() => setStep(2)} disabled={!answers.need} size="lg" full>
                Lanjut
                <Icon.arrow className="size-4" />
              </Action>
              <p className="mt-3.5 text-center text-[12px] text-ink-400">± 30 detik · tanpa perlu daftar akun</p>
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="t-h2 text-ink-900">
              {answers.need === 'simpanan' ? 'Menabung untuk keperluan apa?' : 'Dana ini untuk keperluan apa?'}
            </legend>
            <p className="mt-3 text-[14.5px] text-ink-500">Boleh pilih lebih dari satu.</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {LEAD_PURPOSES.map((purpose) => {
                const active = answers.purposes.includes(purpose.value)
                const PurposeIcon = PURPOSE_ICONS[purpose.value] ?? Icon.spark
                return (
                  <label
                    key={purpose.value}
                    className={`group flex min-h-[76px] cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 py-3.5 text-[15px] transition-all duration-200 ${
                      active ? 'border-ink-900 bg-paper font-semibold text-ink-900' : 'border-line bg-white text-ink-600 hover:border-ink-900'
                    }`}
                  >
                    <input
                      type="checkbox" checked={active} className="sr-only"
                      onChange={() =>
                        setAnswers((a) => ({
                          ...a,
                          purposes: active ? a.purposes.filter((x) => x !== purpose.value) : [...a.purposes, purpose.value],
                        }))
                      }
                    />
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-tile)] border transition-colors duration-300 ${active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-line bg-paper text-ink-700'}`}>
                        <PurposeIcon className="size-5" />
                      </span>
                      <span className="leading-snug">{purpose.label}</span>
                    </span>
                    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-line-strong'}`}>
                      {active ? <Icon.check className="size-3.5" /> : null}
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="mt-7">
              <Note tone="gold">
                <strong className="font-semibold">Kenapa ini ditanya?</strong> Supaya kami menawarkan produk yang benar-benar cocok,
                bukan menawarkan semuanya.
              </Note>
            </div>

            <div className="mt-8 flex gap-3">
              <Action variant="outline" onClick={() => setStep(1)} size="lg" className="flex-1">Kembali</Action>
              <Action onClick={() => setStep(3)} size="lg" className="flex-[2]">Lanjut<Icon.arrow className="size-4" /></Action>
            </div>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset>
            <legend className="t-h2 text-ink-900">
              {answers.need === 'simpanan' ? 'Berapa dana yang ingin Anda tabung?' : 'Berapa dana yang Anda butuhkan?'}
            </legend>

            <div className="mt-8">
              <label htmlFor="wiz-amount" className="text-[13px] font-semibold text-ink-700">
                {answers.need === 'simpanan' ? 'Target simpanan' : 'Nominal pinjaman'}
              </label>
              <output htmlFor="wiz-amount" className="figure mt-1.5 block text-[clamp(1.9rem,1.45rem+2vw,2.7rem)] text-ink-900">
                {formatRupiah(answers.amount)}
              </output>
              <Slider id="wiz-amount" min={bounds.min} max={bounds.max} step={1_000_000} value={answers.amount}
                onChange={(e) => setAnswers((a) => ({ ...a, amount: Number(e.target.value) }))} />
              <p className="tnum flex justify-between text-[12px] text-ink-400">
                <span>{formatRupiahShort(bounds.min)}</span>
                <span>{formatRupiahShort(bounds.max)}</span>
              </p>
            </div>

            <div className="mt-8">
              <span className="mb-2.5 block text-[13px] font-semibold text-ink-700">Jangka waktu</span>
              <Segments options={[12, 24, 36, 48]} value={answers.tenorMonths} suffix=" bln" ariaLabel="Jangka waktu"
                onChange={(t) => setAnswers((a) => ({ ...a, tenorMonths: t }))} />
            </div>

            {liveEstimate ? (
              <div className="surface-dark relative mt-8 overflow-hidden p-5 text-white">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200/60 to-transparent" />
                <p className="text-[12.5px] font-medium text-white/55">Estimasi angsuran per bulan</p>
                <p className="figure mt-2 text-[clamp(1.6rem,1.25rem+1.5vw,2.1rem)] text-gold-300">{formatRupiah(liveEstimate.monthly)}</p>
                <p className="mt-2.5 text-[12px] text-white/45">Simulasi awal, bukan penawaran final.</p>
              </div>
            ) : null}

            <div className="mt-8 flex gap-3">
              <Action variant="outline" onClick={() => setStep(2)} size="lg" className="flex-1">Kembali</Action>
              <Action onClick={() => setStep(4)} size="lg" className="flex-[2]">Lanjut<Icon.arrow className="size-4" /></Action>
            </div>
          </fieldset>
        ) : null}

        {step === 4 ? (
          <form onSubmit={onSubmitContact} noValidate>
            <h2 className="t-h2 text-ink-900">Ke mana kami bisa menghubungi Anda?</h2>
            <p className="mt-3 text-[14.5px] text-ink-500">Data hanya dipakai untuk menghubungi Anda.</p>

            <div className="mt-7 grid gap-5">
              <Field label="Nama lengkap" htmlFor="wiz-name" required>
                <input id="wiz-name" name="name" required autoComplete="name" placeholder="I Made Suarjana" className={field} />
              </Field>
              <Field label="Nomor WhatsApp" htmlFor="wiz-phone" required>
                <input id="wiz-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" className={field} />
              </Field>
              <Field label="Cabang terdekat" htmlFor="wiz-branch">
                <Select
                  id="wiz-branch"
                  name="branchId"
                  placeholder="Pilih kantor terdekat"
                  options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.district ?? undefined }))}
                />
              </Field>

              <div aria-hidden="true" className="absolute -left-[9999px]">
                <input name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <Check name="consent" required>Saya bersedia dihubungi petugas KSP Sari Sedana Bali.</Check>
              {error ? <Note>{error}</Note> : null}
            </div>

            <div className="mt-8 flex gap-3">
              <Action type="button" variant="outline" onClick={() => setStep(3)} size="lg" className="flex-1">Kembali</Action>
              <Action type="submit" size="lg" disabled={submitting} className="flex-[2]">
                {submitting ? 'Memproses…' : 'Lihat rekomendasi'}
              </Action>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

function ResultPanel({ result, answers, branches }: { result: Recommendation | null; answers: Answers; branches: Branch[] }) {
  const best = result?.best
  const branch = branches[0]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="surface relative z-0 overflow-hidden">
        <div className="grid-dark relative bg-ink-900 p-7 text-white sm:p-9">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[13px] font-medium text-white/60">Rekomendasi untuk Anda</p>
              <h2 className="t-h2 mt-3 !text-white">
                {best ? best.product.name : 'Data Anda sudah kami terima'}
              </h2>
              {best?.product.tagline ? <p className="mt-2 text-[14.5px] text-white/65">{best.product.tagline}</p> : null}
            </div>
            {best ? (
              <div className="shrink-0 text-right">
                <p className="figure text-[2.2rem] text-gold-300">{best.score}%</p>
                <p className="text-[12px] font-medium text-white/50">cocok</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-7 sm:p-9">
          {best ? (
            <>
              {answers.need === 'pinjaman' ? (
                <dl className="tnum border-t border-line text-[14.5px]">
                  {[
                    ['Nominal', formatRupiah(answers.amount)],
                    ['Tenor', `${answers.tenorMonths} bulan`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-line py-3.5">
                      <dt className="text-ink-500">{k}</dt>
                      <dd className="font-medium text-ink-900">{v}</dd>
                    </div>
                  ))}
                  {best.estimate ? (
                    <div className="flex items-baseline justify-between gap-4 py-4">
                      <dt className="font-semibold text-ink-600">Estimasi angsuran</dt>
                      <dd className="figure text-[20px] text-green-700">{formatRupiah(best.estimate.monthly)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {best.reasons.length ? (
                <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                  {best.reasons.map((reason, i) => (
                    <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-500">
                      <Icon.check className="mt-0.5 size-4 shrink-0 text-gold-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-8 grid gap-2.5">
                <Action
                  href={waLink(
                    branch?.whatsapp || branch?.phone || '',
                    `Halo, saya ${answers.need === 'pinjaman' ? 'tertarik dengan' : 'ingin menabung di'} ${best.product.name}. Nominal ${formatRupiah(answers.amount)}${answers.need === 'pinjaman' ? `, tenor ${answers.tenorMonths} bulan` : ''}. Mohon informasinya.`,
                  )}
                  external size="lg" full
                  onClick={() => track('whatsapp_click', { from: 'profiling_result' })}
                >
                  <Icon.whatsapp className="size-5" />
                  Hubungi via WhatsApp
                </Action>
                <Action href={`/simulasi?produk=${best.product.slug}&nominal=${answers.amount}&tenor=${answers.tenorMonths}`} variant="outline" full>
                  <Icon.calculator className="size-4" />
                  Buka kalkulator simulasi
                </Action>
                <Action href={`/produk/${best.product.category}/${best.product.slug}`} variant="quiet" full>
                  Lihat syarat dan ketentuan
                </Action>
              </div>

              {result?.alternatives.length ? (
                <div className="mt-8 border-t border-line pt-6">
                  <p className="t-label">Alternatif lain</p>
                  <ul className="mt-3.5 divide-y divide-line">
                    {result.alternatives.map((alt) => (
                      <li key={alt.product.id} className="flex items-center justify-between gap-4 py-3">
                        <a href={`/produk/${alt.product.category}/${alt.product.slug}`} className="text-[16px] text-ink-900 hover:text-green-700">
                          {alt.product.name}
                        </a>
                        <span className="tnum shrink-0 text-[12px] font-semibold text-ink-400">cocok {alt.score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="t-lead">Petugas kami akan menghubungi Anda dalam 1×24 jam kerja untuk membantu memilih produk yang paling sesuai.</p>
              <Action href="/produk" className="mt-7">Lihat semua produk<Icon.arrow className="size-4" /></Action>
            </>
          )}

          <p className="mt-8 border-t border-line pt-5 text-center text-[12.5px] text-ink-400">
            Angka di atas adalah simulasi awal, bukan penawaran final. Petugas kami akan menghubungi Anda untuk langkah berikutnya.
          </p>
        </div>
      </div>
    </div>
  )
}
