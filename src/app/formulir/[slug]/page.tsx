import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getForm } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { Shell, Band } from '@/components/ui'
import { PublicFormView } from '@/components/interactive/PublicForm'

/**
 * A form from the Formulir menu, at the address that was handed out.
 *
 * Deliberately off the map: no menu links here, the sitemap leaves it out and
 * every form carries noindex, so it is found by the people it was sent to and
 * not by a search for the koperasi's name. Rendered per visit, because whether
 * it still takes answers depends on the time and on how many have answered.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const form = await getForm(slug).catch(() => null)
  return buildMetadata({
    title: form?.title ?? 'Formulir',
    description: form?.description?.slice(0, 160) || 'Formulir KSP Sari Sedana Bali.',
    path: `/formulir/${slug}`,
    noindex: true,
  })
}

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await getForm(slug)
  if (!form) notFound()

  return (
    <Band tone="alt" className="!py-10 sm:!py-14">
      <Shell>
        <div className="mx-auto max-w-2xl">
          <PublicFormView form={form} />
        </div>
      </Shell>
    </Band>
  )
}
