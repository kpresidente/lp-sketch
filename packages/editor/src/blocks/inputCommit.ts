/** Enter in a sidebar input commits it and hands focus back to the canvas on the next frame. */
export function blurOnEnter(controller: { onRefocusCanvasFromInputCommit: () => void }) {
  return (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    event.currentTarget.blur()
    controller.onRefocusCanvasFromInputCommit()
  }
}
