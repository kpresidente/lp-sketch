export type TelemetryErrorKind = 'window-error' | 'unhandled-rejection' | 'error-boundary'

export interface ClientTelemetryConfig {
  enabled: boolean
  endpoint: string | null
  release: string
  environment: string
}

type TelemetryPrimitive = string | number | boolean | null

export interface ClientTelemetryContext {
  handled?: boolean
  source?: string
  line?: number
  column?: number
  [key: string]: TelemetryPrimitive | undefined
}

export interface ClientErrorTelemetryPayload {
  event: 'client_error'
  kind: TelemetryErrorKind
  occurredAt: string
  release: string
  environment: string
  page: string | null
  error: {
    name: string
    message: string
    stackTop: string | null
  }
  context: Record<string, TelemetryPrimitive>
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g
const LONG_NUMBER_PATTERN = /\b\d{6,}\b/g

let globalTelemetryCleanup: (() => void) | null = null

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseEnabledFlag(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw
  }
  if (typeof raw !== 'string') {
    return false
  }

  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function redactText(input: string, maxLength = 180): string {
  const flattened = input.replace(/\s+/g, ' ').trim()
  const scrubbed = flattened
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(TOKEN_PATTERN, '[redacted-token]')
    .replace(LONG_NUMBER_PATTERN, '[redacted-number]')

  return scrubbed.slice(0, maxLength)
}

function redactUrl(raw: string): string {
  try {
    const parsed = new URL(raw, 'http://localhost')
    if (parsed.origin === 'null') {
      return parsed.pathname
    }
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return redactText(raw, 120)
  }
}

function isTelemetryPrimitive(value: unknown): value is TelemetryPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function normalizeContext(input: ClientTelemetryContext): Record<string, TelemetryPrimitive> {
  const normalized: Record<string, TelemetryPrimitive> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (
        /^https?:\/\//i.test(trimmed) ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('file://')
      ) {
        normalized[key] = redactUrl(trimmed)
      } else {
        normalized[key] = redactText(trimmed, 120)
      }
      continue
    }
    if (isTelemetryPrimitive(value)) {
      normalized[key] = value
    }
  }
  return normalized
}

function normalizeError(input: unknown): { name: string; message: string; stackTop: string | null } {
  if (input instanceof Error) {
    const stackTop = input.stack
      ? redactText(input.stack.split('\n')[0] ?? input.message, 200)
      : null
    return {
      name: redactText(input.name || 'Error', 80),
      message: redactText(input.message || 'Unknown error', 180),
      stackTop,
    }
  }

  if (typeof input === 'string') {
    return {
      name: 'Error',
      message: redactText(input, 180),
      stackTop: null,
    }
  }

  if (input && typeof input === 'object') {
    const candidate = input as { message?: unknown; name?: unknown }
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Unknown rejection value'
    const name = typeof candidate.name === 'string' ? candidate.name : 'Error'
    return {
      name: redactText(name, 80),
      message: redactText(message, 180),
      stackTop: null,
    }
  }

  return {
    name: 'Error',
    message: 'Unknown error',
    stackTop: null,
  }
}

export function readClientTelemetryConfig(env: Record<string, unknown> = import.meta.env): ClientTelemetryConfig {
  const enabled = parseEnabledFlag(env.VITE_TELEMETRY_ENABLED)
  const endpoint = asNonEmptyString(env.VITE_TELEMETRY_ENDPOINT)
  const release = asNonEmptyString(env.VITE_APP_VERSION) ?? 'dev'
  const environment = asNonEmptyString(env.VITE_APP_ENV) ?? asNonEmptyString(env.MODE) ?? 'unknown'

  return {
    enabled,
    endpoint,
    release,
    environment,
  }
}

export function buildClientErrorTelemetryPayload(
  kind: TelemetryErrorKind,
  error: unknown,
  context: ClientTelemetryContext = {},
  config: ClientTelemetryConfig = readClientTelemetryConfig(),
  now: Date = new Date(),
): ClientErrorTelemetryPayload {
  const page =
    typeof window !== 'undefined' && typeof window.location?.href === 'string'
      ? redactUrl(window.location.href)
      : null

  return {
    event: 'client_error',
    kind,
    occurredAt: now.toISOString(),
    release: config.release,
    environment: config.environment,
    page,
    error: normalizeError(error),
    context: normalizeContext(context),
  }
}

export function sendClientTelemetryPayload(
  payload: ClientErrorTelemetryPayload,
  config: ClientTelemetryConfig = readClientTelemetryConfig(),
): boolean {
  if (!config.enabled || !config.endpoint) {
    return false
  }

  try {
    const body = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(
        config.endpoint,
        new Blob([body], { type: 'application/json' }),
      )
      if (sent) {
        return true
      }
    }

    if (typeof fetch === 'function') {
      void fetch(config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => undefined)
      return true
    }
  } catch {
    return false
  }

  return false
}

export function reportClientError(
  kind: TelemetryErrorKind,
  error: unknown,
  context: ClientTelemetryContext = {},
  config: ClientTelemetryConfig = readClientTelemetryConfig(),
): boolean {
  const payload = buildClientErrorTelemetryPayload(kind, error, context, config)
  return sendClientTelemetryPayload(payload, config)
}

export function installGlobalErrorTelemetry(
  config: ClientTelemetryConfig = readClientTelemetryConfig(),
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  if (globalTelemetryCleanup) {
    return globalTelemetryCleanup
  }

  const onError = (event: ErrorEvent) => {
    reportClientError(
      'window-error',
      event.error ?? event.message ?? 'Unknown window error',
      {
        source: event.filename || 'window',
        line: event.lineno,
        column: event.colno,
      },
      config,
    )
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportClientError(
      'unhandled-rejection',
      event.reason ?? 'Unhandled promise rejection',
      {
        source: 'promise',
      },
      config,
    )
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  const cleanup = () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
    if (globalTelemetryCleanup === cleanup) {
      globalTelemetryCleanup = null
    }
  }

  globalTelemetryCleanup = cleanup
  return cleanup
}

export function resetTelemetryInstallForTests() {
  if (globalTelemetryCleanup) {
    globalTelemetryCleanup()
  }
}
