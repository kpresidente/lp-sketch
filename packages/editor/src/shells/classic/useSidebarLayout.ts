import { batch, createSignal } from 'solid-js'

/** Classic-owned preference, namespaced per the shell preferences table. */
export const SIDEBAR_COLLAPSED_KEY = 'lp-sketch.shell.classic.sidebar.collapsed.v1'
/** Pre-shell key. Read once and migrated forward, then removed. */
export const LEGACY_SIDEBAR_COLLAPSED_KEY = 'lp-sketch.sidebar.collapsed.v1'

export type SidebarSection = 'project' | 'tools' | 'components' | 'material' | 'scale' | 'layers'

function loadCollapsed(): boolean {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored !== null) {
      return stored === 'true'
    }

    const legacy = window.localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY)
    if (legacy !== null) {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, legacy)
      window.localStorage.removeItem(LEGACY_SIDEBAR_COLLAPSED_KEY)
      return legacy === 'true'
    }

    return false
  } catch {
    return false
  }
}

/** Device layout preference; open flyouts are transient and never enter project history. */
export function useSidebarLayout() {
  const [collapsed, setCollapsed] = createSignal(loadCollapsed())
  const [activeSection, setActiveSection] = createSignal<SidebarSection | null>(null)

  return {
    collapsed,
    activeSection,
    toggleCollapsed() {
      const next = !collapsed()
      batch(() => {
        setCollapsed(next)
        setActiveSection(null)
      })
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // Layout changes still work when storage is unavailable.
      }
    },
    toggleSection(section: SidebarSection) {
      if (collapsed()) setActiveSection((current) => current === section ? null : section)
    },
    closeFlyout(): boolean {
      const wasOpen = activeSection() !== null
      setActiveSection(null)
      return wasOpen
    },
  }
}

export type SidebarLayout = ReturnType<typeof useSidebarLayout>
