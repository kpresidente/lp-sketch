// @vitest-environment jsdom

import { render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportClientError } from '../lib/telemetry'
import AppErrorBoundary from './AppErrorBoundary'

vi.mock('../lib/telemetry', () => ({
  reportClientError: vi.fn(),
}))

function CrashOnRender() {
  throw new Error('Boundary crash test')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a fallback UI when children throw during render', () => {
    const reportClientErrorMock = vi.mocked(reportClientError)
    render(() => (
      <AppErrorBoundary>
        <CrashOnRender />
      </AppErrorBoundary>
    ))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Application error')).toBeTruthy()
    expect(screen.getByText('Boundary crash test')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(reportClientErrorMock).toHaveBeenCalledWith(
      'error-boundary',
      expect.any(Error),
      expect.objectContaining({ source: 'AppErrorBoundary', handled: true }),
    )
  })
})
