/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SHELL, readShellPreference, SHELL_PREFERENCE_KEY, writeShellPreference } from './registry'
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
        shell={{ id: 'classic', label: 'Eager', kind: 'eager', component: Eager, waivedBlocks: {} }}
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

  it('falls back to the default shell for a missing or unknown preference', () => {
    expect(readShellPreference()).toBe(DEFAULT_SHELL)

    window.localStorage.setItem(SHELL_PREFERENCE_KEY, 'not-a-shell')
    expect(readShellPreference()).toBe(DEFAULT_SHELL)

    writeShellPreference('classic')
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('classic')
    expect(readShellPreference().id).toBe('classic')
  })
})
