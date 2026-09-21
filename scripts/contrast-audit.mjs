// WCAG AA contrast audit for every theme in packages/editor/src/themes.
// light.css defines the complete token set on :root; each other theme file
// overrides tokens on [data-theme="<id>"]. A theme must define every light
// token, and every check must pass against the theme's resolved tokens.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const themesDir = resolve(import.meta.dirname, '../packages/editor/src/themes')
const LIGHT_FILE = 'light.css'

function parseTokens(block) {
  const values = new Map()
  const variableRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  let match
  while ((match = variableRegex.exec(block)) !== null) {
    values.set(`--${match[1]}`, match[2].trim())
  }
  return values
}

function parseRootBlock(css, file) {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/)
  if (!rootMatch) {
    throw new Error(`Could not locate the :root block in ${file}`)
  }
  return parseTokens(rootMatch[1])
}

function parseThemeBlock(css, file) {
  const themeMatch = css.match(/\[data-theme="([a-z0-9-]+)"\]\s*\{([\s\S]*?)\}/)
  if (!themeMatch) {
    throw new Error(`Could not locate a [data-theme="..."] block in ${file}`)
  }
  return { id: themeMatch[1], tokens: parseTokens(themeMatch[2]) }
}

function resolveColor(token, variables) {
  if (token.startsWith('var(')) {
    const variableMatch = token.match(/var\((--[a-z0-9-]+)\)/i)
    if (!variableMatch) {
      throw new Error(`Unsupported CSS variable reference: ${token}`)
    }
    const value = variables.get(variableMatch[1])
    if (!value) {
      throw new Error(`Missing CSS variable: ${variableMatch[1]}`)
    }
    return value
  }
  return token
}

function expandHex(hex) {
  const raw = hex.replace('#', '').trim()
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
  }
  return `#${raw}`
}

