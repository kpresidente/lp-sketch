#!/usr/bin/env node
// Screenshot parity for shell work. Captures the same viewports and chrome
// states before and after a change, then compares the sets byte for byte.
//
//   npm run dev -- --port 5173          (in another terminal)
//   node scripts/ui-parity.mjs capture before
//   ...make the change...
//   node scripts/ui-parity.mjs capture after
//   node scripts/ui-parity.mjs compare before after
//
// Sets land in test-results/ui-parity/<tag>/ (ignored by git). Override the
// server with UI_PARITY_BASE and the output root with UI_PARITY_DIR.
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const base = process.env.UI_PARITY_BASE ?? 'http://localhost:5173'
const root = process.env.UI_PARITY_DIR ?? path.join('test-results', 'ui-parity')

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
]

// Chrome states, each on a fresh page so stored preferences never leak between them.
const states = [
  { name: 'default', run: async () => {} },
  {
    name: 'linear-tool',
    run: async (page) => {
      await page.getByRole('button', { name: /Linear$/ }).click()
    },
  },
  {
    name: 'collapsed',
    run: async (page) => {
      await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    },
  },
  {
    name: 'flyout-tools',
    run: async (page) => {
      await page.getByRole('button', { name: 'Collapse sidebar' }).click()
      await page.getByRole('button', { name: 'Tools section' }).click()
      await page.getByRole('region', { name: 'Tools flyout' }).waitFor()
    },
  },
  {
    name: 'quick-customizer',
    run: async (page) => {
      await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
      await page.locator('.quick-access-customizer').waitFor()
    },
  },
  {
    name: 'help-open',
    run: async (page) => {
      await page.getByTitle('Open help').click()
      await page.waitForLoadState('networkidle')
    },
  },
]

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function capture(tag) {
  const outDir = path.join(root, tag)
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const manifest = []
  try {
    for (const viewport of viewports) {
      for (const state of states) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
        })
        const page = await context.newPage()
        await page.goto(base, { waitUntil: 'load' })
        await page.locator('.drawing-stage').waitFor({ timeout: 90_000 })
        await page.evaluate(() => document.fonts.ready)
        await state.run(page)
        // Park the pointer over the stage so no chrome control is in its hover state.
        await page.mouse.move(viewport.width - 4, viewport.height - 4)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(500)
        const file = `${viewport.name}--${state.name}.png`
        await page.screenshot({
          path: path.join(outDir, file),
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
        })
        const bytes = readFileSync(path.join(outDir, file))
        manifest.push({ file, viewport: viewport.name, state: state.name, bytes: bytes.length, sha256: sha256(bytes) })
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  for (const entry of manifest) {
    console.log(`${entry.file.padEnd(40)} ${String(entry.bytes).padStart(7)} bytes  ${entry.sha256.slice(0, 12)}`)
  }
  console.log(`\n${manifest.length} screenshots in ${outDir}`)
}

function compare(tagA, tagB) {
  const dirA = path.join(root, tagA)
  const dirB = path.join(root, tagB)
  const files = readdirSync(dirA).filter((file) => file.endsWith('.png')).sort()
  let identical = 0
  for (const file of files) {
    const a = readFileSync(path.join(dirA, file))
    const target = path.join(dirB, file)
    let result
    if (!existsSync(target)) {
      result = `MISSING in ${tagB}`
    } else if (a.equals(readFileSync(target))) {
      result = 'identical'
      identical += 1
    } else {
      result = `DIFFERS (${sha256(a).slice(0, 12)} vs ${sha256(readFileSync(target)).slice(0, 12)})`
    }
    console.log(`${file.padEnd(40)} ${result}`)
  }
  console.log(`\n${identical}/${files.length} identical`)
  process.exitCode = identical === files.length ? 0 : 1
}

const [command, ...args] = process.argv.slice(2)
if (command === 'capture' && args[0]) {
  await capture(args[0])
} else if (command === 'compare' && args[0] && args[1]) {
  compare(args[0], args[1])
} else {
  console.error('usage: node scripts/ui-parity.mjs capture <tag> | compare <tagA> <tagB>')
  process.exitCode = 2
}
