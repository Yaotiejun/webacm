/** Flat 2×2 terrain grid (z=0) for collision golden. */
export const RASTER_TRACING_FLAT_TERRAIN = Object.freeze({
  zGrid: new Float32Array([0, 0, 0, 0]),
  width: 2,
  height: 2,
})

export const RASTER_TRACING_FLAT_BOUNDS = Object.freeze({
  minX: 0,
  minY: 0,
  maxX: 2,
  maxY: 2,
})

/** Single centered tool sample (worker rasterizeToolMin convention). */
export const RASTER_TRACING_UNIT_TOOL: ReadonlyArray<{ dx: number; dy: number; z: number }> = Object.freeze([
  { dx: 0, dy: 0, z: 0 },
])

/**
 * Pinned CPU collision Z at (1,1) on flat terrain with zFloor=-100.
 * Grip rect path first point (0,0) on same setup.
 */
export const RASTER_TRACING_CPU_DEPTH_GOLDEN = Object.freeze({
  flatCenterZ: 0,
  rectOriginZ: 0,
})
