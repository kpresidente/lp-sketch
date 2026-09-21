import { createContext, createSignal, useContext, type Accessor, type JSX } from 'solid-js'
import { findShell, readShellPreference, writeShellPreference, type ShellId, type ShellRegistration } from './registry'

/** The active shell and the one action that changes it, for the shell picker block. */
export interface ShellState {
  shell: Accessor<ShellRegistration>
  /** Stores the preference and re-mounts the chrome in place. Unknown ids are ignored. */
  setShell: (id: ShellId) => void
}

export function createShellState(initial: ShellRegistration = readShellPreference()): ShellState {
  const [shell, setActive] = createSignal(initial)
  return {
    shell,
    setShell(id) {
      const next = findShell(id)
      if (!next || next === shell()) {
        return
      }
      writeShellPreference(id)
      setActive(next)
    },
  }
}

const ShellContext = createContext<ShellState>()

export function ShellProvider(props: { value: ShellState; children: JSX.Element }) {
  return <ShellContext.Provider value={props.value}>{props.children}</ShellContext.Provider>
}

export function useShell(): ShellState {
  const state = useContext(ShellContext)
  if (!state) {
    throw new Error('useShell must be used within a ShellProvider')
  }
  return state
}
