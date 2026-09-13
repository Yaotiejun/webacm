/**
 * Shared Laser engine types.
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

/** Product backend: TypeScript port of Kiri LASER prepare/export. */
export type LaserBackendKind = 'kiri-ts' | 'laser-worker'

export type LaserEngineProcess = {
  feedrate?: number
  seekrate?: number
  power?: number
  kerf?: number
  passes?: number
  /** Kiri ctOutTileSpacing */
  nestGap?: number
  /** Kiri ctOutGroup */
  grouped?: boolean
  /** Run Layout pack (default true). */
  layoutPack?: boolean
  /** Kiri-like origin (default center; image engrave uses preserve). */
  origin?: 'preserve' | 'center' | 'bounds' | 'bed'
  /**
   * Bitmap scanline engrave: preserve coords, O(n log n) row order + zigzag.
   * Skips O(n^2) nearest-neighbor (would hang on thousands of segments).
   */
  engraveScan?: boolean
}

export type LaserEngineResult = {
  polylines: LaserPolyline[]
  gcodeText: string
  svgText: string
  deviceId: string
  fileExt: string
  backend: LaserBackendKind
}
