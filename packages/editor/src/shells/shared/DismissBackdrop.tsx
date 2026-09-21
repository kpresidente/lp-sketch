/**
 * Full-screen pointer sink behind modal chrome such as a collapsed-rail
 * flyout. It stays through pointerup and the compatibility click so the
 * outside tap that dismisses never reaches the canvas as a draw, pan, or select.
 */
export default function DismissBackdrop(props: { onDismiss: () => void }) {
  function consumePointer(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      class="shell-dismiss-backdrop"
      aria-hidden="true"
      onPointerDown={(event) => {
        consumePointer(event)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={consumePointer}
      onPointerUp={consumePointer}
      onPointerCancel={consumePointer}
      onWheel={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        props.onDismiss()
      }}
    />
  )
}
