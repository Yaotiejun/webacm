import type { FdmProcess } from '@/types/process'
import type { VertexBounds3D } from '@/core/slicer/geometry'

/** grip-style device profile minimum for `fdm_slice` (needs `device.extruders[]`). */
export function buildLegacyFdmDeviceProfile(
  process: FdmProcess,
  override?: Record<string, unknown> | null,
): Record<string, unknown> {
  const nozzle = Number(process.sliceLineWidth) > 0 ? Number(process.sliceLineWidth) : 0.4
  const base = {
    bedWidth: 200,
    bedDepth: 200,
    maxHeight: 200,
    originCenter: false,
    bedBelt: false,
    extruders: [
      {
        extNozzle: nozzle,
        extFilament: 1.75,
      },
    ],
    gcodePre: ['G28', 'G90', 'M82'],
    gcodePost: ['M104 S0', 'M140 S0', 'M84'],
  }
  if (!override) return base
  const extruders = Array.isArray(override.extruders) && override.extruders.length > 0
    ? override.extruders
    : base.extruders
  return { ...base, ...override, extruders }
}

/** grip-style controller flags used at start of `fdm_slice`. */
export function buildLegacyFdmControllerProfile(
  override?: Record<string, unknown> | null,
): Record<string, unknown> {
  const base = {
    gcode: {},
    devel: false,
    assembly: false,
    threaded: false,
    healMesh: true,
    lineType: 'path',
  }
  return override ? { ...base, ...override } : base
}

/** `widget.getBoundingBox()` shape expected by legacy FDM (`bounds.min.z`, `bounds.max.z`). */
export function buildLegacyWidgetBoundingBox(vb: VertexBounds3D) {
  const min = { x: vb.minX, y: vb.minY, z: vb.minZ }
  const max = { x: vb.maxX, y: vb.maxY, z: vb.maxZ }
  return {
    min,
    max,
    minx: vb.minX,
    miny: vb.minY,
    minz: vb.minZ,
    maxx: vb.maxX,
    maxy: vb.maxY,
    maxz: vb.maxZ,
    clone() {
      return buildLegacyWidgetBoundingBox(vb)
    },
  }
}
