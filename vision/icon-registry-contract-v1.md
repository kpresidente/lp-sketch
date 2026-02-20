# Icon Registry Contract v1

Status: Draft implementation contract for Phase 0/1 execution.

## Purpose

Provide one source of truth for button/tool/component icon mapping across the app.

## Requirements

1. UI icon mapping must be centralized in code (single registry module).
2. Sidebar buttons must resolve icon names from registry constants, not inline string literals.
3. Custom icons are allowed when Tabler does not provide an equivalent.
4. Missing Tabler icons must have an explicit fallback decision documented.

## Resolved Decisions

1. `AT Arc` uses a custom icon derived from `IconDotsDiagonal` with middle dot offset to suggest curvature.
2. `Steel Bond` Class II uses a custom filled variant (filled rotated square plus contrasting asterisk).
3. Ground rod button icon remains Tabler, while placed/exported symbol uses custom long-stem glyph.

## Implementation Notes

1. Registry should use stable semantic keys (`tool id`, `symbol type`, `project action`) and map to icon names.
2. Registry should expose a helper for icon class generation where needed.
3. Custom icon components should be colocated and referenced by semantic key.

## Acceptance

1. No sidebar panel contains hardcoded icon-name literals for mapped controls.
2. Unknown/missing icons are not silent; each has fallback mapping or custom component.
3. Snapshot/behavior tests remain green after registry adoption.
