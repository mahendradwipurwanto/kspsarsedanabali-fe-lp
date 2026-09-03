import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPost, getPosts } from '@/lib/api'
import { buildMetadata, describe, titleFor } from '@/lib/seo'
import { breadcrumbLd, articleLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Pill, Icon, Heading, Action } from '@/components/ui'
import { Media } from '@/components/ui/Media'
import { PostCard } from '@/components/PostCard'

export const revalidate = 600

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export async function generateStaticParams() {
  const res = await getPosts({ limit: 50 })
  return (res?.data ?? []).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const res = await getPost(slug)
  if (!res) return buildMetadata({ title: 'Berita tidak ditemukan', description: 'Artikel yang Anda cari tidak tersedia.', path: `/berita/${slug}`, noindex: true })

  const p = res.data
  return buildMetadata({
    title: p.seo?.metaTitle || titleFor(p.title),
    description: describe(p.seo?.metaDescription, p.excerpt, p.content),
    path: `/berita/${p.slug}`,
    type: 'article',
    publishedTime: p.publishedAt,
    modifiedTime: p.publishedAt,
    image: p.coverImage?.startsWith('http') ? p.coverImage : undefined,
  })
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await getPost(slug)
  if (!res) notFound()

  const post = res.data
  const trail = [
    { name: 'Beranda', path: '/' },
    { name: 'Berita', path: '/berita' },
    { name: post.title, path: `/berita/${post.slug}` },
  ]

  return (
    <>
      <JsonLd data={[breadcrumbLd(trail), articleLd(post)]} />
      <Breadcrumbs trail={trail} />

      <article>
        <Band className="!pb-8">
          {/* Everything below sits inside `Shell`, so the article's left and
              right edges line up with the header — three different inner
              max-widths used to leave it floating narrower than the navbar.
              The regained width becomes a real second column instead of margin:
              body copy keeps a readable measure, the article facts and the
              membership CTA move beside it. */}
          <Shell>
            <header className="max-w-[46ch]">
              {post.categoryName ? (
                <div className="mb-4">
                  <Pill tone="green">{post.categoryName}</Pill>
                </div>
              ) : null}
              <h1 className="t-h1 text-ink-900">{post.title}</h1>
            </header>

            {post.excerpt ? <p className="t-lead mt-6 max-w-[68ch]">{post.excerpt}</p> : null}

            {post.coverImage ? (
              <div className="mt-9">
                <Media src={post.coverImage} alt={post.title} ratio="16/9" priority sizes="(max-width: 1024px) 100vw, 1200px" />
              </div>
            ) : (
              <div aria-hidden="true" className="rule-gold mt-9 !w-16" />
            )}

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:gap-14">
              <div className="prose-ksp max-w-[68ch]" dangerouslySetInnerHTML={{ __html: post.content ?? '' }} />

              <aside className="lg:sticky lg:top-28 lg:self-start">
                <dl className="surface p-5">
                  <dt className="t-label">Tentang artikel</dt>
                  <dd className="mt-4 grid gap-3.5 text-[13.5px] text-ink-500">
                    {post.publishedAt ? (
                      <span className="flex items-center gap-2.5">
                        <Icon.calendar className="size-4 shrink-0 text-ink-400" />
                        <time dateTime={post.publishedAt}>{dateFmt.format(new Date(post.publishedAt))}</time>
                      </span>
                    ) : null}
                    <span className="flex items-center gap-2.5">
                      <Icon.clock className="size-4 shrink-0 text-ink-400" />
                      {post.readMinutes} menit baca
                    </span>
                    {post.categoryName ? (
                      <span className="flex items-center gap-2.5">
                        <Icon.spark className="size-4 shrink-0 text-ink-400" />
                        {post.categoryName}
                      </span>
                    ) : null}
                  </dd>
                </dl>

                <div className="surface relative mt-4 overflow-hidden p-5">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
                  <h2 className="t-h3 text-ink-900">Tertarik menjadi anggota?</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
                    Jawab 4 pertanyaan singkat dan kami tunjukkan produk simpanan atau pinjaman yang paling sesuai.
                  </p>
                  <Action href="/profiling" size="sm" full className="mt-4">
                    Cari produk yang cocok
                    <Icon.arrow className="size-4" />
                  </Action>
                </div>
              </aside>
            </div>
          </Shell>
        </Band>
      </article>

      {res.related.length ? (
        <Band tone="alt">
          <Shell>
            <Heading title="Berita lainnya" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {res.related.map((p) => (
                <PostCard key={p.id} post={p as never} />
              ))}
            </ul>
          </Shell>
        </Band>
      ) : null}
    </>
  )
}