function hexToRgb(hex) {
  const normalized = expandHex(hex)
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Unsupported color format: ${hex}`)
  }
  const numeric = Number.parseInt(normalized.slice(1), 16)
  return {
    r: (numeric >> 16) & 0xff,
    g: (numeric >> 8) & 0xff,
    b: numeric & 0xff,
  }
}

function relativeLuminance(channel) {
  const normalized = channel / 255
  if (normalized <= 0.04045) {
    return normalized / 12.92
  }
  return ((normalized + 0.055) / 1.055) ** 2.4
}

function contrastRatio(foreground, background) {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  const fgLum =
    0.2126 * relativeLuminance(fg.r) +
    0.7152 * relativeLuminance(fg.g) +
    0.0722 * relativeLuminance(fg.b)
  const bgLum =
    0.2126 * relativeLuminance(bg.r) +
    0.7152 * relativeLuminance(bg.g) +
    0.0722 * relativeLuminance(bg.b)
  const light = Math.max(fgLum, bgLum)
  const dark = Math.min(fgLum, bgLum)
  return (light + 0.05) / (dark + 0.05)
}

// Token checks cover intended pairs, not the entire rendered UI or outdoor legibility.
const checks = [
  { name: 'Primary text on cards', fg: 'var(--text-primary)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Secondary text on cards', fg: 'var(--text-secondary)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Tertiary text on cards', fg: 'var(--text-tertiary)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Muted text on cards', fg: 'var(--text-muted)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Muted text on base background', fg: 'var(--text-muted)', bg: 'var(--bg-base)', min: 4.5 },
  { name: 'Label text on subtle surfaces', fg: 'var(--text-label)', bg: 'var(--bg-subtle)', min: 4.5 },
  { name: 'Section labels', fg: 'var(--accent-marker)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Panel headers', fg: 'var(--text-primary)', bg: 'var(--bg-panel-header)', min: 4.5 },
  { name: 'Active button text', fg: 'var(--text-on-accent)', bg: 'var(--accent)', min: 4.5 },
  { name: 'Danger button text', fg: 'var(--text-on-accent)', bg: 'var(--danger)', min: 4.5 },
  { name: 'Scale badge text', fg: 'var(--accent-text)', bg: 'var(--accent-light)', min: 4.5 },
  { name: 'Success status text', fg: 'var(--success)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Error status text', fg: 'var(--error)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Tooltip text', fg: 'var(--tooltip-text)', bg: 'var(--tooltip-bg)', min: 4.5 },
  ...['--bg-card', '--bg-input', '--bg-sidebar', '--bg-panel-header', '--bg-hover'].map((bg) => ({
    name: `Control outlines against ${bg}`,
    fg: 'var(--border-btn)',
    bg: `var(${bg})`,
    min: 3,
  })),
  ...['--bg-card', '--bg-sidebar', '--bg-panel-header'].map((bg) => ({
    name: `Focus indicator against ${bg}`,
    fg: 'var(--border-focus)',
    bg: `var(${bg})`,
    min: 3,
  })),
  { name: 'Enabled control icons', fg: 'var(--text-secondary)', bg: 'var(--bg-card)', min: 4.5 },
  { name: 'Selected material outline and checkmark', fg: 'var(--accent)', bg: 'var(--accent-light)', min: 3 },
  { name: 'Off switch track against cards', fg: 'var(--switch-off)', bg: 'var(--bg-card)', min: 3 },
  { name: 'Off switch thumb against track', fg: 'var(--switch-thumb)', bg: 'var(--switch-off)', min: 3 },
  { name: 'On switch thumb against track', fg: 'var(--switch-thumb)', bg: 'var(--accent)', min: 3 },
  {
    // Disabled controls are WCAG-exempt; keep their labels readable by design.
    name: 'Disabled control labels and icons',
    fg: 'var(--text-disabled)',
    bg: 'var(--bg-disabled)',
    min: 4.5,
  },
  { name: 'Selection outline on the page', fg: 'var(--ws-selection-stroke)', bg: 'var(--pdf-page)', min: 3 },
  { name: 'Hover outline on the page', fg: 'var(--ws-hover-stroke)', bg: 'var(--pdf-page)', min: 3 },
  { name: 'Selection handle on the page', fg: 'var(--ws-handle-stroke)', bg: 'var(--pdf-page)', min: 3 },
]

const lightCss = readFileSync(resolve(themesDir, LIGHT_FILE), 'utf8')
const lightTokens = parseRootBlock(lightCss, LIGHT_FILE)
const themes = [{ id: 'light', tokens: lightTokens }]

const themeFiles = readdirSync(themesDir)
  .filter((file) => file.endsWith('.css') && file !== LIGHT_FILE && file !== 'fonts.css')
  .sort()
for (const file of themeFiles) {
  const { id, tokens } = parseThemeBlock(readFileSync(resolve(themesDir, file), 'utf8'), file)
  themes.push({ id, tokens: new Map([...lightTokens, ...tokens]), own: tokens })
}

let failures = 0
for (const theme of themes) {
  console.log(`[contrast-audit] Theme "${theme.id}"`)

  if (theme.own) {
    const missing = [...lightTokens.keys()].filter((key) => !theme.own.has(key))
    if (missing.length > 0) {
      failures += missing.length
      console.log(`FAIL | Theme defines every light token | missing ${missing.join(', ')}`)
    } else {
      console.log('PASS | Theme defines every light token')
    }
  }

  for (const check of checks) {
    const fg = resolveColor(check.fg, theme.tokens)
    const bg = resolveColor(check.bg, theme.tokens)
    const ratio = contrastRatio(fg, bg)
    const pass = ratio >= check.min
    if (!pass) {
      failures += 1
    }
    console.log(
      `${pass ? 'PASS' : 'FAIL'} | ${check.name} | ratio=${ratio.toFixed(2)} | required>=${check.min}`,
    )
  }
}

if (failures > 0) {
  console.error(`[contrast-audit] ${failures} checks failed`)
  process.exit(1)
}

console.log(`[contrast-audit] All checks passed for ${themes.length} themes`)
