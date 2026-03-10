# Handled Error Telemetry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Emit structured handled-operation telemetry for high-value recoverable failures using the existing client telemetry pipeline.

**Architecture:** Extend `src/lib/telemetry.ts` with typed handled-operation payload builders and reporters, then wire those helpers into the project file actions and autosave hooks. Keep user-facing error handling unchanged and add focused tests around payload generation and hook emission.

**Tech Stack:** TypeScript, Vitest, SolidJS, browser telemetry via `sendBeacon`/`fetch`

---

### Task 1: Add failing telemetry unit tests

**Files:**
- Modify: `src/lib/telemetry.test.ts`

**Step 1: Write the failing test**

Add tests that verify a handled telemetry payload can be built and reported with:
- explicit event names such as `project_load_failed`
- sanitized message text
- redacted URL/page metadata
- preserved structured context values

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/telemetry.test.ts`
Expected: FAIL because handled-operation payload builders/reporters do not exist yet.

**Step 3: Write minimal implementation**

Extend `src/lib/telemetry.ts` with handled-operation payload types and reporting helpers that reuse the current config/redaction/transport path.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/telemetry.test.ts`
Expected: PASS

### Task 2: Add failing project file action telemetry tests

**Files:**
- Modify: `src/App.file-actions.test.tsx`

**Step 1: Write the failing test**

Add tests that trigger:
- project load schema validation failure
- PDF import failure
- export failure

Assert each path emits the correct handled telemetry event with targeted context.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.file-actions.test.tsx`
Expected: FAIL because those hooks do not yet report handled telemetry.

**Step 3: Write minimal implementation**

Wire handled telemetry helpers into `src/hooks/useProjectFileActions.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.file-actions.test.tsx`
Expected: PASS

### Task 3: Add failing autosave telemetry tests

**Files:**
- Modify: `src/hooks/useProjectAutosave.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- discarded invalid autosave draft
- autosave persist storage failure or oversize skip

Assert the expected handled telemetry event is emitted with narrow context.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useProjectAutosave.test.tsx`
Expected: FAIL because autosave paths do not yet report handled telemetry.

**Step 3: Write minimal implementation**

Wire handled telemetry helpers into `src/hooks/useProjectAutosave.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useProjectAutosave.test.tsx`
Expected: PASS

### Task 4: Update docs and verify

**Files:**
- Modify: `docs/OPERATIONS.md`

**Step 1: Update docs**

Clarify that the telemetry environment variables cover both uncaught client errors and handled operational failure events.

**Step 2: Run focused verification**

Run: `npm test -- src/lib/telemetry.test.ts src/App.file-actions.test.tsx src/hooks/useProjectAutosave.test.tsx`
Expected: PASS

**Step 3: Run broader verification**

Run: `npm run build`
Expected: PASS
