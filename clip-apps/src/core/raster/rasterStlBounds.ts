import type { RasterTraceBounds } from '@/core/raster/rasterTracingCpuDepth'

/** Axis-aligned bounds from STL triangle soup (9 floats per triangle). */
export function calcBoundsFromStlTriangles(triangles: Float32Array): RasterTraceBounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < triangles.length; i += 3) {
    const x = triangles[i] ?? 0
    const y = triangles[i + 1] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  return { minX, minY, maxX, maxY }
}
