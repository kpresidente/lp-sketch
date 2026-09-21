import {
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type ParentProps,
} from 'solid-js'
import {
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_ID,
  findTheme,
  readThemePreference,
  resolveThemeId,
  systemThemeId,
  writeThemePreference,
  type ThemeId,
  type ThemePreference,
} from '../themes/registry'
import '../themes/light.css'
import '../themes/dark.css'

export interface ThemeState {
  /** What the device stores: a theme id or "system". */
  preference: Accessor<ThemePreference>
  /** The theme in effect after resolving "system". */
  theme: Accessor<ThemeId>
  setPreference: (preference: ThemePreference) => void
}

/** Reactive theme state. Call inside a reactive owner; it subscribes to the OS color scheme. */
export function createThemeState(): ThemeState {
  const [preference, setPreferenceSignal] = createSignal<ThemePreference>(readThemePreference())
  const [systemTheme, setSystemTheme] = createSignal<ThemeId>(systemThemeId())

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia(DARK_SCHEME_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : DEFAULT_THEME_ID)
    query.addEventListener?.('change', onChange)
    onCleanup(() => query.removeEventListener?.('change', onChange))
  }

  const theme = createMemo(() => resolveThemeId(preference(), systemTheme()))

  return {
    preference,
    theme,
    setPreference(next) {
      setPreferenceSignal(next)
      writeThemePreference(next)
    },
  }
}

const ThemeContext = createContext<ThemeState>()

interface ThemeProviderProps extends ParentProps {
  value: ThemeState
}

/**
 * Applies the resolved theme to the document root as `data-theme`, which the
 * token stylesheets key on, and keeps the browser UI color in step.
 */
export function ThemeProvider(props: ThemeProviderProps) {
  createRenderEffect(() => {
    const registration = findTheme(props.value.theme()) ?? findTheme(DEFAULT_THEME_ID)
    if (!registration || typeof document === 'undefined') {
      return
    }
    document.documentElement.dataset.theme = registration.id
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', registration.themeColor)
  })

  onCleanup(() => {
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.theme
    }
  })

  return <ThemeContext.Provider value={props.value}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.')
  }
  return context
}
