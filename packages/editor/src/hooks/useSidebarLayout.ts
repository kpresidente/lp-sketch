import { batch, createSignal } from 'solid-js'

const STORAGE_KEY = 'lp-sketch.sidebar.collapsed.v1'

export type SidebarSection = 'project' | 'tools' | 'components' | 'material' | 'scale' | 'layers'

function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
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
        window.localStorage.setItem(STORAGE_KEY, String(next))
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
