import type { Accessor, Component, JSX } from 'solid-js'

/**
 * UI the app owns and the shell must place exactly once. Each slot is a render
 * function so the content is created under the shell's reactive owner.
 */
export interface ShellSlots {
  /** The drawing stage (`workspace/Workspace.tsx`). */
  workspace: () => JSX.Element
  /** App-owned dialogs: annotation, legend, general notes, report. Never inside an inert region. */
  dialogs: () => JSX.Element
  /** The help drawer. */
  helpDrawer: () => JSX.Element
}

/** The one signal and one action a shell exposes to the app. */
export interface ShellChrome {
  /** True while shell chrome such as a flyout or popover covers the workspace and its bars. */
  chromeModalOpen: Accessor<boolean>
  /** Closes any open modal chrome. Returns true when something was open. */
  closeChromeModal: () => boolean
}

export interface ShellProps {
  slots: ShellSlots
  /** Called once, synchronously during shell setup, with the shell's chrome handle. */
  onChromeReady: (chrome: ShellChrome) => void
}

/** A shell arranges blocks and slots into a full screen and reads state from `useAppController()`. */
export type ShellComponent = Component<ShellProps>
