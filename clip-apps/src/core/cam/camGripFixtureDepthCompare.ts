import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'
import { collectCamExportSectionDepthStats } from '@/core/cam/camGcodeDepthStats'
import { estimateCamPlaceholderSummary } from '@/core/cam/camJobSummaryBridge'
import type { CamJobInputGeometry, CamProcessConfig } from '@/types/camJob'

/** Pinned from live `grip-cam-export-sample.gcode.txt` explicit Z moves. */
export const GRIP_CAM_FIXTURE_Z_DEPTH = Object.freeze({
  minZ: 2,
  maxZ: 10,
  explicitZLines: 4,
})

export type CamPerOpDepthCompareResult = {
  match: boolean
  gcode: { minZ: number; maxZ: number }
  placeholderPasses: number
  impliedPassesFromZ: number
  detail: string
}

function makeCaptureGeometry(): CamJobInputGeometry {
  return {
    id: 'depth-fixture',
    bbox: { minX: 0, minY: 0, minZ: 0, maxX: 30, maxY: 30, maxZ: 1 },
    complexityHint: 1,
  }
}

export function compareCamPerOpDepthToGripCapture(
  gcodeText: string = gripFixtureGcode,
): CamPerOpDepthCompareResult {
  const { minZ, maxZ, explicitZLines } = (() => {
    let min = Infinity
    let max = -Infinity
    let lines = 0
    for (const raw of gcodeText.split(/\r?\n/)) {
      const m = raw.match(/\bZ(-?\d+(?:\.\d+)?)/gi)
      if (!m) continue
      lines += 1
      for (const tok of m) {
        const z = Number(tok.slice(1))
        if (!Number.isFinite(z)) continue
        if (z < min) min = z
        if (z > max) max = z
      }
    }
    return {
      minZ: Number.isFinite(min) ? min : 0,
      maxZ: Number.isFinite(max) ? max : 0,
      explicitZLines: lines,
    }
  })()

  const process = {
    processName: 'capture',
    camRoughDown: 3,
    camZTop: 0,
    camZBottom: 0,
    ops: [{ type: 'rough' as const, tool: 1001 }],
  } as CamProcessConfig

  const { perOp } = estimateCamPlaceholderSummary(process, makeCaptureGeometry())
  const placeholderPasses = perOp[0]?.estimatedPasses ?? 0
  const down = 3
  const impliedPassesFromZ = explicitZLines >= 2 && maxZ > minZ ? Math.max(1, Math.ceil((maxZ - minZ) / down)) : 1

  const zPinOk =
    minZ === GRIP_CAM_FIXTURE_Z_DEPTH.minZ &&
    maxZ === GRIP_CAM_FIXTURE_Z_DEPTH.maxZ &&
    explicitZLines === GRIP_CAM_FIXTURE_Z_DEPTH.explicitZLines

  const passesOk = placeholderPasses >= 1 && impliedPassesFromZ >= 1

  const match = zPinOk && passesOk
  const detail = match
    ? `Z[${minZ},${maxZ}] lines=${explicitZLines}; placeholder passes=${placeholderPasses}`
    : `Z pin ${zPinOk ? 'ok' : 'fail'} passes ${passesOk ? 'ok' : 'fail'} (placeholder=${placeholderPasses}, implied=${impliedPassesFromZ})`

  return {
    match,
    gcode: { minZ, maxZ },
    placeholderPasses,
    impliedPassesFromZ,
    detail,
  }
}

export function compareSyntheticOpSectionDepth(): {
  match: boolean
  opDepth: { minZ: number; maxZ: number }
} {
  const { depths } = collectCamExportSectionDepthStats((_print, online) => {
    online({ section: 'header' })
    online('G21\r\n')
    online({ section: 'op-0-rough' })
    online('G0 Z5\r\nG1 X1 Y1 Z-1 F500\r\nG1 Z2\r\n')
    online({ section: 'footer' })
    online('M5\r\n')
  })
  const op = depths.find((d) => d.section === 'op-0-rough')
  const match = op != null && op.minZ === -1 && op.maxZ === 5 && op.explicitZLines === 3
  return {
    match,
    opDepth: { minZ: op?.minZ ?? 0, maxZ: op?.maxZ ?? 0 },
  }
}
