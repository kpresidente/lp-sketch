# Connection Symbol Class Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align schema validation, save/load, and autosave restore so class-aware connection symbols load successfully.

**Architecture:** Keep runtime connection symbols class-aware and update the project schema to match the intended contract. Add regression tests around schema validation and autosave restore so invalid load regressions are caught before release.

**Tech Stack:** TypeScript, Vitest, SolidJS, Ajv JSON Schema validation

---

### Task 1: Add failing schema regression tests

**Files:**
- Modify: `src/model/project.integration.test.ts`

**Step 1: Write the failing test**

Add a test that creates a valid project containing class-aware `bond`, `cable_to_cable_connection`, `cadweld_connection`, `connect_existing`, `mechanical_crossrun_connection`, `cadweld_crossrun_connection`, and `ground_rod` symbols, then asserts `validateProject(project).valid === true`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/model/project.integration.test.ts`
Expected: FAIL with schema validation errors on connection symbols or `ground_rod`.

**Step 3: Write minimal implementation**

Update the project JSON schema so the intended class-aware symbols accept `class1` and `class2`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/model/project.integration.test.ts`
Expected: PASS

### Task 2: Add failing autosave restore regression test

**Files:**
- Modify: `src/hooks/useProjectAutosave.test.tsx`

**Step 1: Write the failing test**

Add a test that persists an autosave draft containing class-aware `cable_to_cable_connection` and `ground_rod` symbols, mounts the autosave hook, and asserts the draft restores instead of being discarded.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useProjectAutosave.test.tsx`
Expected: FAIL because the draft is rejected during validation on mount.

**Step 3: Write minimal implementation**

Use the same schema update from Task 1 so autosave restore accepts the saved draft.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useProjectAutosave.test.tsx`
Expected: PASS

### Task 3: Update documentation and verify

**Files:**
- Modify: `src/help/USER_MANUAL.md`

**Step 1: Update docs**

Change the symbol reference and connection component descriptions so they describe the intended class-aware connection symbols.

**Step 2: Run focused verification**

Run: `npm test -- src/model/project.integration.test.ts src/hooks/useProjectAutosave.test.tsx`
Expected: PASS

**Step 3: Run broader verification**

Run: `npm test`
Expected: PASS
