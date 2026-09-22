/** @vitest-environment jsdom */
import { cleanup, render } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_PREFERENCE_KEY } from '../themes/registry'
import { createThemeState, ThemeProvider, useTheme, type ThemeState } from './ThemeContext'

type Listener = (event: { matches: boolean }) => void

function installMatchMedia(initialDark: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return {
    emit(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) {
        listener({ matches })
      }
    },
    listenerCount: () => listeners.size,
  }
}

function Probe(props: { onState: (state: ThemeState) => void }) {
  props.onState(useTheme())
  return null
}

/** The provider expects one stable state object, as App creates it, not a fresh one per access. */
function renderProvider(onState?: (state: ThemeState) => void) {
  return render(() => {
    const state = createThemeState()
    return (
      <ThemeProvider value={state}>
        {onState ? <Probe onState={onState} /> : null}
      </ThemeProvider>
    )
  })
}

describe('ThemeProvider', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.theme
  })

  it('applies the light theme to the document root by default and removes it on cleanup', () => {
    installMatchMedia(false)
    const { unmount } = renderProvider()

    expect(document.documentElement.dataset.theme).toBe('light')
    unmount()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('follows the OS scheme while the preference is system', () => {
    const media = installMatchMedia(true)
    renderProvider()

    expect(document.documentElement.dataset.theme).toBe('dark')
    media.emit(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(media.listenerCount()).toBe(1)
  })

  it('persists an explicit preference and switches the root attribute without a reload', () => {
    installMatchMedia(false)
    let state: ThemeState | undefined
    renderProvider((value) => {
      state = value
    })

    state?.setPreference('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('dark')

    state?.setPreference('system')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBeNull()
  })

  it('honors a stored preference over the OS scheme', () => {
    installMatchMedia(true)
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'light')
    renderProvider()

    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
