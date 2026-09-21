/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { REQUIRED_BLOCKS } from '../blocks/registry'
import { AppControllerProvider } from '../context/AppControllerContext'
import { createHelpState, HelpProvider } from '../context/HelpContext'
import { SHELLS, type ShellRegistration } from './registry'
import { createFixtureController } from './testing/createFixtureController'
import type { ShellChrome, ShellComponent } from './types'

async function resolveShell(registration: ShellRegistration): Promise<ShellComponent> {
  return registration.kind === 'eager' ? registration.component : (await registration.load()).default
}

/**
 * The gate every shell must pass: mount it with a fixture controller and
 * confirm each required block is present or explicitly waived, and that each
 * app-owned slot is placed exactly once.
 */
describe.each(SHELLS)('shell "$id" block coverage', (registration) => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => cleanup())

  it('mounts every required block or waives it with a reason', async () => {
    const Shell = await resolveShell(registration)
    let chrome: ShellChrome | undefined

    render(() => (
      <HelpProvider value={createHelpState()}>
        <AppControllerProvider value={createFixtureController()}>
          <Shell
            onChromeReady={(handle) => {
              chrome = handle
            }}
            slots={{
              workspace: () => <div data-testid="slot-workspace" />,
              dialogs: () => <div data-testid="slot-dialogs" />,
              helpDrawer: () => <div data-testid="slot-help-drawer" />,
            }}
          />
        </AppControllerProvider>
      </HelpProvider>
    ))

    for (const block of REQUIRED_BLOCKS) {
      const waiver = registration.waivedBlocks[block.id]
      if (waiver !== undefined) {
        expect(waiver.trim().length, `waiver for "${block.id}" needs a reason`).toBeGreaterThan(0)
        continue
      }

      const matches = screen.queryAllByRole(block.role, block.name ? { name: block.name } : undefined)
      expect(matches.length, `shell "${registration.id}" must mount block "${block.id}"`).toBe(1)
    }

    for (const slot of ['slot-workspace', 'slot-dialogs', 'slot-help-drawer']) {
      expect(screen.getAllByTestId(slot), `slot "${slot}" must be placed exactly once`).toHaveLength(1)
    }

    expect(chrome, 'shell must register its chrome handle during setup').toBeDefined()
    expect(chrome?.chromeModalOpen()).toBe(false)
    expect(chrome?.closeChromeModal()).toBe(false)
  })
})
