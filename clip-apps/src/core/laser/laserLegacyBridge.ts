/**
 * Product path: TypeScript port of Kiri LASER (laserEngine kiri-ts).
 * Legacy JS init-work remains for import-smoke / optional widget experiments only.
 */
export { LASER_MODE_TYPE as TYPE, runLaserFromDxf, runLaserFromSvg } from '@/core/laser/laserEngine'
export const LASER_LEGACY_WORKER = 'src/core/laser/legacy/init-work.js'
/** Jobs use submitLaserJob; engine is kiri-ts (no legacy prepare runtime). */
export const LASER_BACKEND = 'kiri-ts' as const