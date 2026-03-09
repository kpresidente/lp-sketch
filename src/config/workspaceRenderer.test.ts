import { describe, expect, it } from 'vitest'
import { workspaceCanvasSpikeEnabled } from './workspaceRenderer'

describe('workspaceCanvasSpikeEnabled', () => {
  it('enables the spike whenever the explicit env flag is set', () => {
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
    ).toBe(true)

    expect(
      workspaceCanvasSpikeEnabled({
        DEV: true,
        VITE_WORKSPACE_CANVAS_SPIKE: 'false',
      }),
    ).toBe(false)
  })
})
