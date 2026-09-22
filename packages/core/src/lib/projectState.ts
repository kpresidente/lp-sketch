import type { LpProject } from '../types/project'

export function cloneProject(project: LpProject): LpProject {
  return structuredClone(project)
}
