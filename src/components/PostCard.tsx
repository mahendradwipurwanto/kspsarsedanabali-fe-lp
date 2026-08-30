import Link from 'next/link'
import type { Post } from '@/lib/api'
import { Card, Pill, Icon } from './ui'
import { Media } from './ui/Media'

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export function PostCard({ post, priority = false }: { post: Post; priority?: boolean }) {
  // Until the koperasi uploads cover images, a 16:10 placeholder panel is the
  // largest thing on the card and says nothing. Without one the card becomes a
  // typographic entry with a gold rule — deliberate rather than unfinished.
  const hasCover = Boolean(post.coverImage)

  return (
    <Card as="li" hover className="group/post relative flex flex-col overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&_img]:[transition-timing-function:var(--ease-settle)] hover:[&_img]:scale-[1.04]">
      {hasCover ? (
        <div className="relative overflow-hidden">
          <Media src={post.coverImage} alt={post.title} ratio="16/10" priority={priority} rounded={false}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          {/* A slow zoom on hover, and a hairline to seat the image in the card. */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-navy-900/8" />
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="block h-[3px] origin-left scale-x-0 bg-gradient-to-r from-gold-300 via-gold-200 to-transparent transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover/post:scale-x-100"
        />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-slate-400">
          {post.publishedAt ? (
            <time dateTime={post.publishedAt} className="inline-flex items-center gap-1.5">
              <Icon.calendar className="size-3.5" />
              {dateFmt.format(new Date(post.publishedAt))}
            </time>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Icon.clock className="size-3.5" />
            {post.readMinutes} min baca
          </span>
        </div>

        {post.categoryName ? (
          <div className="mt-3">
            <Pill tone="green">{post.categoryName}</Pill>
          </div>
        ) : null}

        <h3 className="t-h3 mt-3">
          <Link href={`/berita/${post.slug}`} className="transition-colors after:absolute after:inset-0 group-hover/post:text-green-700">
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? <p className="clamp-3 mt-2.5 flex-1 text-[14px] leading-relaxed text-slate-500">{post.excerpt}</p> : null}

        <span className="mt-auto flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-green-700">
          Baca Selengkapnya
          <Icon.arrow className="size-4 transition-transform duration-300 group-hover/post:translate-x-1" />
        </span>
      </div>
    </Card>
  )
}
