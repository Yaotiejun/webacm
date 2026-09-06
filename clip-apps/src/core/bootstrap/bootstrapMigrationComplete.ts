import { shouldTryLegacyFdm, resolveLegacyFdmMode } from '@/core/slicer/kiriRuntimePolicy'
import { MIGRATION_VITE_FLAGS } from '@/core/migration/migrationEnvManifest'

export interface BootstrapMigrationCompleteResult {
  ok: boolean
  checks: Record<string, boolean>
  errors: string[]
}

/** Migration gate: boot-time legacy preload policy flags. */
export function evaluateBootstrapMigrationComplete(): BootstrapMigrationCompleteResult {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  checks.legacyFdmPolicy =
    resolveLegacyFdmMode('auto') === 'auto' &&
    !shouldTryLegacyFdm('0') &&
    shouldTryLegacyFdm('auto')
  if (!checks.legacyFdmPolicy) errors.push('legacy FDM policy')

  checks.viteFlags =
    MIGRATION_VITE_FLAGS.KIRI_LEGACY_CAM.length > 0 &&
    MIGRATION_VITE_FLAGS.KIRI_LEGACY_FDM.length > 0 &&
    MIGRATION_VITE_FLAGS.RASTER_GRIP_BRIDGE.length > 0
  if (!checks.viteFlags) errors.push('migration vite flags manifest')

  return { ok: errors.length === 0, checks, errors }
}
