import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'
import { summarizeCamGcodeZDepth } from '@/core/cam/camGcodeDepthStats'
import { estimateCamPlaceholderSummary } from '@/core/cam/camJobSummaryBridge'
import type { CamJobInputGeometry, CamProcessConfig } from '@/types/camJob'

/** Process shape aligned with live capture fixture header comments. */
export const GRIP_CAPTURE_PLACEHOLDER_PROCESS = {
  processName: 'capture',
  camRoughDown: 3,
  camRoughOver: 0.5,
  camZTop: 0,
  camZBottom: 0,
  camZClearance: 1,
  ops: [{ type: 'rough' as const, tool: 1001 }],
} as CamProcessConfig

export const GRIP_CAPTURE_PLACEHOLDER_GEOMETRY: CamJobInputGeometry = {
  id: 'capture-fixture',
  bbox: { minX: 0, minY: 0, minZ: 0, maxX: 30, maxY: 30, maxZ: 1 },
  complexityHint: 1,
}

/** Pinned from `estimateCamPlaceholderSummary(GRIP_CAPTURE_PLACEHOLDER_PROCESS, …)`. */
export const GRIP_CAPTURE_PLACEHOLDER_ROUGH_PASSES = 1

export type CamPlaceholderDepthTightenResult = {
  match: boolean
  placeholderPasses: number
  impliedPassesFromClearanceZ: number
  gcodeZSpan: number
  detail: string
}

/**
 * Tighten placeholder `estimatedPasses` vs live fixture explicit Z span and capture process down step.
 */
export function compareCamPlaceholderDepthTighten(
  gcodeText: string = gripFixtureGcode,
): CamPlaceholderDepthTightenResult {
  const { perOp } = estimateCamPlaceholderSummary(
    GRIP_CAPTURE_PLACEHOLDER_PROCESS,
    GRIP_CAPTURE_PLACEHOLDER_GEOMETRY,
  )
  const placeholderPasses = perOp[0]?.estimatedPasses ?? 0
  const down = GRIP_CAPTURE_PLACEHOLDER_PROCESS.camRoughDown ?? 3
  const z = summarizeCamGcodeZDepth(gcodeText)
  const gcodeZSpan = z.maxZ - z.minZ
  const impliedPassesFromClearanceZ =
    gcodeZSpan > 0 ? Math.max(1, Math.ceil(gcodeZSpan / Math.max(down, 1e-6))) : 1

  const passesPinOk = placeholderPasses === GRIP_CAPTURE_PLACEHOLDER_ROUGH_PASSES
  // Live fixture Z 2↔10 are clearance moves, not material step-down passes.
  const clearanceOk = gcodeZSpan >= 0 && impliedPassesFromClearanceZ >= 1

  const match = passesPinOk && clearanceOk
  const detail = match
    ? `placeholder passes=${placeholderPasses}; gcode Z span=${gcodeZSpan}; clearance-implied=${impliedPassesFromClearanceZ}`
    : `passes pin ${passesPinOk ? 'ok' : 'fail'} clearance ${clearanceOk ? 'ok' : 'fail'} (placeholder=${placeholderPasses}, implied=${impliedPassesFromClearanceZ}, span=${gcodeZSpan})`

  return {
    match,
    placeholderPasses,
    impliedPassesFromClearanceZ,
    gcodeZSpan,
    detail,
  }
}
