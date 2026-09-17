function parseEnabledFlag(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw
  }
  if (typeof raw !== 'string') {
    return false
  }

  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function workspaceCanvasSpikeEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  const devMode = env.DEV === true || env.DEV === 'true'
  return devMode && parseEnabledFlag(env.VITE_WORKSPACE_CANVAS_SPIKE)
}
