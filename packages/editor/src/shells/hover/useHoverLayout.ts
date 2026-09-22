import { createSignal } from 'solid-js'

/** The popovers Hover can open: the project setup and one per dock group. */
export type HoverPopover = 'setup' | 'conductors' | 'air-terminals' | 'connections' | 'downleads' | 'annotate'

/**
 * Transient chrome state only. An open popover is Hover's modal chrome and
 * never enters project history; Hover stores no device preference of its own.
 */
export function useHoverLayout() {
  const [openPopover, setOpenPopover] = createSignal<HoverPopover | null>(null)

  return {
    openPopover,
    /** Opens a popover, or closes it when it is the one already open. */
    togglePopover(id: HoverPopover) {
      setOpenPopover((current) => (current === id ? null : id))
    },
    closePopover(): boolean {
      const wasOpen = openPopover() !== null
      setOpenPopover(null)
      return wasOpen
    },
  }
}

export type HoverLayout = ReturnType<typeof useHoverLayout>
