# Runtime Reliability Notes

Date: `2026-02-19`

This document captures Gate 4 runtime hardening behaviors implemented in the app.

## 1) Autosave + Recovery

- Drafts are autosaved to local storage using a debounced write (`800ms`) at key:
  - `lp-sketch:autosave:v1`
- On startup, a valid autosave draft is automatically restored.
- Autosave restoration runs through migration + schema validation before apply.
- Invalid autosave payloads are discarded automatically.
- If a draft exceeds local storage budget, autosave degrades by omitting embedded PDF bytes while preserving geometry and metadata.

### Files

- `src/hooks/useProjectAutosave.ts`
- `src/lib/autosave.ts`
- `src/lib/projectLimits.ts`
- `src/config/runtimeLimits.ts`

## 2) Defensive Import Limits

- PDF import hard limits:
  - max file size: `25 MB`
  - max page width/height: `20,000 pt`
- Project load hard limits:
  - max file size: `30 MB`
  - max aggregate element count: `12,000`

### File

- `src/hooks/useProjectFileActions.ts`

## 3) Graceful Failure Boundary

- The root app render is wrapped in a runtime error boundary.
- Unexpected render/reactive errors display a non-destructive fallback with:
  - `Try again`
  - `Reload app`

### Files

- `src/components/AppErrorBoundary.tsx`
- `src/index.tsx`
- `src/App.css`

## Test Coverage

- Autosave storage behavior:
  - `src/lib/autosave.test.ts`
- Autosave restore/write flow:
  - `src/hooks/useProjectAutosave.test.tsx`
- Runtime boundary fallback:
  - `src/components/AppErrorBoundary.test.tsx`
- Import guard behavior:
  - `src/App.file-actions.test.tsx`

