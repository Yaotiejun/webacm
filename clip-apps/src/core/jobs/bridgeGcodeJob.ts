import type { CarveraJobRecord, GridBotJobRecord } from '@/api/jobs'

export type BridgeGcodeMode = 'CAM' | 'RASTER' | 'FDM'

export interface BridgeGcodeJobInput {
  mode: BridgeGcodeMode
  gcodeText: string
  namePrefix: string
  device?: string | null
  process?: string | null
  material?: string | null
  traceCommentLines?: string[]
}

export function buildBridgeGcodeJobName(prefix: string): string {
  const ts = new Date()
  const tsName = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(
    ts.getHours(),
  ).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`
  return `${prefix}-${tsName}.gcode`
}

export function formatBridgeGcodeContent(input: BridgeGcodeJobInput): { name: string; content: string } {
  const name = buildBridgeGcodeJobName(input.namePrefix)
  const lines = input.gcodeText.split(/\r?\n/)
  for (const trace of input.traceCommentLines ?? []) {
    lines.unshift(trace)
  }
  lines.unshift(`; material=${input.material ?? '—'}`)
  lines.unshift(`; process=${input.process ?? '—'}`)
  lines.unshift(`; device=${input.device ?? '—'}`)
  lines.unshift(`; job=${name}`)
  lines.unshift(`; mode=${input.mode}`)
  lines.unshift(`; from workspace (bridge)`)
  return { name, content: lines.join('\n') }
}

export function createCarveraJobFromBridgeGcode(input: BridgeGcodeJobInput, now = Date.now()): CarveraJobRecord {
  const { name, content } = formatBridgeGcodeContent(input)
  return {
    id: `${input.namePrefix}-carvera-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    size: content.length,
    content,
  }
}

export function createGridBotJobFromBridgeGcode(input: BridgeGcodeJobInput, now = Date.now()): GridBotJobRecord {
  const { name, content } = formatBridgeGcodeContent(input)
  return {
    id: `${input.namePrefix}-gridbot-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    content,
  }
}
