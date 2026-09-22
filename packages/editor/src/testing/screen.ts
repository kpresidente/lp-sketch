import { fireEvent, screen as base } from '@solidjs/testing-library'

type Role = Parameters<typeof base.getByRole>[0]
type RoleOptions = Parameters<typeof base.getByRole>[1]

/**
 * Clicks the sidebar tab that holds `element` when a shell keeps that tab
 * hidden until opened. A no-op for controls that are already reachable.
 */
export function revealTab(element: HTMLElement): void {
  const panel = element.closest('[role="tabpanel"]')
  if (!(panel instanceof HTMLElement) || !panel.hidden) {
    return
  }
  const tabId = panel.getAttribute('aria-labelledby')
  const tab = tabId ? document.getElementById(tabId) : null
  if (tab) {
    fireEvent.click(tab)
  }
}

function getByRole<T extends HTMLElement = HTMLElement>(role: Role, options?: RoleOptions): T {
  const visible = base.queryByRole<T>(role, options)
  if (visible) {
    return visible
  }
  // Not visible on this shell: take the mounted match and open its tab, as a user would.
  const hidden = base.getByRole<T>(role, { ...options, hidden: true })
  revealTab(hidden)
  return hidden
}

/**
 * `screen` for behavior tests, which must read the same on any shell. Only
 * `getByRole` differs from testing-library's: when no visible control matches,
 * it reveals the sidebar tab holding the hidden match and returns it.
 * `queryByRole` stays literal so an absence check means absence.
 */
export const screen = { ...base, getByRole }
