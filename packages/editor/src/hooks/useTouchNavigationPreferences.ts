import { createSignal } from 'solid-js'

const STORAGE_KEY = 'lp-sketch.input.one-finger-pan.v1'

function loadOneFingerPan(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Device preference, separate from project files and drawing undo history. */
export function useTouchNavigationPreferences() {
  const [oneFingerPanEnabled, setEnabled] = createSignal(loadOneFingerPan())

  return {
    oneFingerPanEnabled,
    setOneFingerPanEnabled(enabled: boolean) {
      setEnabled(enabled)
      try {
        window.localStorage.setItem(STORAGE_KEY, String(enabled))
      } catch {
        // The preference still works for this session if storage is unavailable.
      }
    },
  }
}
