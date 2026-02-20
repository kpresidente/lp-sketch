import { ErrorBoundary, type JSX } from 'solid-js'
import { reportClientError } from '../lib/telemetry'

interface AppErrorBoundaryProps {
  children: JSX.Element
}

export default function AppErrorBoundary(props: AppErrorBoundaryProps) {
  let lastReportedError: unknown = null

  function reportBoundaryError(error: unknown) {
    if (lastReportedError === error) {
      return
    }

    lastReportedError = error
    reportClientError('error-boundary', error, {
      source: 'AppErrorBoundary',
      handled: true,
    })
  }

  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        reportBoundaryError(error)
        return (
          <main class="app-error-boundary" role="alert" aria-live="assertive">
            <h1>Application error</h1>
            <p class="app-error-boundary-message">
              {error?.message || 'An unexpected runtime error occurred.'}
            </p>
            <div class="app-error-boundary-actions">
              <button type="button" class="btn" onClick={() => reset()}>
                Try again
              </button>
              <button
                type="button"
                class="btn"
                onClick={() => {
                  window.location.reload()
                }}
              >
                Reload app
              </button>
            </div>
          </main>
        )
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
