import { createContext, createSignal, useContext, type ParentProps } from 'solid-js'

const STORAGE_KEY_PIN = 'lp-sketch.help.pinned.v1'
const STORAGE_KEY_LAST_ANCHOR = 'lp-sketch.help.last-anchor.v1'

export interface HelpState {
  /** Whether the help drawer is open */
  isOpen: () => boolean
  /** Whether the drawer is pinned (persists across tool switches) */
  isPinned: () => boolean
  /** The anchor to navigate to (set on each openHelp call) */
  targetAnchor: () => string | null
  /** Open the drawer and navigate to a specific anchor */
  openHelp: (anchorId?: string) => void
  /** Close the drawer */
  closeHelp: () => void
  /** Toggle the drawer open/closed */
  toggleHelp: () => void
  /** Toggle the pinned state */
  togglePin: () => void
  /** Close drawer if it's not pinned (called on tool switch, canvas click) */
  closeIfUnpinned: () => void
  /** Clear the target anchor after the drawer has scrolled to it */
  clearTarget: () => void
}

const HelpContext = createContext<HelpState>()

function loadPinState(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY_PIN) === 'true'
  } catch {
    return false
  }
}

function savePinState(pinned: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PIN, String(pinned))
  } catch {
    // Ignore storage errors
  }
}

function loadLastAnchor(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY_LAST_ANCHOR)
  } catch {
    return null
  }
}

function saveLastAnchor(anchorId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_LAST_ANCHOR, anchorId)
  } catch {
    // Ignore storage errors
  }
}

/** Create help drawer state. Call once in App() and pass the result to HelpProvider. */
export function createHelpState(): HelpState {
  const [isOpen, setIsOpen] = createSignal(false)
  const [isPinned, setIsPinned] = createSignal(loadPinState())
  const [targetAnchor, setTargetAnchor] = createSignal<string | null>(null)

  const state: HelpState = {
    isOpen,
    isPinned,
    targetAnchor,

    openHelp(anchorId?: string) {
      const anchor = anchorId ?? loadLastAnchor() ?? 'help-top'
      setTargetAnchor(anchor)
      saveLastAnchor(anchor)
      setIsOpen(true)
    },

    closeHelp() {
      setIsOpen(false)
    },

    toggleHelp() {
      if (isOpen()) {
        setIsOpen(false)
      } else {
        state.openHelp()
      }
    },

    togglePin() {
      const next = !isPinned()
      setIsPinned(next)
      savePinState(next)
    },

    closeIfUnpinned() {
      if (!isPinned()) {
        setIsOpen(false)
      }
    },

    clearTarget() {
      setTargetAnchor(null)
    },
  }

  return state
}

export function HelpProvider(props: ParentProps & { value: HelpState }) {
  return (
    <HelpContext.Provider value={props.value}>
      {props.children}
    </HelpContext.Provider>
  )
}

export function useHelp(): HelpState {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider.')
  }
  return context
}
