# Monorepo Foundation Implementation Plan

> **For agentic workers:** Use the implementation and verification skills to execute the tasks below. This is an authorized structural migration; preserve the browser app's behavior.

**Goal:** Establish npm workspaces for the browser app, a mobile skeleton, the shared project core, and the shared editor.

**Architecture:** `apps/web` boots the shared SolidJS editor. `packages/core` owns the project model and pure drawing calculations; `packages/editor` owns the rendering and interface. `apps/mobile` reserves the Capacitor application boundary without implementing native features yet.

**Tech Stack:** Existing npm, TypeScript, SolidJS, Vite, Vitest, and Playwright versions.

**Spec:** The discussion in this task: retain the browser app, share the editor and project format with a future Capacitor tablet app, and establish the structure before implementing mobile interactions.

## Global Constraints

- Preserve existing behavior, project schema, exported output, and browser URLs.
- Keep root development, build, test, and audit commands working.
- Keep the root `.env.local` location and root `dist` deployment artifact.
- Retain the API and existing Azure deployment workflow.
- Do not implement Pencil gestures, native storage, cloud sync, or native projects in this change.
- Move co-located tests with their implementation and preserve regression snapshots.
- Keep shared core independent of editor and app packages.
- Keep mobile as an explicitly documented skeleton, with no fabricated bundle identity or release configuration.

## Task 1: Establish workspace boundaries and migrate source

**Files:** root `package.json` and lockfile; `apps/web/{package.json,index.html,src/main.tsx,public,vite.config.ts}`; `apps/mobile/{package.json,README.md,src/.gitkeep}`; `packages/core/{package.json,src}`; `packages/editor/{package.json,src}`.

- [x] Record baseline build and existing test results.
- [x] Create the npm workspace manifests with the existing dependency versions.
- [x] Move project types, model, pure geometry/snapping/domain helpers, and their tests into core.
- [x] Move the remaining editor source and its tests into editor; move browser startup and static assets into web.
- [x] Rewrite cross-package imports to the workspace package exports and preserve intra-package relative imports.
- [x] Add a shared editor entry point and stylesheet export consumed by the browser entry point.
- [x] Add the documented mobile workspace skeleton.

## Task 2: Preserve build, help, tests, and developer workflows

**Files:** root and workspace TypeScript configs; root `vitest.config.ts`, `playwright.config.ts`, `.gitignore`; `packages/editor/src/help/{vite-plugin-help.ts,build-help.mjs}`; `scripts/contrast-audit.mjs`; `README.md`, `AGENTS.md`, `docs/{ENGINEERING.md,OPERATIONS.md,README.md}`.

- [x] Make root scripts delegate browser startup/build while typechecking core, editor, and web.
- [x] Keep browser environment loading and build output at repository root.
- [x] Give help generation an explicit output directory so each application can bundle the same manual.
- [x] Update unit-test discovery, audits, and current documentation to the new paths.
- [x] Refresh workspace links and the lockfile without upgrading dependencies.

## Task 3: Verify and review

- [x] Run `npm run build` and check the browser artifact includes static assets and generated help.
- [x] Run `npm test`, preserving the existing behavior and export regression suites.
- [x] Run `npm run test:e2e` against the relocated browser application.
- [x] Run `npm run audit:prod:gate` and `npm run audit:contrast`.
- [x] Check workspace dependency direction, stale source paths, and `git diff --check`.
- [x] Request an independent code review of the migration and resolve actionable findings.

## Validation notes

This migration changes ownership and build configuration, not application behavior. The existing behavior, export, and browser suites are the regression contract; avoid tests that merely assert folder names or configuration text. Any discovered runtime regression must be reproduced before fixing it.

- Baseline build passed. The migrated browser build produced the same JavaScript and CSS content hashes (`index-DiCIFo2O.js`, `index-ChBbChEQ.css`).
- Existing third-party dependency versions are unchanged; only workspace links and ownership declarations changed.
- Baseline Vitest with its default parallel workers produced 15 UI worker startup timeouts. A focused UI suite passed with one worker; the Windows configuration now limits workers to one, matching Playwright's existing policy.
- The final standalone `npm test` run passed all 49 test files and 368 tests. The final root build and production dependency audit also passed.
- Independent read-only review found no blocking issues and verified all mapped source/static files are present. Application source bodies are unchanged apart from import paths; the project schema blob hash is unchanged.
- All 26 Chromium E2E cases passed across the full run and targeted retries. Two browser teardown/startup timeouts occurred while available system memory was about 200 MB; the last retry used `--timeout=120000` and passed in 14.6 seconds. No browser assertions or application behavior were changed.
