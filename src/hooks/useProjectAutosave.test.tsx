// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_WRITE_DEBOUNCE_MS } from '../config/runtimeLimits'
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
