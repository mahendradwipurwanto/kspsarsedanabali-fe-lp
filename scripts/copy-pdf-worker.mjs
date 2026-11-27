/**
 * Put pdf.js's worker and data files where the browser can fetch them.
 *
 * A PDF shown inside a form is drawn by pdf.js, which runs its parser in a
 * worker loaded as a file of its own. The files are copied out of node_modules
 * on every build instead of being committed, so they can never drift from the
 * pdfjs-dist the app imports: a worker of another version refuses to talk to
 * the library, and the reader would fail with nothing to show for it.
 *
 * It is the *legacy* build that is copied (and imported by PdfReader): the
 * modern build targets only the newest browsers, and Samsung Internet — a
 * Chromium several versions behind — laid the pages out but drew every one
 * of them white. Next to the worker go the standard fonts, the CMaps and the
 * wasm image decoders, so a PDF without embedded fonts, or with JPEG 2000 /
 * JBIG2 scans, still draws instead of coming out blank.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = dirname(require.resolve('pdfjs-dist/package.json'))
const to = join(process.cwd(), 'public', 'pdfjs')

rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
cpSync(join(root, 'legacy', 'build', 'pdf.worker.min.mjs'), join(to, 'pdf.worker.min.mjs'))
for (const dir of ['standard_fonts', 'cmaps', 'wasm']) cpSync(join(root, dir), join(to, dir), { recursive: true })
// The worker used to sit at /pdf.worker.min.mjs; a copy left from before would only confuse.
rmSync(join(process.cwd(), 'public', 'pdf.worker.min.mjs'), { force: true })
console.log(`pdf.js worker, fonts, cmaps and wasm → ${to}`)
