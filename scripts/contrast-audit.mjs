import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appCssPath = resolve(process.cwd(), 'src/App.css')
const css = readFileSync(appCssPath, 'utf8')

function parseRootVariables(content) {
  const rootMatch = content.match(/:root\s*\{([\s\S]*?)\}/)
  if (!rootMatch) {
    throw new Error('Could not locate :root block in src/App.css')
  }

  const values = new Map()
  const variableRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  let match
  while ((match = variableRegex.exec(rootMatch[1])) !== null) {
    values.set(`--${match[1]}`, match[2].trim())
  }
  return values
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
  if (normalized <= 0.03928) {
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

const tokens = parseRootVariables(css)
const checks = [
  {
    name: 'Primary text on cards',
    fg: 'var(--text-primary)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Secondary text on cards',
    fg: 'var(--text-secondary)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Tertiary text on cards',
    fg: 'var(--text-tertiary)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Muted text on cards',
    fg: 'var(--text-muted)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Muted text on base background',
    fg: 'var(--text-muted)',
    bg: 'var(--bg-base)',
    min: 4.5,
  },
  {
    name: 'Section labels',
    fg: 'var(--accent-marker)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Panel headers',
    fg: 'var(--text-secondary)',
    bg: 'var(--bg-panel-header)',
    min: 4.5,
  },
  {
    name: 'Active button text',
    fg: '#ffffff',
    bg: 'var(--accent)',
    min: 4.5,
  },
  {
    name: 'Scale badge text',
    fg: 'var(--accent-text)',
    bg: 'var(--accent-light)',
    min: 4.5,
  },
  {
    name: 'Success status text',
    fg: 'var(--success)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
  {
    name: 'Error status text',
    fg: 'var(--error)',
    bg: 'var(--bg-card)',
    min: 4.5,
  },
]

let failures = 0
console.log('[contrast-audit] Checking WCAG AA contrast pairs')
for (const check of checks) {
  const fg = resolveColor(check.fg, tokens)
  const bg = resolveColor(check.bg, tokens)
  const ratio = contrastRatio(fg, bg)
  const pass = ratio >= check.min
  if (!pass) {
    failures += 1
  }
  console.log(
    `${pass ? 'PASS' : 'FAIL'} | ${check.name} | ratio=${ratio.toFixed(2)} | required>=${check.min}`,
  )
}

if (failures > 0) {
  console.error(`[contrast-audit] ${failures} contrast checks failed`)
  process.exit(1)
}

console.log('[contrast-audit] All checks passed')
