/** Closed 20×20 mm rectangle (grip tracing regression path). */
export const RASTER_TRACING_GOLDEN_RECT: ReadonlyArray<readonly [number, number]> = Object.freeze([
  [0, 0],
  [20, 0],
  [20, 20],
  [0, 20],
  [0, 0],
])

/**
 * Pinned grip `samplePath` point counts (path-tracing.js) on {@link RASTER_TRACING_GOLDEN_RECT}.
 */
export const RASTER_TRACING_GRIP_SAMPLE_COUNTS = Object.freeze({
  step0_5: 161,
  step1: 81,
  step2: 41,
} as const)
