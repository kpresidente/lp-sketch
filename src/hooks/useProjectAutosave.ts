import { createEffect, onCleanup, onMount, type Accessor } from 'solid-js'
import {
  AUTOSAVE_WRITE_DEBOUNCE_MS,
} from '../config/runtimeLimits'
import {
  clearAutosaveDraft,
  loadAutosaveDraft,
  persistAutosaveDraft,
} from '../lib/autosave'
import { projectHasRecoverableContent } from '../lib/projectLimits'
import { cloneProject } from '../lib/projectState'
import { migrateProjectForLoad } from '../model/migration'
import { asProject, validateProject } from '../model/validation'
import type { LpProject } from '../types/project'

interface UseProjectAutosaveOptions {
  project: Accessor<LpProject>
  replaceProject: (nextProject: LpProject, resetHistory?: boolean) => void
  setStatus: (message: string) => void
  setError: (message: string) => void
}

function savedAtLabel(savedAtIso: string): string {
  const parsed = new Date(savedAtIso)
  if (Number.isNaN(parsed.getTime())) {
    return 'unknown time'
  }

  return parsed.toLocaleString()
}

export function useProjectAutosave(options: UseProjectAutosaveOptions) {
  let persistTimer: number | null = null
  let canPersist = false
  let warnedStorageUnavailable = false
  let warnedTooLarge = false
  let warnedPersistError = false
  let informedDegraded = false

  function clearPersistTimer() {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  function persistSnapshot(snapshot: LpProject, notify: boolean) {
    const result = persistAutosaveDraft(snapshot)

    if (result.status === 'saved') {
      warnedStorageUnavailable = false
      warnedTooLarge = false
      warnedPersistError = false
      if (result.degraded && notify && !informedDegraded) {
        informedDegraded = true
        options.setStatus('Autosave active. Embedded PDF data is omitted when draft storage is full.')
      }
      if (!result.degraded) {
        informedDegraded = false
      }
      return
    }

    if (result.status === 'skipped') {
      if (result.reason === 'storage-unavailable' && !warnedStorageUnavailable) {
        warnedStorageUnavailable = true
        if (notify) {
          options.setError('Autosave unavailable: local draft storage is not accessible in this session.')
        }
      }

      if (result.reason === 'too-large' && !warnedTooLarge) {
        warnedTooLarge = true
        if (notify) {
          options.setError('Autosave skipped: project is too large for local draft storage.')
        }
      }
      return
    }

    if (!warnedPersistError) {
      warnedPersistError = true
      if (notify) {
        options.setError('Autosave failed due to a local storage error.')
      }
    }
  }

  onMount(() => {
    const loaded = loadAutosaveDraft()

    if (loaded.status === 'ok') {
      try {
        const migration = migrateProjectForLoad(loaded.envelope.project)
        const validation = validateProject(migration.project)
        if (!validation.valid) {
          clearAutosaveDraft()
          const details = validation.errors.slice(0, 2).join('; ')
          options.setError(`Discarded invalid autosave draft. ${details}`)
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
            clearAutosaveDraft()
          }
        }
      } catch (error) {
        clearAutosaveDraft()
        const message = error instanceof Error ? error.message : 'Discarded unreadable autosave draft.'
        options.setError(message)
      }
    } else if (loaded.status === 'invalid') {
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
}

