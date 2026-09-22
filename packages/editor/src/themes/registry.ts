export type ThemeId = 'light' | 'dark' | 'hivis'

/** What the device stores: a theme, or "system" to follow prefers-color-scheme. */
export type ThemePreference = ThemeId | 'system'

/** Global device preference. Never enters project JSON, autosave, or history. */
export const THEME_PREFERENCE_KEY = 'lp-sketch.theme.v1'

export interface ThemeRegistration {
  id: ThemeId
  label: string
  /** Value for the CSS `color-scheme` the stylesheet sets, and for the browser UI color. */
  colorScheme: 'light' | 'dark'
  /** Browser chrome color written to `<meta name="theme-color">`. */
  themeColor: string
  /** Token stylesheet, relative to `packages/editor/src`. */
  stylesheet: string
  /** Font families the stylesheet expects; all are bundled through `themes/fonts.css`. */
  fonts: readonly string[]
}

const FONTS = ['Plus Jakarta Sans Variable', 'Fira Code Variable'] as const

export const THEMES: readonly ThemeRegistration[] = [
  {
    id: 'light',
    label: 'Light',
    colorScheme: 'light',
    themeColor: '#2c4f8a',
    stylesheet: 'themes/light.css',
    fonts: FONTS,
  },
  {
    id: 'dark',
    label: 'Dark',
    colorScheme: 'dark',
    themeColor: '#181b20',
    stylesheet: 'themes/dark.css',
    fonts: FONTS,
  },
  {
    id: 'hivis',
    label: 'Hi-Vis',
    colorScheme: 'light',
    themeColor: '#ffd400',
    stylesheet: 'themes/hivis.css',
    fonts: FONTS,
  },
]

export const DEFAULT_THEME_ID: ThemeId = 'light'

export function findTheme(id: string | null | undefined): ThemeRegistration | undefined {
  return THEMES.find((theme) => theme.id === id)
}

function preferenceStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The stored preference, or "system" when nothing valid is stored. */
export function readThemePreference(): ThemePreference {
  const stored = preferenceStorage()?.getItem(THEME_PREFERENCE_KEY)
  return findTheme(stored) ? (stored as ThemeId) : 'system'
}

/** Persists a theme, or removes the key for "system". */
export function writeThemePreference(preference: ThemePreference): void {
  try {
    const storage = preferenceStorage()
    if (!storage) {
      return
    }
    if (preference === 'system') {
      storage.removeItem(THEME_PREFERENCE_KEY)
    } else {
      storage.setItem(THEME_PREFERENCE_KEY, preference)
    }
  } catch {
    // The preference is a convenience; the app still runs with the default theme.
  }
}

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/** The theme the operating system asks for, or the default when unknown. */
export function systemThemeId(): ThemeId {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_THEME_ID
  }
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : DEFAULT_THEME_ID
}

export function resolveThemeId(preference: ThemePreference, systemTheme: ThemeId = systemThemeId()): ThemeId {
  return preference === 'system' ? systemTheme : preference
}
