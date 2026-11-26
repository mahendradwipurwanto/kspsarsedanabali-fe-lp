/**
 * Put pdf.js's worker where the browser can fetch it.
 *
 * A PDF shown inside a form is drawn by pdf.js, which runs its parser in a
 * worker loaded as a file of its own. The file is copied out of node_modules
 * on every build instead of being committed, so it can never drift from the
 * pdfjs-dist the app imports: a worker of another version refuses to talk to
 * the library, and the reader would fail with nothing to show for it.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const from = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs')
const to = join(process.cwd(), 'public', 'pdf.worker.min.mjs')

mkdirSync(dirname(to), { recursive: true })
copyFileSync(from, to)
console.log(`pdf.worker.min.mjs → ${to}`)
