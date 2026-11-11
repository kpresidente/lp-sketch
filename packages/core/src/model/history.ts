import type { LpProject } from '../types/project'

export interface ProjectHistoryState {
  past: LpProject[]
  future: LpProject[]
}

export interface HistoryTransition {
  history: ProjectHistoryState
  project: LpProject
}

export function pushHistorySnapshot(
  history: ProjectHistoryState,
  snapshot: LpProject,
  maxHistory: number,
): ProjectHistoryState {
  const past = [...history.past, snapshot]
  if (past.length > maxHistory) {
    past.splice(0, past.length - maxHistory)
  }

  return {
    past,
    future: [],
  }
}

/**
 * History rewinds document content, not the camera. The restored project keeps
 * the page it was captured on, and takes the latest zoom and pan known for
 * every page from the project it replaces.
 */
export function keepLiveCamera(restored: LpProject, live: LpProject): LpProject {
  const byPage = {
    ...restored.view.byPage,
    ...live.view.byPage,
    [live.view.currentPage]: { zoom: live.view.zoom, pan: live.view.pan },
  }
  const camera = byPage[restored.view.currentPage] ?? {
    zoom: restored.view.zoom,
    pan: restored.view.pan,
  }

  return {
    ...restored,
    view: {
      ...restored.view,
      zoom: camera.zoom,
      pan: camera.pan,
      byPage,
    },
  }
}

export function applyUndo(
  history: ProjectHistoryState,
  currentProject: LpProject,
  maxHistory: number,
): HistoryTransition | null {
  if (history.past.length === 0) {
    return null
  }

  const previous = history.past[history.past.length - 1]

  return {
    project: previous,
    history: {
      past: history.past.slice(0, -1),
      future: [currentProject, ...history.future].slice(0, maxHistory),
    },
  }
}

export function applyRedo(
  history: ProjectHistoryState,
  currentProject: LpProject,
  maxHistory: number,
): HistoryTransition | null {
  if (history.future.length === 0) {
    return null
  }

  const next = history.future[0]

  return {
    project: next,
    history: {
      past: [...history.past, currentProject].slice(-maxHistory),
      future: history.future.slice(1),
    },
  }
}
