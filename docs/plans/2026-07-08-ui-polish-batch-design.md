# UI Polish Batch Design

## Goal

Capture the July 2026 LP Sketch polish batch before implementation so the work can be resumed safely after context compaction and so the cross-cutting rename and schema decisions stay explicit.

## Scope

This batch covers six user-requested changes:

1. Preserve the user manual's last scroll location when opening it from the main help/manual icon.
2. Rename PDF background "brightness" to "transparency" throughout the app.
3. Remove the "Connect Existing" placement tool and move "Steel Bond" into its sidebar slot.
4. Add a background mask option for text annotations.
5. Rename the "Continued" annotation symbol to "Break" and replace its glyph/icon.
6. Add installable web app icon support for Edge/Windows and iOS Home Screen.

## Current Findings

- The top-right help icon currently calls `help.openHelp('help-top')` in `src/components/PropertiesBar.tsx`, forcing the manual to the top.
- `HelpDrawer` already stores raw scroll position in `localStorage` under `lp-sketch.help.scroll.v1`, but `HelpContext.openHelp()` always resolves an anchor and navigates when opening.
- PDF background controls are named `pdfBrightness` and `pdfBrightnessByPage` in project state, schema, migration, autosave, UI, tests, and export code.
- The current visible brightness model uses `1` as fully visible PDF and `0` as washed out. A transparency model should invert this: `0` means fully visible/opaque PDF, and `1` means fully transparent/faded PDF.
- `continued` is a persisted `SymbolType`, not just label text. It appears in schema, defaults, renderers, layers, legend filtering, symbol class logic, quick access, help, and tests.
- `connect_existing` is also persisted and renderable. Removing the placement tool should not break existing projects containing this symbol.
- Text annotations currently have no persisted background mask field. Display rendering happens in `TextsOverlay`; flattened export rendering happens in `src/workspace/renderCore/drawProject.ts`.
- `index.html` only references `/favicon.svg`; there is no web app manifest or Apple touch icon.

## Chosen Approach

Treat this as a compatibility-preserving product polish pass:

- User-facing terminology should fully change where requested.
- Saved project files from older versions should continue to open.
- Removed tools should be unavailable for new placement but remain renderable for old drawings.
- Schema changes should be migrated in `src/model/migration.ts` and validated in `src/model/project-schema-v1.json`.
- Tests should be updated for both the new behavior and legacy import compatibility.

## Design Decisions

### Manual Location

The main help/manual icon should open the drawer without a target anchor. That path should restore the saved scroll position. The drawer home button remains the explicit "go to top" action.

Section help buttons should continue to call `help.openHelp(anchor)` and navigate to their section.

Acceptance criteria:

- Opening from the top-right manual icon restores the last manual scroll location.
- Clicking the home button scrolls to the top.
- Section-specific help buttons still navigate to the requested section.
- Closing and reopening preserves location across app reloads when localStorage is available.

### PDF Transparency

Persist the new model as `pdfTransparency` and `pdfTransparencyByPage`.

Migration should map legacy values:

- `pdfTransparency = 1 - pdfBrightness`
- `pdfTransparencyByPage[page] = 1 - pdfBrightnessByPage[page]`

Rendering should use visible PDF alpha or white-wash opacity derived from transparency:

- screen wash opacity: `pdfTransparency`
- export source PDF opacity: `1 - pdfTransparency`
- source PDF white wash opacity: `pdfTransparency`

Naming guidance:

- UI label: `Transparency`
- Accessible label: `PDF background transparency`
- Help/manual copy: `PDF background transparency`
- Internal helpers should use `Transparency`, not `Brightness`, except in migration code that reads legacy fields.
- Existing legacy field names may appear only in compatibility/migration tests and comments that explain old files.

Acceptance criteria:

- User-visible text no longer says "brightness" for PDF background controls.
- A 0% transparency setting shows the PDF at full strength.
- A higher transparency setting fades the PDF.
- Old project files containing `pdfBrightness` still load and display the equivalent visual result.
- New project saves emit `pdfTransparency` fields, not `pdfBrightness` fields.

### Connect Existing Removal And Steel Bond Move

Remove `connect_existing` from visible creation surfaces:

- Components sidebar
- Quick access addable symbols
- Default quick-access entries if present
- User manual component/tool tables

