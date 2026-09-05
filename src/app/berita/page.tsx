import type { Metadata } from 'next'
import { getPosts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbLd, itemListLd } from '@/lib/jsonld'
import { Shell, Band, Breadcrumbs, JsonLd, Blank, Action , PageIntro } from '@/components/ui'
import { PostCard } from '@/components/PostCard'
import { Pagination } from '@/components/Pagination'

export const revalidate = 300

const TRAIL = [{ name: 'Beranda', path: '/' }, { name: 'Berita', path: '/berita' }]

export async function generateMetadata(): Promise<Metadata> {
  return await buildMetadata({
  title: 'Berita & Informasi Terbaru KSP Sari Sedana Bali',
  description:
    'Kabar terbaru dari KSP Sari Sedana Bali: pengumuman koperasi, produk baru, prestasi, laporan kinerja, dan kegiatan di Karangasem.',
  path: '/berita',
  })
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(Number(pageParam ?? 1) || 1, 1)
  const res = await getPosts({ page, limit: 9 })
  const posts = res?.data ?? []

  return (
    <>
      <JsonLd data={[breadcrumbLd(TRAIL), itemListLd(posts.map((p) => ({ name: p.title, path: `/berita/${p.slug}` })), 'Berita KSP Sari Sedana Bali')]} />
      <Breadcrumbs trail={TRAIL} />

      <PageIntro
        label="Informasi Terbaru"
        title="Berita & Informasi KSP Sari Sedana Bali"
        lead="Pengumuman koperasi, peluncuran produk, prestasi, dan kegiatan terbaru dari tiga kantor kami di Karangasem."
      />

      <Band>
        <Shell>
          {posts.length ? (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, i) => (
                  <PostCard key={post.id} post={post} priority={i < 3} />
                ))}
              </ul>
              {res && res.meta.totalPages > 1 ? <Pagination page={res.meta.page} totalPages={res.meta.totalPages} basePath="/berita" /> : null}
            </>
          ) : (
            <Blank title="Belum ada berita" body="Berita dan informasi terbaru akan tampil di sini." action={<Action href="/">Kembali ke beranda</Action>} />
          )}
        </Shell>
      </Band>
    </>
  )
}
