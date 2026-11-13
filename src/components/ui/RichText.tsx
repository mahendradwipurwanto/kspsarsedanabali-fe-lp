import { isHtml } from '@/contracts'

/**
 * A short text written in the console's rich editor.
 *
 * Copy saved before the editor arrived is plain text and renders exactly as it
 * did, in the tag the caller names. Copy from the editor is HTML — paragraphs,
 * lists, bold, alignment — and renders in a block that inherits the caller's
 * type, since a `<p>` cannot hold the paragraphs and lists inside it.
 */
export function RichText({
  value, as: Tag = 'p', className = '',
}: { value?: string | null; as?: 'p' | 'span' | 'figcaption'; className?: string }) {
  if (!value) return null
  if (!isHtml(value)) return <Tag className={className}>{value}</Tag>
  const Wrap = Tag === 'figcaption' ? 'figcaption' : 'div'
  return <Wrap className={`rt ${Tag === 'span' ? 'block' : ''} ${className}`} dangerouslySetInnerHTML={{ __html: value }} />
}
