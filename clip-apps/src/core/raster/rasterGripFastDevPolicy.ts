import type { RasterConfig } from '@/types/raster'
import { GRIP_RASTER_FAST_DEV } from '@/core/raster/rasterGripPresets'

/** True when config matches the dev-only fast planar preset (not grip baseline checksum). */
export function isGripFastDevRasterConfig(config: RasterConfig): boolean {
  return (
    config.mode === GRIP_RASTER_FAST_DEV.mode &&
    config.resolution === GRIP_RASTER_FAST_DEV.resolution &&
    config.rotationStep === GRIP_RASTER_FAST_DEV.rotationStep &&
    config.xStep === GRIP_RASTER_FAST_DEV.xStep &&
    config.yStep === GRIP_RASTER_FAST_DEV.yStep
  )
}
