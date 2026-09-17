export interface UseDialogResizeSyncOptions {
  onLegendLabelResize: () => void
  onGeneralNotesResize: () => void
}

export function useDialogResizeSync(options: UseDialogResizeSyncOptions) {
  function syncDialogResize() {
    options.onLegendLabelResize()
    options.onGeneralNotesResize()
  }

  return {
    syncDialogResize,
  }
}