Keep `connect_existing` in schema and renderers for backward compatibility unless a future cleanup explicitly drops legacy symbols.

Move `steel_bond` into the former second-row first-column Connections slot. Grounding should then show only Ground Rod unless a layout adjustment is needed.

Acceptance criteria:

- The Connections section displays Bond, Mechanical, Cadweld, Steel Bond, Mechanical Crossrun, and Cadweld Crossrun.
- The Grounding section no longer includes Steel Bond.
- There is no visible "Connect Existing" placement button or quick-access item.
- Existing projects with `connect_existing` symbols still render, select, export, and save without data loss.

### Text Background Mask

Add an optional boolean `backgroundMask` field to text annotations.

Default behavior:

- New text annotations use the current active text mask setting.
- Existing text annotations migrate with `backgroundMask: false`.
- The property can be toggled from the properties bar while the Text tool is active and when a text annotation is selected.

Rendering:

- SVG overlay should draw a white or near-white rectangle behind masked text before drawing glyphs.
- Canvas/export rendering should draw the same mask before `fillText`.
- Selection and hover outlines should remain visible and should not be confused with the mask rectangle.
- Mask bounds should include padding and support multiline text.

Acceptance criteria:

- Text tool has a properties-bar toggle for background mask.
- New text notes honor the toggle.
- Selected existing text notes can have the mask toggled on/off.
- Mask persists through save/load.
- Mask appears in flattened PNG/JPG/PDF export.
- Multiline text masks cover all lines.

### Continued To Break

Introduce `break` as the current persisted symbol type and migrate legacy `continued` symbols to `break`.

Compatibility:

- The migration layer should accept `continued` in old files and convert to `break`.
- Runtime UI, schema, labels, help, tests, and renderer code should use `break`.
- Any remaining `continued` references should be isolated to migration fixtures or comments explaining legacy import.

Glyph:

- Replace the current curve glyph with a zig-zag break symbol based on the supplied screenshot, using dark note ink (`#1e293b`) in the workspace/export and the standard toolbar icon color.
- Use only the break-line shape; ignore the dimension/arrows/40-degree notes in the screenshot.
- Revised proportions (2026-09-17): compress the zig-zag height by 20%, then by another 10% (72% of the original height). Extend the original left horizontal end by 20%, and match that length on the right. Center the balanced glyph on its placement point and retain the existing stroke weight.
- The symbol remains annotation-layer, material-independent, and no-class.
- It should remain directional so users can rotate/place it along a conductor path.

Acceptance criteria:

- UI label says `Break`.
- Help/manual text says `Break`.
- Placed break symbols render with the new zig-zag glyph in SVG and flattened export.
- Old `continued` symbols load as `break`.
- Break symbols remain excluded from conductor/component legend counts.

### Installable App Icons

Add PWA/home-screen icon assets and metadata:

- `public/manifest.webmanifest`
- `link rel="manifest"` in `index.html`
- `link rel="apple-touch-icon"` in `index.html`
- `meta name="theme-color"` in `index.html`
- PNG icon assets in `public/icons/`

Minimum icon set:

- 192x192 PNG
- 512x512 PNG
- 512x512 maskable PNG, if generated separately
- 180x180 Apple touch icon

Use the existing LP Sketch favicon mark as the starting visual identity unless a new brand icon is provided.

Acceptance criteria:

- Browser DevTools Application/Manifest panel shows app name, theme color, display mode, and icons.
- Edge install uses LP Sketch branding instead of a generic letter icon after reinstalling the app.
- iOS Add to Home Screen has an Apple touch icon available.
- Existing favicon still works in browser tabs.

## Implementation Plan

1. Add or update schema/migration support for `pdfTransparency`, `break`, and text `backgroundMask`.
2. Update defaults, runtime types, model helpers, and compatibility tests.
3. Update rendering paths for break glyph and text masks in SVG and canvas/export.
4. Update sidebar, quick access, properties bar, and manual drawer behavior.
5. Update help/manual source and generated help output.
6. Add PWA manifest/icon assets and HTML metadata.
7. Update unit/integration/e2e tests and run targeted checks.
8. Run full pre-merge validation if time allows: `npm run build && npm test && npm run test:e2e`.

## File Touchpoints

Likely app files:

