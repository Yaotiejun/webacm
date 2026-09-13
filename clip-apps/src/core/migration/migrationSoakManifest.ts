/** npm scripts for migration soak / gates (keep in sync with package.json). */
export const MIGRATION_SOAK_SCRIPTS = Object.freeze({
  offline: 'soak:offline',
  ordered: 'migration:ordered-soak',
  gates: 'migration:gates',
  texturizer: 'soak:texturizer',
  texturizerLive: 'soak:texturizer:live',
  carvera: 'soak:carvera',
  gridbot: 'soak:gridbot',
  camLive: 'soak:cam:live',
  rasterE2e: 'test:e2e:raster-baseline',
  fdmLive: 'soak:fdm:live',
  deviceBridgeMock: 'soak:device-bridge:mock',
  laser: 'soak:laser',
  sla: 'soak:sla',
} as const)

/** Env flags for `migration:ordered-soak` live phases. */
export const MIGRATION_ORDERED_ENV = Object.freeze({
  CAM_LIVE: 'CAM_LIVE_MIGRATION',
  DEVICE_SOAK: 'DEVICE_PRODUCTION_SOAK',
  FDM_LIVE: 'FDM_LIVE_MIGRATION',
  RASTER_E2E: 'E2E_RASTER_BASELINE',
  DEVICE_BRIDGE_MOCK: 'DEVICE_BRIDGE_MOCK_SOAK',
} as const)

export const MIGRATION_CI_SCRIPTS = Object.freeze({
  verify: 'migration:verify',
  ci: 'migration:ci',
  report: 'migration:report',
  testMigration: 'test:migration',
} as const)
