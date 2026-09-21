import { lazy, Suspense } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { readShellPreference, type ShellRegistration } from './registry'
import type { ShellProps } from './types'

interface ShellHostProps extends ShellProps {
  /** Overrides the device preference. Used by tests and, later, by the shell picker. */
  shell?: ShellRegistration
}

/**
 * Resolves the active shell once and mounts it. Eager shells render on the
 * first frame with no boundary around them; lazy shells load on demand behind
 * a neutral fallback.
 */
export default function ShellHost(props: ShellHostProps) {
  const registration = props.shell ?? readShellPreference()

  if (registration.kind === 'eager') {
    return <Dynamic component={registration.component} slots={props.slots} onChromeReady={props.onChromeReady} />
  }

  const LazyShell = lazy(registration.load)
  return (
    <Suspense fallback={<div class="shell-loading" aria-busy="true" />}>
      <LazyShell slots={props.slots} onChromeReady={props.onChromeReady} />
    </Suspense>
  )
}
