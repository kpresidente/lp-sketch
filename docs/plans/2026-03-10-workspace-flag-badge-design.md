# Workspace Flag Badge Design

## Goal

Show a small visible indicator in the sidebar header when the workspace canvas feature flag is enabled, and show nothing when it is disabled.

## Scope

This change is intentionally narrow:

- no new flag or settings logic
- no interaction or toggle in the UI
- no badge when the flag is off
- no change to rendering behavior

## Chosen UI

Add a small `on` badge beside the `LP Sketch` title in the sidebar header.

Reasons:

- it is immediately visible
- it stays close to the product title rather than looking like random chrome
- it avoids cluttering the subtitle or the rest of the sidebar

## Implementation Shape

- Read `workspaceCanvasSpikeEnabled()` inside `src/components/AppSidebar.tsx`
- Render a compact badge next to the app name only when the flag is enabled
- Add a small CSS rule in `src/App.css` for the badge styling

The app name and badge should share a row so layout remains stable and obvious.

## Behavior

- Flag on: show badge with text `on`
- Flag off: render nothing extra

No fallback label, tooltip, or interactivity is needed.

## Testing

Add a sidebar-level test that mocks the flag helper and verifies:

- badge is shown when the flag is `true`
- badge is absent when the flag is `false`

This is enough coverage for the change because the behavior is purely conditional rendering.
