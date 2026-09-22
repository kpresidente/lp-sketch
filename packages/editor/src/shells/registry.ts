import type { BlockId } from '../blocks/registry'
import ClassicShell from './classic/ClassicShell'
import TemperedShell from './tempered/TemperedShell'
import type { ShellComponent } from './types'

export type ShellId = 'tempered' | 'classic' | 'hover'

/** Global device preference. Never enters project JSON, autosave, or history. */
export const SHELL_PREFERENCE_KEY = 'lp-sketch.shell.v1'

interface ShellRegistrationBase {
  id: ShellId
  label: string
  /** Required blocks this shell intentionally leaves out, each with the reason. */
  waivedBlocks: Partial<Record<BlockId, string>>
}

export type ShellRegistration = ShellRegistrationBase &
  (
    | {
        /** Bundled with the app so the shell paints on the first frame. Use for the default. */
        kind: 'eager'
        component: ShellComponent
      }
    | {
        /** Loaded the first time the shell is selected. */
        kind: 'lazy'
        load: () => Promise<{ default: ShellComponent }>
      }
  )

export const TEMPERED_SHELL: ShellRegistration = {
  id: 'tempered',
  label: 'Tempered',
  kind: 'eager',
  component: TemperedShell,
  waivedBlocks: {},
}

// Classic stays eager: its unit suites and the live switch from the shell
// picker render it synchronously. `lazy` remains for shells added later.
export const CLASSIC_SHELL: ShellRegistration = {
  id: 'classic',
  label: 'Classic',
  kind: 'eager',
  component: ClassicShell,
  waivedBlocks: {
    'stroke-summary':
      'Classic shows the full material, class, and size pickers in its Material and Scale panels, so a stroke summary would repeat them.',
    readouts:
      'Classic shows the page, scale, snapping, and history state inside its panels and the selection in the properties bar.',
  },
}

// Hover loads on first use; its chunk carries the shell, its stylesheet, and nothing else.
export const HOVER_SHELL: ShellRegistration = {
  id: 'hover',
  label: 'Hover',
  kind: 'lazy',
  load: () => import('./hover/HoverShell'),
  waivedBlocks: {
    'stroke-summary':
      'Hover shows the selected material and class directly on its material rail, so a stroke summary would repeat them.',
  },
}

/** In the order the shell picker offers them; the default comes first. */
export const SHELLS: readonly ShellRegistration[] = [TEMPERED_SHELL, CLASSIC_SHELL, HOVER_SHELL]

export const DEFAULT_SHELL: ShellRegistration = TEMPERED_SHELL

export function findShell(id: string | null | undefined): ShellRegistration | undefined {
  return SHELLS.find((shell) => shell.id === id)
}

function preferenceStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The shell this device prefers, or the default when nothing valid is stored. */
export function readShellPreference(): ShellRegistration {
  return findShell(preferenceStorage()?.getItem(SHELL_PREFERENCE_KEY)) ?? DEFAULT_SHELL
}

export function writeShellPreference(id: ShellId): void {
  try {
    preferenceStorage()?.setItem(SHELL_PREFERENCE_KEY, id)
  } catch {
    // The preference is a convenience; the app still runs with the default shell.
  }
}
