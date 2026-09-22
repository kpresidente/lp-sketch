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
