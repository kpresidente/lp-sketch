/**
 * build-help.mjs — Converts USER_MANUAL.md into public/help.html and
 * extracts Appendix B glossary terms into public/help-glossary.json.
 *
 * Run: node src/help/build-help.mjs
 * Integrated into the build via a Vite plugin (see vite.config.ts).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const MANUAL_PATH = resolve(__dirname, 'USER_MANUAL.md')
const OUT_DIR = resolve(ROOT, 'public')
const HTML_OUT = resolve(OUT_DIR, 'help.html')
const GLOSSARY_OUT = resolve(OUT_DIR, 'help-glossary.json')

// ── Markdown → HTML ──────────────────────────────────────────────

const md = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: true,
})
md.use(markdownItAttrs)

const markdown = readFileSync(MANUAL_PATH, 'utf8')
const htmlBody = md.render(markdown)

// Wrap tables in overflow containers for responsive scrolling
const htmlWithWrappedTables = htmlBody.replace(
  /<table>([\s\S]*?)<\/table>/g,
  '<div class="help-table-wrap"><table>$1</table></div>',
)

const helpHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LP Sketch Help</title>
</head>
<body>
<div id="help-top"></div>
${htmlWithWrappedTables}
</body>
</html>
`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(HTML_OUT, helpHtml, 'utf8')

// ── Glossary extraction ──────────────────────────────────────────

/**
 * Parse Appendix B from the Markdown source.
 * The glossary is a Markdown table where each row is:
 *   | **Term** | Definition text |
 * Some terms include parenthetical aliases, e.g. "Cadweld (Exothermic Weld)".
 */
function extractGlossary(src) {
  // Find the glossary section
  const glossaryMatch = src.match(
    /## Appendix B: Glossary.*?\n([\s\S]*?)(?:\n---|\n## |\n*$)/,
  )
  if (!glossaryMatch) {
    console.warn('Warning: Could not find Appendix B: Glossary in USER_MANUAL.md')
    return []
  }

  const glossaryBlock = glossaryMatch[1]

  // First pass: collect all raw term names to detect duplicated base terms
  const rowPattern = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/gm
  const rawRows = [...glossaryBlock.matchAll(rowPattern)]

  // Count how many terms share the same base (before parenthetical)
  const baseCounts = new Map()
  for (const row of rawRows) {
    const parenMatch = row[1].trim().match(/^(.+?)\s*\(/)
    const base = parenMatch ? parenMatch[1].trim() : row[1].trim()
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1)
  }

  // Second pass: build term objects
  const terms = []
  for (const row of rawRows) {
    const rawTerm = row[1].trim()
    const definition = row[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()

    // Parse parenthetical forms: "Cadweld (Exothermic Weld)"
    // If the base term appears more than once, the parenthetical is a
    // qualifier (keep full form). Otherwise it's an alias.
    const aliasMatch = rawTerm.match(/^(.+?)\s*\((.+?)\)$/)
    if (aliasMatch) {
      const baseTerm = aliasMatch[1].trim()
      const paren = aliasMatch[2].trim()
      if ((baseCounts.get(baseTerm) || 0) > 1) {
        // Qualifier — keep full form as the term name
        terms.push({ term: rawTerm, definition })
      } else {
        // True alias
        terms.push({ term: baseTerm, aliases: [paren], definition })
      }
    } else {
      terms.push({ term: rawTerm, definition })
    }
  }

  return terms
}

const glossary = extractGlossary(markdown)
writeFileSync(GLOSSARY_OUT, JSON.stringify(glossary, null, 2) + '\n', 'utf8')

// ── Anchor validation ────────────────────────────────────────────

/**
 * Verify that all required anchors from the design spec are present
 * in the generated HTML. Warns (but does not fail) on missing anchors.
 */
const REQUIRED_ANCHORS = [
  // Panel-level
  'help-project', 'help-tools', 'help-components',
  'help-material', 'help-scale', 'help-layers',
  // Subsection-level
  'help-project-name', 'help-project-file', 'help-project-export',
  'help-project-report', 'help-project-pages', 'help-project-pdf-background',
  'help-tools-mode', 'help-tools-undo-redo', 'help-tools-snap-to-points',
  'help-tools-angle-snap', 'help-tools-auto-connectors', 'help-tools-annotation',
  'help-components-conductors', 'help-components-air-terminals',
  'help-components-connections', 'help-components-downleads',
  'help-components-penetrations', 'help-components-grounding',
  'help-material-class', 'help-material-material',
  'help-scale-drawing-scale', 'help-scale-annotation-size',
  // Reference sections
  'help-properties-bar', 'help-quick-access', 'help-selection',
  'help-snapping', 'help-canvas-navigation', 'help-conductor-footage',
  'help-display-units', 'help-keyboard-shortcuts',
  'help-symbol-reference', 'help-glossary',
]

const missing = REQUIRED_ANCHORS.filter(
  (id) => !htmlWithWrappedTables.includes(`id="${id}"`),
)
if (missing.length > 0) {
  console.error(`\nERROR: Missing required help anchors in generated HTML:`)
  for (const id of missing) {
    console.error(`  - ${id}`)
  }
  process.exit(1)
}

// ── Summary ──────────────────────────────────────────────────────

console.log(`help: ${HTML_OUT} (${(htmlBody.length / 1024).toFixed(1)} KB)`)
console.log(`help: ${GLOSSARY_OUT} (${glossary.length} terms)`)
console.log(`help: All ${REQUIRED_ANCHORS.length} required anchors verified.`)
