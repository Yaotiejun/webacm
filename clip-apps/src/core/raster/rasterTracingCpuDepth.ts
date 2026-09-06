/** CPU tracing collision (grip path-tracing / shape_cam `raster.worker` `sampleAt`). */
export interface RasterTerrainGrid {
  zGrid: Float32Array
  width: number
  height: number
}

export type RasterToolSample = { dx: number; dy: number; z: number }

export interface RasterTraceBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Max collision Z at world XY — same as worker tracing fallback when GPU trace fails.
 */
export function computeRasterTracingCollisionZ(
  wx: number,
  wy: number,
  terrain: RasterTerrainGrid,
  tool: readonly RasterToolSample[],
  bounds: RasterTraceBounds,
  stepX: number,
  stepY: number,
  zFloor: number,
): number {
  const gx = Math.round((wx - bounds.minX) / stepX)
  const gy = Math.round((wy - bounds.minY) / stepY)
  let maxCollision = zFloor
  for (const s of tool) {
    const tx = gx + s.dx
    const ty = gy + s.dy
    if (tx < 0 || ty < 0 || tx >= terrain.width || ty >= terrain.height) continue
    const terrainZ = terrain.zGrid[ty * terrain.width + tx] ?? zFloor
    const z = terrainZ - s.z
    if (z > maxCollision) maxCollision = z
  }
  return maxCollision
}

export function traceSampledPathCpuDepths(
  sampledXY: ReadonlyArray<readonly [number, number]>,
  terrain: RasterTerrainGrid,
  tool: readonly RasterToolSample[],
  bounds: RasterTraceBounds,
  stepX: number,
  stepY: number,
  zFloor: number,
): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = []
  for (const p of sampledXY) {
    out.push([p[0], p[1], computeRasterTracingCollisionZ(p[0], p[1], terrain, tool, bounds, stepX, stepY, zFloor)])
  }
  return out
}

/** Max |ΔZ| between CPU and GPU tracing outputs (parity gate). */
export function maxRasterTracingDepthDelta(
  cpu: ReadonlyArray<readonly [number, number, number]>,
  gpu: ReadonlyArray<readonly [number, number, number]>,
): number {
  const n = Math.min(cpu.length, gpu.length)
  let max = 0
  for (let i = 0; i < n; i += 1) {
    const dz = Math.abs((cpu[i]?.[2] ?? 0) - (gpu[i]?.[2] ?? 0))
    if (dz > max) max = dz
  }
  return max
}
