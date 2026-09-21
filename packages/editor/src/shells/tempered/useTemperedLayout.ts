import { batch, createSignal } from 'solid-js'

/** Tempered-owned preferences, namespaced per the shell preferences table. */
export const TEMPERED_COLLAPSED_KEY = 'lp-sketch.shell.tempered.sidebar.collapsed.v1'
export const TEMPERED_TAB_KEY = 'lp-sketch.shell.tempered.tab.v1'

export type TemperedTab = 'draw' | 'annotate' | 'setup'

export const TEMPERED_TABS: ReadonlyArray<{ id: TemperedTab; label: string }> = [
  { id: 'draw', label: 'Draw' },
  { id: 'annotate', label: 'Annotate' },
  { id: 'setup', label: 'Setup' },
]

function isTab(value: string | null): value is TemperedTab {
  return TEMPERED_TABS.some((tab) => tab.id === value)
}

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Layout changes still work when storage is unavailable.
  }
}

/**
 * Device layout state: the collapsed rail and the remembered tab persist; an
 * open flyout is transient and never enters project history.
 */
export function useTemperedLayout() {
  const [collapsed, setCollapsed] = createSignal(readPreference(TEMPERED_COLLAPSED_KEY) === 'true')
  const storedTab = readPreference(TEMPERED_TAB_KEY)
  const [activeTab, setActiveTab] = createSignal<TemperedTab>(isTab(storedTab) ? storedTab : 'draw')
  const [flyoutOpen, setFlyoutOpen] = createSignal(false)
  /** The tab shown in the collapsed rail's flyout, or null while no flyout is open. */
  const flyoutTab = () => (collapsed() && flyoutOpen() ? activeTab() : null)

  function chooseTab(tab: TemperedTab) {
    setActiveTab(tab)
    writePreference(TEMPERED_TAB_KEY, tab)
  }

  return {
    collapsed,
    activeTab,
    flyoutTab,
    /** Expanded sidebar: show a tab. */
    selectTab(tab: TemperedTab) {
      chooseTab(tab)
    },
    /** Collapsed rail: open a tab's flyout, or close it when it is already open. */
    toggleSection(tab: TemperedTab) {
      if (!collapsed()) {
        return
      }
      if (flyoutOpen() && activeTab() === tab) {
        setFlyoutOpen(false)
        return
      }
      batch(() => {
        chooseTab(tab)
        setFlyoutOpen(true)
      })
    },
    toggleCollapsed() {
      const next = !collapsed()
      batch(() => {
        setCollapsed(next)
        setFlyoutOpen(false)
      })
      writePreference(TEMPERED_COLLAPSED_KEY, String(next))
    },
    closeFlyout(): boolean {
      const wasOpen = flyoutTab() !== null
      setFlyoutOpen(false)
      return wasOpen
    },
  }
}

export type TemperedLayout = ReturnType<typeof useTemperedLayout>
