import type { RasterTerrainGrid, RasterTraceBounds } from '@/core/raster/rasterTracingCpuDepth'

function pointInTri2D(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const v0x = cx - ax
  const v0y = cy - ay
  const v1x = bx - ax
  const v1y = by - ay
  const v2x = px - ax
  const v2y = py - ay
  const dot00 = v0x * v0x + v0y * v0y
  const dot01 = v0x * v1x + v0y * v1y
  const dot02 = v0x * v2x + v0y * v2y
  const dot11 = v1x * v1x + v1y * v1y
  const dot12 = v1x * v2x + v1y * v2y
  const inv = dot00 * dot11 - dot01 * dot01
  if (Math.abs(inv) < 1e-12) return false
  const invDenom = 1 / inv
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6
}

function triZAtXY(
  px: number,
  py: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): number {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  if (Math.abs(nz) < 1e-12) return az
  return az - (nx * (px - ax) + ny * (py - ay)) / nz
}

/**
 * CPU height grid from STL mesh (grip worker fallback rasterize, XY max-Z per cell).
 */
export function rasterizeTerrainZGridFromTriangles(
  triangles: Float32Array,
  bounds: RasterTraceBounds,
  step: number,
  zFloor = -100,
): RasterTerrainGrid {
  const width = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / step))
  const height = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / step))
  const zGrid = new Float32Array(width * height)
  zGrid.fill(zFloor)
  const triCount = Math.floor(triangles.length / 9)
  for (let t = 0; t < triCount; t += 1) {
    const b = t * 9
    const ax = triangles[b] ?? 0
    const ay = triangles[b + 1] ?? 0
    const az = triangles[b + 2] ?? 0
    const bx = triangles[b + 3] ?? 0
    const by = triangles[b + 4] ?? 0
    const bz = triangles[b + 5] ?? 0
    const cx = triangles[b + 6] ?? 0
    const cy = triangles[b + 7] ?? 0
    const cz = triangles[b + 8] ?? 0
    const minX = Math.min(ax, bx, cx)
    const maxX = Math.max(ax, bx, cx)
    const minY = Math.min(ay, by, cy)
    const maxY = Math.max(ay, by, cy)
    const gx0 = Math.max(0, Math.floor((minX - bounds.minX) / step))
    const gx1 = Math.min(width - 1, Math.ceil((maxX - bounds.minX) / step))
    const gy0 = Math.max(0, Math.floor((minY - bounds.minY) / step))
    const gy1 = Math.min(height - 1, Math.ceil((maxY - bounds.minY) / step))
    for (let gy = gy0; gy <= gy1; gy += 1) {
      const wy = bounds.minY + gy * step
      for (let gx = gx0; gx <= gx1; gx += 1) {
        const wx = bounds.minX + gx * step
        if (!pointInTri2D(wx, wy, ax, ay, bx, by, cx, cy)) continue
        const z = triZAtXY(wx, wy, ax, ay, az, bx, by, bz, cx, cy, cz)
        const idx = gy * width + gx
        if (z > (zGrid[idx] ?? zFloor)) zGrid[idx] = z
      }
    }
  }
  return { zGrid, width, height }
}
