import { fireEvent, screen as base } from '@solidjs/testing-library'

type Role = Parameters<typeof base.getByRole>[0]
type RoleOptions = Parameters<typeof base.getByRole>[1]

/**
 * Opens whatever chrome hides `element`: a shell may keep a control behind a
 * sidebar tab or a popover until the user opens it, and the opener always
 * points at the hidden container through `aria-controls`. A no-op for
 * controls that are already reachable.
 */
export function revealControl(element: HTMLElement): void {
  let hidden = element.closest('[hidden]')
  for (let depth = 0; hidden instanceof HTMLElement && depth < 4; depth += 1) {
    const opener = hidden.id ? document.querySelector<HTMLElement>(`[aria-controls="${hidden.id}"]`) : null
    if (!opener) {
      return
    }
    fireEvent.click(opener)
    hidden = hidden.parentElement?.closest('[hidden]') ?? null
  }
}

function getByRole<T extends HTMLElement = HTMLElement>(role: Role, options?: RoleOptions): T {
  const visible = base.queryByRole<T>(role, options)
  if (visible) {
    return visible
  }
  // Not visible on this shell: take the mounted match and open its chrome, as a user would.
  const hidden = base.getByRole<T>(role, { ...options, hidden: true })
  revealControl(hidden)
  return hidden
}

/**
 * `screen` for behavior tests, which must read the same on any shell. Only
 * `getByRole` differs from testing-library's: when no visible control matches,
 * it opens the tab or popover holding the hidden match and returns it.
 * `queryByRole` stays literal so an absence check means absence.
 */
export const screen = { ...base, getByRole }
