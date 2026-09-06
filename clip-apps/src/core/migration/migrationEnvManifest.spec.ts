import { describe, expect, it } from 'vitest'
import { MIGRATION_E2E_FLAGS, MIGRATION_VITE_FLAGS } from './migrationEnvManifest'

describe('migrationEnvManifest', () => {
  it('documents vite and e2e flags', () => {
    expect(MIGRATION_VITE_FLAGS.RASTER_GRIP_BRIDGE).toBe('VITE_RASTER_GRIP_BRIDGE')
    expect(MIGRATION_E2E_FLAGS.RASTER_BASELINE).toBe('E2E_RASTER_BASELINE')
  })
})
