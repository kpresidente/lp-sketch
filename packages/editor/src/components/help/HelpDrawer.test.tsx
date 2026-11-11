// @vitest-environment jsdom

// Regression test for the help search's pending-debounce state.

import { fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHelpState, HelpProvider } from '../../context/HelpContext'
import { installAppTestEnvironment } from '../../shells/testing/installAppTestEnvironment'
import HelpDrawer from './HelpDrawer'

installAppTestEnvironment()

afterEach(() => {
  vi.useRealTimers()
})

describe('HelpDrawer search', () => {
  it('stays out of search mode when the query is cleared before the debounce fires', async () => {
    const help = createHelpState()
    const { container } = render(() => (
      <HelpProvider value={help}>
        <HelpDrawer />
      </HelpProvider>
    ))
    help.openHelp()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const searchInput = screen.getByPlaceholderText('Search help...') as HTMLInputElement
    await fireEvent.input(searchInput, { target: { value: 'scale' } })
    await fireEvent.click(screen.getByTitle('Clear search'))
    expect(searchInput.value).toBe('')

    // The search scheduled by the keystroke must not run for a cleared query.
    await vi.advanceTimersByTimeAsync(500)

    expect(container.querySelector('.help-search-results')).toBeNull()
    const content = container.querySelector('.help-content') as HTMLElement
    expect(content.style.display).not.toBe('none')
  })
})
