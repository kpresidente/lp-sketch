import { onCleanup, onMount, type Accessor } from 'solid-js'
import type { Tool } from '../types/project'

interface UseGlobalAppShortcutsOptions {
  tool: Accessor<Tool>
  isEditingContextActive?: Accessor<boolean>
  isCanvasKeyboardContext?: () => boolean
  handleEnterToolFinish?: () => boolean
  handleUndo: () => void
  handleRedo: () => void
  deleteSelection: () => void
  deleteMultiSelection: () => void
  clearTransientToolState: () => void
  toggleHelp: () => void
  onResize: () => void
  onCleanupExtra?: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }

  const editableHost = target.closest('[contenteditable]')
  return editableHost instanceof HTMLElement && editableHost.isContentEditable
}

export function useGlobalAppShortcuts(options: UseGlobalAppShortcutsOptions) {
  onMount(() => {
    const keyListener = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const ctrlOrCmd = event.ctrlKey || event.metaKey
      const targetIsEditable = isEditableTarget(event.target)
      const editingContextActive = options.isEditingContextActive?.() ?? false

      if (ctrlOrCmd && event.key.toLowerCase() === 'z') {
        if (targetIsEditable) {
          return
        }

        if (editingContextActive) {
          event.preventDefault()
          return
        }

        event.preventDefault()

        if (event.shiftKey) {
          options.handleRedo()
        } else {
          options.handleUndo()
        }
        return
      }

      if (ctrlOrCmd && event.key.toLowerCase() === 'y') {
        if (targetIsEditable) {
          return
        }

        if (editingContextActive) {
          event.preventDefault()
          return
        }

        event.preventDefault()
        options.handleRedo()
        return
      }

      if (
        event.key === 'Enter' &&
        !ctrlOrCmd &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (targetIsEditable || editingContextActive) {
          return
        }

        if (options.isCanvasKeyboardContext && !options.isCanvasKeyboardContext()) {
          return
        }

        if (options.handleEnterToolFinish?.()) {
          event.preventDefault()
          return
        }
      }

      // F1 or ? (when no text input focused) toggles help drawer
      if (event.key === 'F1') {
        event.preventDefault()
        options.toggleHelp()
        return
      }

      if (
        event.key === '?' &&
        !ctrlOrCmd &&
        !targetIsEditable
      ) {
        event.preventDefault()
        options.toggleHelp()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (targetIsEditable) {
          return
        }

        if (editingContextActive) {
          event.preventDefault()
          return
        }

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
        if (targetIsEditable) {
          return
        }

        if (editingContextActive) {
          event.preventDefault()
          return
        }

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
