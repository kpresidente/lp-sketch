/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CLASSIC_SHELL,
  DEFAULT_SHELL,
  readShellPreference,
  SHELL_PREFERENCE_KEY,
  TEMPERED_SHELL,
  writeShellPreference,
  type ShellId,
} from './registry'
import { createShellState } from './ShellContext'
import ShellHost from './ShellHost'
import type { ShellComponent, ShellSlots } from './types'

const slots: ShellSlots = {
  workspace: () => <div data-testid="slot-workspace" />,
  dialogs: () => null,
  helpDrawer: () => null,
}

describe('ShellHost', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => cleanup())

  it('renders an eager shell synchronously', () => {
    const Eager: ShellComponent = (props) => <div data-testid="eager-shell">{props.slots.workspace()}</div>

    render(() => (
      <ShellHost
        shell={{ id: 'tempered', label: 'Eager', kind: 'eager', component: Eager, waivedBlocks: {} }}
        slots={slots}
        onChromeReady={() => {}}
      />
    ))

    expect(screen.getByTestId('eager-shell')).toBeTruthy()
    expect(screen.getByTestId('slot-workspace')).toBeTruthy()
    expect(document.querySelector('.shell-loading')).toBeNull()
  })

  it('loads a lazy shell on demand behind a neutral fallback', async () => {
    let resolveLoad: (module: { default: ShellComponent }) => void = () => {}
    const load = () => new Promise<{ default: ShellComponent }>((resolve) => {
      resolveLoad = resolve
    })

    render(() => (
      <ShellHost
        shell={{ id: 'classic', label: 'Lazy', kind: 'lazy', load, waivedBlocks: {} }}
        slots={slots}
        onChromeReady={() => {}}
      />
    ))

    expect(screen.queryByTestId('lazy-shell')).toBeNull()
    expect(document.querySelector('.shell-loading')).toBeTruthy()

    resolveLoad({ default: (props) => <div data-testid="lazy-shell">{props.slots.workspace()}</div> })

    await waitFor(() => expect(screen.getByTestId('lazy-shell')).toBeTruthy())
    expect(screen.getByTestId('slot-workspace')).toBeTruthy()
    expect(document.querySelector('.shell-loading')).toBeNull()
  })

  it('defaults to Tempered and falls back to it for a missing or unknown preference', () => {
    expect(DEFAULT_SHELL).toBe(TEMPERED_SHELL)
    expect(readShellPreference()).toBe(TEMPERED_SHELL)

    window.localStorage.setItem(SHELL_PREFERENCE_KEY, 'not-a-shell')
    expect(readShellPreference()).toBe(TEMPERED_SHELL)

    writeShellPreference('classic')
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('classic')
    expect(readShellPreference()).toBe(CLASSIC_SHELL)
  })

  it('switches the active shell through the shell state and stores the choice', () => {
    const state = createShellState(TEMPERED_SHELL)
    expect(state.shell()).toBe(TEMPERED_SHELL)

    state.setShell('classic')
    expect(state.shell()).toBe(CLASSIC_SHELL)
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('classic')

    state.setShell('unknown' as ShellId)
    expect(state.shell()).toBe(CLASSIC_SHELL)
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('classic')
  })
})
