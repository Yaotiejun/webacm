/**
 * Canonical npm commands for grip → shape_cam verification (CI / dev).
 */
export const MIGRATION_VERIFY_COMMANDS = Object.freeze({
  gate: 'npm run migration:verify',
  ci: 'npm run migration:ci',
  report: 'npm run migration:report',
  rasterBaseline: 'npm run check:raster-baseline',
  syncGripFixtures: 'npm run sync:grip-fixtures',
  syncAndVerify: 'npm run sync:verify',
  captureCamFixture: 'npm run capture:cam-fixture',
  e2eSmoke: 'npm run test:e2e:migration',
  e2eRasterBaseline: 'E2E_RASTER_BASELINE=1 npm run test:e2e:raster-baseline',
} as const)

export function formatMigrationVerifyChecklist(): string {
  return [
    'Migration verify checklist:',
    `  1. ${MIGRATION_VERIFY_COMMANDS.syncAndVerify}`,
    `  2. (or) ${MIGRATION_VERIFY_COMMANDS.syncGripFixtures} then ${MIGRATION_VERIFY_COMMANDS.gate}`,
    `  3. ${MIGRATION_VERIFY_COMMANDS.report}`,
    `  4. (optional) ${MIGRATION_VERIFY_COMMANDS.e2eSmoke}`,
  ].join('\n')
}
