import { describe, expect, it } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { keepLiveCamera } from './history'

function projectOnPage(page: number, zoom: number, pan: { x: number; y: number }) {
  const project = createDefaultProject('History')
  project.view = {
    ...project.view,
    currentPage: page,
    zoom,
    pan,
    byPage: { [page]: { zoom, pan } },
  }
  return project
}

describe('keepLiveCamera', () => {
  it('keeps the live zoom and pan when the restored snapshot is on the same page', () => {
    const restored = projectOnPage(1, 1, { x: 24, y: 24 })
    const live = projectOnPage(1, 2.5, { x: -120, y: 40 })

    const result = keepLiveCamera(restored, live)

    expect(result.view.currentPage).toBe(1)
    expect(result.view.zoom).toBe(2.5)
    expect(result.view.pan).toEqual({ x: -120, y: 40 })
    expect(result.view.byPage[1]).toEqual({ zoom: 2.5, pan: { x: -120, y: 40 } })
  })

  it('returns to the snapshot page with the latest camera known for that page', () => {
    const restored = projectOnPage(1, 1, { x: 24, y: 24 })
    const live = projectOnPage(2, 3, { x: 5, y: 6 })
    live.view.byPage[1] = { zoom: 1.75, pan: { x: 10, y: 20 } }

    const result = keepLiveCamera(restored, live)

    expect(result.view.currentPage).toBe(1)
    expect(result.view.zoom).toBe(1.75)
    expect(result.view.pan).toEqual({ x: 10, y: 20 })
    // The page being left keeps its camera for the next visit.
    expect(result.view.byPage[2]).toEqual({ zoom: 3, pan: { x: 5, y: 6 } })
  })

  it('falls back to the snapshot camera for a page the live project never recorded', () => {
    const restored = projectOnPage(3, 1.25, { x: 7, y: 8 })
    const live = projectOnPage(1, 2, { x: 0, y: 0 })

    const result = keepLiveCamera(restored, live)

    expect(result.view.currentPage).toBe(3)
    expect(result.view.zoom).toBe(1.25)
    expect(result.view.pan).toEqual({ x: 7, y: 8 })
  })

  it('leaves both inputs untouched', () => {
    const restored = projectOnPage(1, 1, { x: 24, y: 24 })
    const live = projectOnPage(1, 2, { x: 1, y: 2 })
    const restoredBefore = JSON.stringify(restored)
    const liveBefore = JSON.stringify(live)

    keepLiveCamera(restored, live)

    expect(JSON.stringify(restored)).toBe(restoredBefore)
    expect(JSON.stringify(live)).toBe(liveBefore)
  })
})
