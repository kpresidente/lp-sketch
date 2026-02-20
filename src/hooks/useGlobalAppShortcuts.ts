import { onCleanup, onMount, type Accessor } from 'solid-js'
import type { Tool } from '../types/project'

interface UseGlobalAppShortcutsOptions {
  tool: Accessor<Tool>
  handleUndo: () => void
  handleRedo: () => void
  deleteSelection: () => void
  deleteMultiSelection: () => void
  clearTransientToolState: () => void
  onResize: () => void
  onCleanupExtra?: () => void
}

export function useGlobalAppShortcuts(options: UseGlobalAppShortcutsOptions) {
  onMount(() => {
    const keyListener = (event: KeyboardEvent) => {
      const ctrlOrCmd = event.ctrlKey || event.metaKey

      if (ctrlOrCmd && event.key.toLowerCase() === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          options.handleRedo()
        } else {
          options.handleUndo()
        }
        return
      }

      if (ctrlOrCmd && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        options.handleRedo()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (options.tool() === 'select') {
          event.preventDefault()
          options.deleteSelection()
        } else if (options.tool() === 'multi_select') {
          event.preventDefault()
          options.deleteMultiSelection()
        }
        return
      }

      if (event.key === 'Escape') {
        options.clearTransientToolState()
      }
    }

    window.addEventListener('keydown', keyListener)
    window.addEventListener('resize', options.onResize)

    onCleanup(() => {
      options.onCleanupExtra?.()
      window.removeEventListener('keydown', keyListener)
      window.removeEventListener('resize', options.onResize)
    })
  })
}
