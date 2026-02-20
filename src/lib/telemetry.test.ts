// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildClientErrorTelemetryPayload,
  installGlobalErrorTelemetry,
  readClientTelemetryConfig,
  reportClientError,
  resetTelemetryInstallForTests,
  sendClientTelemetryPayload,
  type ClientErrorTelemetryPayload,
} from './telemetry'

function mockPayload(): ClientErrorTelemetryPayload {
  return {
    event: 'client_error',
    kind: 'window-error',
    occurredAt: '2026-02-19T00:00:00.000Z',
    release: 'test',
    environment: 'test',
    page: 'http://localhost/',
    error: {
      name: 'Error',
      message: 'boom',
      stackTop: null,
    },
    context: {},
  }
}

describe('telemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetTelemetryInstallForTests()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    resetTelemetryInstallForTests()
    vi.restoreAllMocks()
  })

  it('parses telemetry config from env values', () => {
    const config = readClientTelemetryConfig({
      VITE_TELEMETRY_ENABLED: 'true',
      VITE_TELEMETRY_ENDPOINT: 'https://telemetry.example.test/client-errors',
      VITE_APP_VERSION: '1.2.3',
      VITE_APP_ENV: 'production',
      MODE: 'test',
    })

    expect(config).toEqual({
      enabled: true,
      endpoint: 'https://telemetry.example.test/client-errors',
      release: '1.2.3',
      environment: 'production',
    })
  })

  it('builds redacted payloads without query-string leakage', () => {
    window.history.replaceState({}, '', '/annotate?token=abcdef123456#private')

    const payload = buildClientErrorTelemetryPayload(
      'window-error',
      new Error('User john@example.com submitted 1234567890'),
      { source: 'https://app.test/path?secret=abc' },
      {
        enabled: true,
        endpoint: 'https://telemetry.example.test/client-errors',
        release: '1.0.0',
        environment: 'production',
      },
      new Date('2026-02-19T11:00:00.000Z'),
    )

    expect(payload.page).toMatch(/^http:\/\/localhost(?::\d+)?\/annotate$/)
    expect(payload.error.message).not.toContain('john@example.com')
    expect(payload.error.message).not.toContain('1234567890')
    expect(payload.context.source).toBe('https://app.test/path')
  })

  it('sends payload via sendBeacon when available', () => {
    const sendBeacon = vi.fn(() => true)
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const sent = sendClientTelemetryPayload(mockPayload(), {
      enabled: true,
      endpoint: 'https://telemetry.example.test/client-errors',
      release: '1.0.0',
      environment: 'production',
    })

    expect(sent).toBe(true)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns false when telemetry is disabled', () => {
    const sent = reportClientError(
      'error-boundary',
      new Error('disabled'),
      {},
      {
        enabled: false,
        endpoint: 'https://telemetry.example.test/client-errors',
        release: '1.0.0',
        environment: 'test',
      },
    )

    expect(sent).toBe(false)
  })

  it('wires global handlers and removes them on cleanup', () => {
    const sendBeacon = vi.fn(() => true)
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const cleanup = installGlobalErrorTelemetry({
      enabled: true,
      endpoint: 'https://telemetry.example.test/client-errors',
      release: '1.0.0',
      environment: 'test',
    })

    window.dispatchEvent(new ErrorEvent('error', { message: 'global boom' }))
    expect(sendBeacon).toHaveBeenCalledTimes(1)

    cleanup()
    window.dispatchEvent(new ErrorEvent('error', { message: 'ignored boom' }))
    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })
})
