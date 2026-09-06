/**
 * carve-control `web/carvera.obj` preview (grip/carve-control-main).
 * File units are meters; grip scales vertices ×1000 to millimeters.
 * Materials follow grip `canvas.js` matcap colors (OBJ references `carvera.mtl` for tooling).
 */
import meshColorsJson from './carveraGripMeshColors.json'

export const CARVERA_OBJ_PUBLIC_URL = '/carvera/carvera.obj'

export { CARVERA_MTL_PUBLIC_URL } from './carveraMtlGenerator'

/** grip `canvas.js` `verts.map(v => v * 1000)` */
export const CARVERA_OBJ_METERS_TO_MM = 1000

/** grip `build_setup` WCS zero offsets from `corner` bbox min (mm, machine XYZ). */
export const CARVERA_OBJ_WCS_ZERO_OFFSET_MM = Object.freeze({
  dx: 15 + 360.495,
  dy: 15 + 234.765,
  dz: 30 + 100.436,
} as const)

function parseHexColor(hex: string): number {
  return parseInt(hex.replace(/^#/, ''), 16)
}

/** Submesh colors from grip `canvas.js` (hex). */
export const CARVERA_OBJ_MESH_COLORS: Record<string, number> = Object.freeze(
  Object.fromEntries(
    Object.entries(meshColorsJson).map(([name, hex]) => [name, parseHexColor(hex)]),
  ),
)

export function carveraMeshColorForName(name: string): number {
  if (CARVERA_OBJ_MESH_COLORS[name] != null) return CARVERA_OBJ_MESH_COLORS[name]!
  if (name.startsWith('tool-')) return parseHexColor(meshColorsJson['tool-0']!)
  return 0xcccccc
}
