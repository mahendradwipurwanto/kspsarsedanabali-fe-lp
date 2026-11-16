import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE } from '@/contracts'
import { getForm, getSettings, quiet } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { Mark } from '@/components/ui'
import { PublicFormView } from '@/components/interactive/PublicForm'

/**
 * The "hanya formulir" link of a form: the form and nothing else.
 *
 * The same form as /formulir/<alamat>, without the website's header, menu
 * and footer around it (see SiteChrome), the way a Google Form link opens. It
 * is what the console hands out by default: someone opening it from WhatsApp
 * came to fill in one thing, and a menu of savings products only gets in the
 * way. Only a small name at the top says whose form it is.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const form = await getForm(slug).catch(() => null)
  return buildMetadata({
    title: form?.title ?? 'Formulir',
    description: form?.description?.slice(0, 160) || 'Formulir KSP Sari Sedana Bali.',
    path: `/f/${slug}`,
    noindex: true,
  })
}

export default async function BareFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [form, settings] = await Promise.all([getForm(slug), quiet(getSettings())])
  if (!form) notFound()
  const site = ((settings ?? {}).site ?? {}) as Record<string, string>
  const name = site.name || SITE.shortName

  return (
    <div className="min-h-screen bg-paper ground-texture px-[var(--gutter)] py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 flex items-center justify-center gap-2 text-[13px] font-semibold text-ink-600">
          <Mark className="h-6 w-auto" />
          {name}
        </p>
        <PublicFormView form={form} bare />
        <p className="mt-6 text-center text-[12px] text-ink-400">
          Formulir ini dibuat oleh {name}. Jangan pernah mengirim kata sandi atau PIN melalui formulir.
        </p>
      </div>
    </div>
  )
}
