import type { RasterConfig, RasterMode, RasterRequest } from '@/types/raster'

/** Parameters from grip `raster-path-main/test-output/planar-baseline.json`. */
export const GRIP_RASTER_PLANAR_BASELINE: Readonly<RasterConfig> = {
  mode: 'planar',
  resolution: 0.05,
  rotationStep: 5,
  xStep: 1,
  yStep: 1,
  zFloor: -100,
  tracingStep: 1,
}

export const GRIP_RASTER_FAST_DEV: Readonly<RasterConfig> = {
  mode: 'planar',
  resolution: 0.5,
  rotationStep: 10,
  xStep: 5,
  yStep: 5,
  zFloor: -100,
  tracingStep: 1,
}

/** Parameters from grip `raster-path-main/test-output/radial-baseline.json`. */
export const GRIP_RASTER_RADIAL_BASELINE: Readonly<RasterConfig> = {
  mode: 'radial',
  resolution: 0.1,
  rotationStep: 1,
  xStep: 5,
  yStep: 5,
  zFloor: 0,
  tracingStep: 1,
  radialV3: false,
}

export function rasterConfigWithGripPreset(
  preset: Readonly<RasterConfig>,
  patch?: Partial<RasterConfig>,
): RasterConfig {
  return { ...preset, ...patch }
}

export function gripPresetLabel(mode: RasterMode): string {
  if (mode === 'planar') return 'grip planar baseline'
  if (mode === 'radial') return 'grip radial baseline (resolution 0.1, 1°)'
  return 'grip tracing'
}

/** Build a grip planar-baseline `RasterRequest` from loaded STL position buffers. */
export function buildGripPlanarBaselineRasterRequest(
  terrainTriangles: Float32Array,
  toolTriangles: Float32Array,
): RasterRequest {
  return {
    terrainTriangles,
    toolTriangles,
    config: rasterConfigWithGripPreset(GRIP_RASTER_PLANAR_BASELINE),
  }
}

export function buildGripRadialBaselineRasterRequest(
  terrainTriangles: Float32Array,
  toolTriangles: Float32Array,
): RasterRequest {
  return {
    terrainTriangles,
    toolTriangles,
    config: rasterConfigWithGripPreset(GRIP_RASTER_RADIAL_BASELINE),
  }
}
