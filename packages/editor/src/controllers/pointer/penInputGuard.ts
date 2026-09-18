type PointerContact = Pick<PointerEvent, 'pointerId' | 'pointerType'>

/** Filters contacts before the canvas gesture and editing controllers see them. */
export function createPenInputGuard() {
  const contacts = new Set<number>()
  const pens = new Set<number>()
  const touches = new Map<number, boolean>()
  let lastPointerType = ''

  function suppressTouches() {
    for (const id of touches.keys()) touches.set(id, false)
  }

  function allowsMove(event: PointerContact): boolean {
    // A move cannot start a new touch: it may belong to a palm held across
    // pen lift, a tool change, or an interrupted gesture.
    return event.pointerType !== 'touch' || touches.get(event.pointerId) === true
  }

  return {
    pointerDown(event: PointerContact): boolean {
      contacts.add(event.pointerId)
      lastPointerType = event.pointerType
      if (event.pointerType === 'pen') {
        pens.add(event.pointerId)
        suppressTouches()
      } else if (event.pointerType === 'touch') {
        touches.set(event.pointerId, pens.size === 0)
      }
      return allowsMove(event)
    },
    allowsMove,
    pointerEnd(event: PointerContact): boolean {
      const allowed = allowsMove(event)
      lastPointerType = event.pointerType
      contacts.delete(event.pointerId)
      pens.delete(event.pointerId)
      touches.delete(event.pointerId)
      return allowed
    },
    hasPointer(event: PointerContact): boolean {
      return contacts.has(event.pointerId)
    },
    // dblclick is still a MouseEvent in WebKit; use its preceding pointer
    // stream rather than assuming that every compatibility event is a mouse.
    allowsDoubleClick(): boolean {
      return lastPointerType !== 'touch'
    },
    suppressTouches,
    reset() {
      contacts.clear()
      pens.clear()
      touches.clear()
      lastPointerType = 'touch'
    },
  }
}
