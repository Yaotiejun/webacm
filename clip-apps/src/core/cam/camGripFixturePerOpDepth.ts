import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'
import { summarizeCamGcodeZDepth, type CamGcodeZDepthStats } from '@/core/cam/camGcodeDepthStats'

export interface CamGcodeOpDepthSlice {
  op: string
  depth: CamGcodeZDepthStats
}

/** Pinned Z span for `rough` op in `grip-cam-export-sample.gcode.txt`. */
export const GRIP_CAM_FIXTURE_ROUGH_OP_Z_DEPTH = Object.freeze({
  minZ: 2,
  maxZ: 10,
  explicitZLines: 4,
})

const START_OP = /;\s*starting\s+(\S+)\s+op/i
const END_OP = /;\s*ending\s+(\S+)\s+op/i

/** Split legacy export G-code on grip `; starting <name> op` / `; ending` markers. */
export function splitCamGcodeByOpMarkers(gcodeText: string): CamGcodeOpDepthSlice[] {
  const lines = gcodeText.split(/\r?\n/)
  const slices: CamGcodeOpDepthSlice[] = []
  let currentOp: string | null = null
  let chunk: string[] = []

  const flush = () => {
    if (!currentOp) return
    slices.push({
      op: currentOp,
      depth: summarizeCamGcodeZDepth(chunk.join('\n')),
    })
    chunk = []
  }

  for (const raw of lines) {
    const start = raw.trim().match(START_OP)
    if (start?.[1]) {
      flush()
      currentOp = start[1].toLowerCase()
      chunk = [raw]
      continue
    }
    if (currentOp && END_OP.test(raw.trim())) {
      chunk.push(raw)
      flush()
      currentOp = null
      continue
    }
    if (currentOp) chunk.push(raw)
  }
  flush()
  return slices
}

export function compareGripFixturePerOpDepth(
  gcodeText: string = gripFixtureGcode,
): { match: boolean; ops: CamGcodeOpDepthSlice[]; detail: string } {
  const ops = splitCamGcodeByOpMarkers(gcodeText)
  const rough = ops.find((o) => o.op === 'rough')
  const pin = GRIP_CAM_FIXTURE_ROUGH_OP_Z_DEPTH
  const roughOk =
    rough != null &&
    rough.depth.minZ === pin.minZ &&
    rough.depth.maxZ === pin.maxZ &&
    rough.depth.explicitZLines === pin.explicitZLines
  const match = ops.length >= 1 && roughOk
  const detail = rough
    ? `rough Z[${rough.depth.minZ},${rough.depth.maxZ}] lines=${rough.depth.explicitZLines}`
    : `ops=${ops.map((o) => o.op).join(',') || 'none'}`
  return { match, ops, detail }
}
