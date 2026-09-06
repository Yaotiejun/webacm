/**
 * clip-apps VITE flags used during grip → shape_cam migration (dev/CI documentation).
 */
export const MIGRATION_VITE_FLAGS = Object.freeze({
  KIRI_LEGACY_CAM: 'VITE_KIRI_LEGACY_CAM',
  KIRI_LEGACY_FDM: 'VITE_KIRI_LEGACY_FDM',
  KIRI_LEGACY_SLICE_TIMEOUT_MS: 'VITE_KIRI_LEGACY_SLICE_TIMEOUT_MS',
  RASTER_GRIP_BRIDGE: 'VITE_RASTER_GRIP_BRIDGE',
} as const)

/** Optional Playwright env (not Vite). */
export const MIGRATION_E2E_FLAGS = Object.freeze({
  RASTER_BASELINE: 'E2E_RASTER_BASELINE',
} as const)

export const MIGRATION_DEV_RECOMMENDED = Object.freeze({
  [MIGRATION_VITE_FLAGS.KIRI_LEGACY_CAM]: '1',
  [MIGRATION_VITE_FLAGS.RASTER_GRIP_BRIDGE]: '1',
} as const)

export function formatMigrationEnvHint(): string {
  return Object.entries(MIGRATION_DEV_RECOMMENDED)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
}
