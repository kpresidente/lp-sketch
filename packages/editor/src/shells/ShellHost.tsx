import { lazy, Show, Suspense, type Component } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ShellId, ShellRegistration } from './registry'
import { createShellState, ShellProvider } from './ShellContext'
import type { ShellProps } from './types'

interface ShellHostProps extends ShellProps {
  /** Overrides the device preference for the initial shell. Used by tests. */
  shell?: ShellRegistration
}

type LazyRegistration = Extract<ShellRegistration, { kind: 'lazy' }>

/**
 * Resolves the active shell and mounts it. Eager shells render on the first
 * frame with no boundary around them; lazy shells load on demand behind a
 * neutral fallback. The shell picker block switches shells through the
 * context, which re-creates the chrome and the slots under the new shell.
 */
export default function ShellHost(props: ShellHostProps) {
  const state = createShellState(props.shell)
  const lazyShells = new Map<ShellId, Component<ShellProps>>()
  const lazyComponent = (registration: LazyRegistration) => {
    let component = lazyShells.get(registration.id)
    if (!component) {
      component = lazy(registration.load)
      lazyShells.set(registration.id, component)
    }
    return component
  }

  return (
    <ShellProvider value={state}>
      <Show when={state.shell()} keyed>
        {(registration) => (
          registration.kind === 'eager'
            ? <Dynamic component={registration.component} slots={props.slots} onChromeReady={props.onChromeReady} />
            : (
              <Suspense fallback={<div class="shell-loading" aria-busy="true" />}>
                <Dynamic component={lazyComponent(registration)} slots={props.slots} onChromeReady={props.onChromeReady} />
              </Suspense>
            )
        )}
      </Show>
    </ShellProvider>
  )
}
