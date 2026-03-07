import { describe, expect, it } from 'vitest'
import { workspaceCanvasSpikeEnabled } from './workspaceRenderer'

describe('workspaceCanvasSpikeEnabled', () => {
  it('enables the spike only for developer mode with the explicit flag', () => {
    expect(
      workspaceCanvasSpikeEnabled({
        DEV: true,
        VITE_WORKSPACE_CANVAS_SPIKE: 'true',
      }),
    ).toBe(true)

    expect(
      workspaceCanvasSpikeEnabled({
        DEV: false,
        VITE_WORKSPACE_CANVAS_SPIKE: 'true',
      }),
    ).toBe(false)

    expect(
      workspaceCanvasSpikeEnabled({
        DEV: true,
        VITE_WORKSPACE_CANVAS_SPIKE: 'false',
      }),
    ).toBe(false)
  })
})
