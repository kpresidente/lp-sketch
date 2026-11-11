import { createEffect, createSignal, onCleanup, onMount, type Accessor } from 'solid-js'
import {
  AUTOSAVE_STORAGE_KEY,
  AUTOSAVE_WRITE_DEBOUNCE_MS,
} from '../config/runtimeLimits'
import {
  clearAutosaveDraft,
  loadAutosaveDraft,
  persistAutosaveDraft,
} from '../lib/autosave'
import { projectElementCount, projectHasRecoverableContent } from '@lp-sketch/core/lib/projectLimits'
import { cloneProject } from '@lp-sketch/core/lib/projectState'
import { reportHandledOperationTelemetry } from '../lib/telemetry'
import { migrateProjectForLoad } from '@lp-sketch/core/model/migration'
import { asProject, validateProject } from '@lp-sketch/core/model/validation'
import type { LpProject } from '@lp-sketch/core/types/project'

interface UseProjectAutosaveOptions {
  project: Accessor<LpProject>
  replaceProject: (nextProject: LpProject, resetHistory?: boolean) => void
  setStatus: (message: string) => void
  setError: (message: string) => void
}

/** Why drafts are not being written. Present until a write succeeds again. */
export type AutosaveIssue = 'storage-unavailable' | 'too-large' | 'error'

const AUTOSAVE_ISSUE_MESSAGES: Record<AutosaveIssue, string> = {
  'storage-unavailable': 'Autosave unavailable: local draft storage is not accessible in this session.',
  'too-large': 'Autosave skipped: project is too large for local draft storage.',
  error: 'Autosave failed due to a local storage error.',
}

/** Short enough for the narrowest status area: shown for as long as the issue lasts. */
const AUTOSAVE_ISSUE_LABELS: Record<AutosaveIssue, string> = {
  'storage-unavailable': 'Autosave off: no draft storage',
  'too-large': 'Autosave off: project too large',
  error: 'Autosave off: storage error',
}

/** The one-time announcement made when an issue starts. */
export function autosaveIssueMessage(issue: AutosaveIssue | null): string {
  return issue ? AUTOSAVE_ISSUE_MESSAGES[issue] : ''
}

/** The standing reminder for an issue that is still present. */
export function autosaveIssueLabel(issue: AutosaveIssue | null): string {
  return issue ? AUTOSAVE_ISSUE_LABELS[issue] : ''
}

function savedAtLabel(savedAtIso: string): string {
  const parsed = new Date(savedAtIso)
  if (Number.isNaN(parsed.getTime())) {
    return 'unknown time'
  }

  return parsed.toLocaleString()
}

function hasStoredAutosaveDraft(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(AUTOSAVE_STORAGE_KEY) !== null
}

function autosaveProjectContext(project: LpProject) {
  return {
    schema_version: project.schemaVersion,
    element_count: projectElementCount(project),
  }
}

export function useProjectAutosave(options: UseProjectAutosaveOptions) {
  let persistTimer: number | null = null
  let canPersist = false
  let informedDegraded = false
  // The write health is one state, not a set of warned-once flags: consumers
  // can show it for as long as it lasts, and each change is announced once.
  const [autosaveIssue, setAutosaveIssue] = createSignal<AutosaveIssue | null>(null)

  function clearPersistTimer() {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  function persistSnapshot(snapshot: LpProject, notify: boolean) {
    const result = persistAutosaveDraft(snapshot)

    if (result.status === 'saved') {
      setAutosaveIssue(null)
      if (result.degraded && notify && !informedDegraded) {
        informedDegraded = true
        options.setStatus('Autosave active. Embedded PDF data is omitted when draft storage is full.')
      }
      if (!result.degraded) {
        informedDegraded = false
      }
      return
    }

    const issue: AutosaveIssue = result.status === 'skipped' ? result.reason : 'error'
    if (autosaveIssue() === issue) {
      return
    }

    setAutosaveIssue(issue)
    const message = AUTOSAVE_ISSUE_MESSAGES[issue]
    reportHandledOperationTelemetry('autosave_persist_failed', message, {
      reason: issue,
      ...autosaveProjectContext(snapshot),
    })
    if (notify) {
      options.setError(message)
    }
  }

  onMount(() => {
    const loaded = loadAutosaveDraft()

    if (loaded.status === 'ok') {
      try {
        const migration = migrateProjectForLoad(loaded.envelope.project)
        const validation = validateProject(migration.project)
        if (!validation.valid) {
          const details = validation.errors.slice(0, 2).join('; ')
          const message = `Discarded invalid autosave draft. ${details}`
          const storageKeyPresent = hasStoredAutosaveDraft()
          reportHandledOperationTelemetry('autosave_restore_discarded', message, {
            reason: 'validation-failed',
            degraded: loaded.envelope.degraded,
            storage_key_present: storageKeyPresent,
            schema_version:
              typeof (migration.project as { schemaVersion?: unknown }).schemaVersion === 'string'
                ? (migration.project as { schemaVersion: string }).schemaVersion
                : null,
          })
          clearAutosaveDraft()
          options.setError(message)
        } else {
          const draft = asProject(migration.project)
          if (projectHasRecoverableContent(draft)) {
            options.replaceProject(cloneProject(draft))
            const migratedSuffix = migration.migrated
              ? ` (migrated ${migration.fromVersion} -> ${migration.toVersion})`
              : ''
            const degradedSuffix = loaded.envelope.degraded
              ? ' Embedded PDF bytes were omitted due storage limits.'
              : ''
            options.setStatus(
              `Recovered autosaved draft from ${savedAtLabel(loaded.envelope.savedAt)}${migratedSuffix}.${degradedSuffix}`,
            )
          } else {
            reportHandledOperationTelemetry(
              'autosave_restore_discarded',
              'Discarded autosave draft with no recoverable content.',
              {
                reason: 'no-recoverable-content',
                degraded: loaded.envelope.degraded,
                storage_key_present: hasStoredAutosaveDraft(),
                ...autosaveProjectContext(draft),
              },
            )
            clearAutosaveDraft()
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Discarded unreadable autosave draft.'
        const storageKeyPresent = hasStoredAutosaveDraft()
        reportHandledOperationTelemetry('autosave_restore_discarded', message, {
          reason: 'unreadable',
          storage_key_present: storageKeyPresent,
        })
        clearAutosaveDraft()
        options.setError(message)
      }
    } else if (loaded.status === 'invalid') {
      const storageKeyPresent = hasStoredAutosaveDraft()
      reportHandledOperationTelemetry('autosave_restore_discarded', 'Discarded unreadable autosave draft.', {
        reason: 'invalid-payload',
        storage_key_present: storageKeyPresent,
      })
      clearAutosaveDraft()
      options.setError('Discarded unreadable autosave draft.')
    }

    canPersist = true

    const beforeUnloadListener = () => {
      persistSnapshot(options.project(), false)
    }
    window.addEventListener('beforeunload', beforeUnloadListener)
    onCleanup(() => {
      window.removeEventListener('beforeunload', beforeUnloadListener)
    })
  })

  createEffect(() => {
    const snapshot = cloneProject(options.project())
    if (!canPersist) {
      return
    }

    clearPersistTimer()
    persistTimer = window.setTimeout(() => {
      persistSnapshot(snapshot, true)
      persistTimer = null
    }, AUTOSAVE_WRITE_DEBOUNCE_MS)
  })

  onCleanup(() => {
    clearPersistTimer()
  })

  return { autosaveIssue }
}
