/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_ID,
  findTheme,
  readThemePreference,
  resolveThemeId,
  THEME_PREFERENCE_KEY,
  THEMES,
  writeThemePreference,
} from './registry'

// A plain path: under the jsdom environment the global URL is jsdom's class, which Node's fs rejects.
function readStylesheet(name: string): string {
  return readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), name), 'utf8')
}

function parseTokens(block: string): Map<string, string> {
  const values = new Map<string, string>()
  const variableRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  let match: RegExpExecArray | null
  while ((match = variableRegex.exec(block)) !== null) {
    values.set(`--${match[1]}`, match[2].trim())
  }
  return values
}

function blockFor(css: string, selector: RegExp): string {
  const match = css.match(selector)
  if (!match) {
    throw new Error(`No block matched ${selector}`)
  }
  return match[1]
}

const lightTokens = parseTokens(blockFor(readStylesheet('light.css'), /:root\s*\{([\s\S]*?)\}/))

/** Every registered theme other than light, with the tokens its own file defines. */
const overrideThemes = THEMES.filter((theme) => theme.id !== 'light').map((theme) => ({
  id: theme.id,
  tokens: parseTokens(
    blockFor(
      readStylesheet(path.basename(theme.stylesheet)),
      new RegExp(`\\[data-theme="${theme.id}"\\]\\s*\\{([\\s\\S]*?)\\}`),
    ),
  ),
}))

const FIXED_TOKENS = [
  '--pdf-page',
  '--material-copper',
  '--material-aluminum',
  '--material-grounding',
  '--material-bimetallic',
  '--material-tinned',
]

describe('theme token sets', () => {
  it('light defines the tokens the app relies on', () => {
    for (const token of [
      '--bg-base', '--bg-card', '--text-primary', '--accent', '--pdf-page', '--ws-selection-stroke', '--font',
      '--border-width', '--radius', '--radius-sm', '--radius-lg',
    ]) {
      expect(lightTokens.has(token), token).toBe(true)
    }
    expect(lightTokens.get('--border-width')).toBe('1px')
  })

  it('registers every theme stylesheet', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(['light', 'dark', 'hivis'])
    expect(findTheme('dark')?.stylesheet).toBe('themes/dark.css')
    expect(findTheme('hivis')?.stylesheet).toBe('themes/hivis.css')
    expect(overrideThemes.map((theme) => theme.id)).toEqual(['dark', 'hivis'])
  })

  it.each(overrideThemes)('$id defines every light token and nothing else', ({ tokens }) => {
    const missing = [...lightTokens.keys()].filter((key) => !tokens.has(key))
    const extra = [...tokens.keys()].filter((key) => !lightTokens.has(key))
    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })

  it.each(overrideThemes)('$id keeps the page white and the material colors fixed', ({ tokens }) => {
    for (const token of FIXED_TOKENS) {
      expect(tokens.get(token), token).toBe(lightTokens.get(token))
    }
  })

  it('hi-vis is the theme with heavier rules; the others keep the light metrics', () => {
    const dark = overrideThemes.find((theme) => theme.id === 'dark')?.tokens
    const hivis = overrideThemes.find((theme) => theme.id === 'hivis')?.tokens
    for (const token of ['--border-width', '--radius', '--radius-sm', '--radius-lg']) {
      expect(dark?.get(token), token).toBe(lightTokens.get(token))
    }
    expect(hivis?.get('--border-width')).toBe('2px')
    expect(hivis?.get('--radius')).not.toBe(lightTokens.get('--radius'))
  })
})

describe('theme preference', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => window.localStorage.clear())

  it('reads system when nothing valid is stored', () => {
    expect(readThemePreference()).toBe('system')
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'sepia')
    expect(readThemePreference()).toBe('system')
  })

  it('round-trips a stored theme and clears the key for system', () => {
    writeThemePreference('dark')
    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('dark')
    expect(readThemePreference()).toBe('dark')

    writeThemePreference('hivis')
    expect(readThemePreference()).toBe('hivis')

    writeThemePreference('system')
    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBeNull()
    expect(readThemePreference()).toBe('system')
  })

  it('resolves system to the OS scheme and an explicit theme to itself', () => {
    expect(resolveThemeId('system', 'dark')).toBe('dark')
    expect(resolveThemeId('system', DEFAULT_THEME_ID)).toBe(DEFAULT_THEME_ID)
    expect(resolveThemeId('light', 'dark')).toBe('light')
    expect(resolveThemeId('hivis', 'dark')).toBe('hivis')
  })
})
