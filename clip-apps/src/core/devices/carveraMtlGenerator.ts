import meshColorsJson from './carveraGripMeshColors.json'
import { CARVERA_GRIP_TRANSPARENT_MESH_NAMES, CARVERA_GRIP_TRANSPARENT_OPACITY } from './carveraGripPreviewMaterial'

export const CARVERA_MTL_PUBLIC_URL = '/carvera/carvera.mtl'

const MESH_COLORS_HEX: Record<string, string> = meshColorsJson

export function hexStringToKd(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '')
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function formatKd([r, g, b]: [number, number, number]): string {
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`
}

export function buildCarveraMtlDocument(
  colors: Record<string, string> = MESH_COLORS_HEX,
): string {
  const lines: string[] = ['# Generated from grip carve-control canvas.js mesh colors']
  for (const [name, hex] of Object.entries(colors)) {
    const kd = formatKd(hexStringToKd(hex))
    const transparent = CARVERA_GRIP_TRANSPARENT_MESH_NAMES.has(name)
    const d = transparent ? CARVERA_GRIP_TRANSPARENT_OPACITY : 1
    lines.push(`newmtl ${name}`, `Ka 0.2000 0.2000 0.2000`, `Kd ${kd}`, 'Ks 0.0000 0.0000 0.0000', `d ${d}`, '')
  }
  return `${lines.join('\n')}\n`
}
