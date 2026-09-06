import { GRIP_CAM_FIXTURE_MIGRATION_SHA256 } from '@/core/cam/camGripFixtureMeta'
import { buildGripCamFixtureSyntheticGcode } from '@/core/cam/camGripFixtureSynthetic'

/** One-line hint for devtools / copy-feedback when updating the migration fixture. */
export function buildCamGripFixtureDevHint(): string {
  const lines = buildGripCamFixtureSyntheticGcode().split('\n').length
  return [
    `CAM fixture SHA-256: ${GRIP_CAM_FIXTURE_MIGRATION_SHA256} (${lines} lines, grip-shaped synthetic)`,
    'Live capture: npm run capture:cam-fixture (vitest.capture.ts; needs manifold.wasm under shape_cam/wasm)',
  ].join('\n')
}
