// @vitest-environment jsdom

import { vi } from 'vitest'

const {
  reportHandledOperationTelemetryMock,
} = vi.hoisted(() => ({
  reportHandledOperationTelemetryMock: vi.fn(),
}))

vi.mock('../lib/telemetry', () => ({
  reportHandledOperationTelemetry: reportHandledOperationTelemetryMock,
}))

import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AUTOSAVE_STORAGE_KEY, AUTOSAVE_WRITE_DEBOUNCE_MS } from '../config/runtimeLimits'
import { clearAutosaveDraft, loadAutosaveDraft, persistAutosaveDraft } from '../lib/autosave'
import { createDefaultProject } from '../model/defaultProject'
import type { LpProject } from '../types/project'
import { useProjectAutosave } from './useProjectAutosave'

function AutosaveHarness() {
  const [project, setProject] = createSignal<LpProject>(createDefaultProject('Initial Project'))
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal('')

  useProjectAutosave({
    project,
    replaceProject(nextProject) {
      setProject(nextProject)
    },
    setStatus,
    setError,
  })

  return (
    <div>
      <div data-testid="project-name">{project().projectMeta.name}</div>
      <div data-testid="status-message">{status()}</div>
      <div data-testid="error-message">{error()}</div>
      <button
        type="button"
        onClick={() => {
          setProject((prev) => ({
            ...prev,
            projectMeta: {
              ...prev.projectMeta,
              name: 'Updated Project',
            },
          }))
        }}
      >
        Update Project
      </button>
    </div>
  )
}

describe('useProjectAutosave', () => {
  beforeEach(() => {
    window.localStorage.clear()
    reportHandledOperationTelemetryMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    clearAutosaveDraft()
    vi.useRealTimers()
  })

  it('restores a previously autosaved draft on mount', async () => {
    const restoredProject = createDefaultProject('Recovered Draft')
    restoredProject.elements.texts.push({
      id: 'text-1',
      position: { x: 100, y: 100 },
      text: 'Recovered note',
      color: 'green',
      layer: 'annotation',
    })
    expect(persistAutosaveDraft(restoredProject).status).toBe('saved')

    render(() => <AutosaveHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('project-name').textContent).toBe('Recovered Draft')
    })
    expect(screen.getByTestId('status-message').textContent).toMatch(/Recovered autosaved draft/)
    expect(screen.getByTestId('error-message').textContent).toBe('')
  })

  it('restores drafts containing class-aware connection symbols', async () => {
    const restoredProject = createDefaultProject('Recovered Connections')
    restoredProject.elements.symbols.push(
      {
        id: 'mechanical-1',
        symbolType: 'cable_to_cable_connection',
        position: { x: 120, y: 120 },
        color: 'blue',
        class: 'class1',
      },
      {
        id: 'ground-rod-1',
        symbolType: 'ground_rod',
        position: { x: 180, y: 160 },
        directionDeg: 180,
        color: 'red',
        class: 'class2',
      },
    )
    expect(persistAutosaveDraft(restoredProject).status).toBe('saved')

    render(() => <AutosaveHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('project-name').textContent).toBe('Recovered Connections')
    })
    expect(screen.getByTestId('status-message').textContent).toMatch(/Recovered autosaved draft/)
    expect(screen.getByTestId('error-message').textContent).toBe('')
  })

  it('reports telemetry when discarding an invalid autosave draft', async () => {
    window.localStorage.setItem(
      AUTOSAVE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-03-06T12:00:00.000Z',
        degraded: false,
        project: {
          schemaVersion: '1.9.0',
          pdf: {
            sourceType: 'embedded',
          },
        },
      }),
    )

    render(() => <AutosaveHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('error-message').textContent).toMatch(/Discarded invalid autosave draft\./)
    })

    expect(reportHandledOperationTelemetryMock).toHaveBeenCalledWith(
      'autosave_restore_discarded',
      expect.stringContaining('Discarded invalid autosave draft.'),
      expect.objectContaining({
        reason: 'validation-failed',
        degraded: false,
        storage_key_present: true,
        schema_version: '1.9.0',
      }),
    )
  })

  it('reports telemetry when autosave persistence hits a storage error', async () => {
    vi.useFakeTimers()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    render(() => <AutosaveHarness />)

    await fireEvent.click(screen.getByRole('button', { name: 'Update Project' }))
    vi.advanceTimersByTime(AUTOSAVE_WRITE_DEBOUNCE_MS + 20)

    expect(screen.getByTestId('error-message').textContent).toBe('Autosave failed due to a local storage error.')
    expect(reportHandledOperationTelemetryMock).toHaveBeenCalledWith(
      'autosave_persist_failed',
      'Autosave failed due to a local storage error.',
      expect.objectContaining({
        reason: 'error',
        schema_version: '1.9.0',
      }),
    )

    setItemSpy.mockRestore()
  })

  it('writes debounced autosave updates after project changes', async () => {
    vi.useFakeTimers()
    render(() => <AutosaveHarness />)

    await fireEvent.click(screen.getByRole('button', { name: 'Update Project' }))
    vi.advanceTimersByTime(AUTOSAVE_WRITE_DEBOUNCE_MS + 20)

    const loaded = loadAutosaveDraft()
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') {
      return
    }

    expect(loaded.envelope.project.projectMeta.name).toBe('Updated Project')
  })
})
