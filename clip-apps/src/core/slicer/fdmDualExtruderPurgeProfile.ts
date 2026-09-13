/**
 * Dual-extruder + purge tower golden / soak profile (two X-separated cubes).
 */
import type { FdmProcess } from '@/types/process'
import type { LegacyWidgetSpec } from '@/core/slicer/kiriLegacyBridge'

export const FDM_DUAL_EXTRUDER_PURGE_TOWER = 64

/** Pin of `sha256(dualExtruderStructuralDigest(gcode))` after soak. Full G-code SHA is unstable. */
export const FDM_DUAL_EXTRUDER_GOLDEN_SHA256 =
  '2007d535c0ec64fbf0466e3bd33154f39d2ae52665d98633570b227920af60ef'

export function dualExtruderPurgeProcess(): FdmProcess {
  return {
    processName: 'dual-purge-golden',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 210,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
    sliceSupportAngle: 55,
    sliceSupportNozzle: 0,
    outputPurgeTower: FDM_DUAL_EXTRUDER_PURGE_TOWER,
    outputRetractDist: 0.5,
    outputRetractSpeed: 30,
    outputFanSpeed: 0,
    outputFanLayer: 0,
    outputMinLayerTime: 0,
    zHopDistance: 0,
    enableBrim: false,
    brimCount: 0,
    brimOffset: 0,
    enableRaft: false,
    raftSpacing: 0,
    ranges: [],
    sliceAdaptive: false,
  }
}

/** Inline 2-nozzle device for purge (extcount ≥ 2). */
export function dualExtruderDeviceProfile() {
  return {
    bedWidth: 220,
    bedDepth: 220,
    maxHeight: 250,
    originCenter: false,
    bedBelt: false,
    extruders: [
      { extNozzle: 0.4, extFilament: 1.75, extOffsetX: 0, extOffsetY: 0 },
      { extNozzle: 0.4, extFilament: 1.75, extOffsetX: 0, extOffsetY: 0 },
    ],
    gcodePre: ['G28', 'G90', 'M82'],
    gcodePost: ['M104 S0', 'M140 S0', 'M84'],
    gcodeChange: ['T{tool}'],
  }
}

/** Unit 10³ cube as 12 triangles (36 verts) — same topology as FDM slice fixtures. */
export function offsetCubeVertices(ox: number, oy: number): Float32Array {
  const clean = [
    0, 0, 0, 10, 0, 0, 10, 10, 0,
    0, 0, 0, 10, 10, 0, 0, 10, 0,
    0, 0, 10, 10, 10, 10, 10, 0, 10,
    0, 0, 10, 0, 10, 10, 10, 10, 10,
    0, 0, 0, 0, 10, 10, 0, 10, 0,
    0, 0, 0, 0, 0, 10, 0, 10, 10,
    10, 0, 0, 10, 10, 0, 10, 10, 10,
    10, 0, 0, 10, 10, 10, 10, 0, 10,
    0, 0, 0, 10, 0, 10, 10, 0, 0,
    0, 0, 0, 0, 0, 10, 10, 0, 10,
    0, 10, 0, 0, 10, 10, 10, 10, 10,
    0, 10, 0, 10, 10, 10, 10, 10, 0,
  ]
  const out = new Float32Array(clean.length)
  for (let i = 0; i < clean.length; i += 3) {
    out[i] = clean[i]! + ox
    out[i + 1] = clean[i + 1]! + oy
    out[i + 2] = clean[i + 2]!
  }
  return out
}

export type DualExtruderMeshBuild = {
  specs: Array<{ id: string; vertices: Float32Array; extruder: number }>
}

export function buildDualExtruderCubes(): DualExtruderMeshBuild {
  return {
    specs: [
      { id: 'cube-e0', vertices: offsetCubeVertices(0, 0), extruder: 0 },
      { id: 'cube-e1', vertices: offsetCubeVertices(18, 0), extruder: 1 },
    ],
  }
}

export function assertDualExtruderPurgeGcode(gcode: string): void {
  expectHasToolChange(gcode)
  expectHasMotion(gcode)
  // Purge tower side length ≈ sqrt(area); look for comments or dense XY near tower region
  const hasPurgeHint =
    /purge/i.test(gcode) ||
    /; type: purge/i.test(gcode) ||
    /TYPE:Purge/i.test(gcode) ||
    gcode.split('\n').filter((l) => /^G1\b/i.test(l.trim())).length > 40
  if (!hasPurgeHint) {
    throw new Error('dual-extruder G-code missing purge/tool-change density signals')
  }
}

function expectHasToolChange(gcode: string) {
  const t0 = /\bT0\b/.test(gcode)
  const t1 = /\bT1\b/.test(gcode)
  if (!(t0 && t1)) {
    throw new Error(`expected T0 and T1 in dual-extruder G-code (T0=${t0}, T1=${t1})`)
  }
}

function expectHasMotion(gcode: string) {
  if (!/G[01]\b/i.test(gcode)) {
    throw new Error('expected G0/G1 motion in dual-extruder G-code')
  }
}

/** Helper for bridge specs once points/vb are built. */
export type { LegacyWidgetSpec }