- `index.html`
- `public/favicon.svg`
- `src/App.tsx`
- `src/types/project.ts`
- `src/model/defaultProject.ts`
- `src/model/migration.ts`
- `src/model/project-schema-v1.json`
- `src/model/validation.test.ts`
- `src/components/PropertiesBar.tsx`
- `src/components/PropertiesToolOptions.tsx`
- `src/context/HelpContext.tsx`
- `src/components/help/HelpDrawer.tsx`
- `src/components/sidebar/ComponentsPanel.tsx`
- `src/components/sidebar/ProjectPanel.tsx`
- `src/components/QuickAccessBar.tsx`
- `src/components/SymbolGlyph.tsx`
- `src/components/overlay/TextsOverlay.tsx`
- `src/workspace/renderCore/drawSymbol.ts`
- `src/workspace/renderCore/drawProject.ts`
- `src/lib/export.ts`
- `src/lib/autosave.ts`
- `src/lib/componentAvailability.ts`
- `src/lib/layers.ts`
- `src/lib/legend.ts`
- `src/lib/symbolClass.ts`
- `src/help/USER_MANUAL.md`
- `public/help.html`

Likely tests:

- `src/App.behavior.test.tsx`
- `src/App.interaction.test.tsx`
- `src/App.pdf-background.test.tsx`
- `src/components/SymbolGlyph.test.tsx`
- `src/components/overlay/OverlayBranches.test.tsx`
- `src/config/iconRegistry.test.ts`
- `src/lib/export.integration.test.ts`
- `src/lib/export.regression.test.ts`
- `src/lib/export.wrappers.test.ts`
- `src/lib/layers.test.ts`
- `src/lib/legend.test.ts`
- `src/lib/symbolClass.test.ts`
- `src/model/defaultProject.test.ts`
- `src/model/migration.test.ts`
- `src/model/project.integration.test.ts`
- `e2e/project-ops.spec.ts`

Generated or asset files:

- `public/manifest.webmanifest`
- `public/icons/*.png`
- `public/apple-touch-icon.png`
- `public/help.html`
- `public/help-glossary.json`, only if the help build changes it.

## Verification Plan

Targeted checks:

- `npm run build`
- `npm test -- --run src/model/migration.test.ts`
- `npm test -- --run src/components/SymbolGlyph.test.tsx`
- `npm test -- --run src/lib/export.integration.test.ts`
- `npm test -- --run src/App.behavior.test.tsx`
- `npm run test:e2e -- project-ops.spec.ts`

Final checks:

- `npm run build && npm test && npm run test:e2e`
- Manual browser check for help drawer location, text mask visuals, sidebar tool placement, and manifest/icon metadata.

## Context Resume Checklist

If context compacts mid-implementation, resume with:

1. Read this file.
2. Run `git status --short`.
3. Search current remaining legacy terms:
   - `rg -n "brightness|pdfBrightness|continued|Connect Existing|connect_existing" src public docs e2e`
4. Inspect migration/schema state before editing project model files.
5. Check whether generated help and icon assets have been regenerated.
6. Continue from the implementation checklist below.

## Implementation Checklist

- [x] Confirm schema naming approach before code edits if the user wants a different persistence strategy.
- [x] Add `pdfTransparency` settings and legacy brightness migration.
- [x] Add `break` symbol type and legacy continued migration.
- [x] Add text `backgroundMask` model field and migration.
- [x] Update manual drawer open behavior.
- [x] Update PDF transparency UI, quick access, project panel, export, docs, and tests.
- [x] Remove Connect Existing from creation UI and move Steel Bond to Connections.
- [x] Implement Break glyph/icon in SVG, canvas, and sidebar/quick-access icons.
- [x] Implement text background mask controls and rendering/export.
- [x] Add web manifest, Apple touch icon, generated PNG icons, and HTML metadata.
- [x] Rebuild help output.
- [x] Run targeted tests.
- [x] Run full validation or record any skipped checks.

## Non-Goals

- Removing legacy `connect_existing` rendering support.
- Dropping support for project files containing `pdfBrightness` or `continued`.
- Redesigning the overall sidebar layout beyond the requested Steel Bond move.
- Adding offline service worker support beyond icon/install metadata.
- Changing line/conductor geometry behavior.
