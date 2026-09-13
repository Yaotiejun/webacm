import { evaluateCamLiveExportMigration } from '@/core/cam/camLiveExportMigration'
import { evaluateDeviceProductionSoakMigration } from '@/core/devices/deviceProductionSoakMigration'
import { evaluateFdmLegacyMigrationComplete } from '@/core/slicer/fdmLegacyMigrationComplete'
import { evaluateRasterE2eMigrationComplete } from '@/core/raster/rasterE2eMigrationComplete'
import { evaluateLaserSoakMigrationComplete } from '@/core/laser/laserSoakMigrationComplete'
import { evaluateSlaSoakMigrationComplete } from '@/core/sla/slaSoakMigrationComplete'

export interface MigrationOrderedPhaseResult {
  id: 'cam-live' | 'device-soak' | 'fdm-legacy' | 'raster-e2e' | 'laser-soak' | 'sla-soak'
  ok: boolean
  detail: string
  errors: string[]
}

export interface MigrationOrderedPipelineReport {
  phases: MigrationOrderedPhaseResult[]
  allOk: boolean
}

/** Runs migration phases 1→6 (offline checks; live steps need env + npm scripts). */
export async function evaluateMigrationOrderedPipeline(): Promise<MigrationOrderedPipelineReport> {
  const cam = await evaluateCamLiveExportMigration()
  const devices = await evaluateDeviceProductionSoakMigration()
  const fdm = await evaluateFdmLegacyMigrationComplete()
  const raster = evaluateRasterE2eMigrationComplete()
  const rasterOk =
    raster.ok ||
    raster.errors.every(
      (e) => e.includes('sync:grip-fixtures') || e.includes('grip-raster-fixtures'),
    )
  const laser = evaluateLaserSoakMigrationComplete()
  const sla = await evaluateSlaSoakMigrationComplete()

  const phases: MigrationOrderedPhaseResult[] = [
    {
      id: 'cam-live',
      ok: cam.ok,
      detail: `${cam.phase}: ${cam.detail}`,
      errors: cam.errors,
    },
    {
      id: 'device-soak',
      ok: devices.ok,
      detail: `carvera=${devices.carvera.phase} gridbot=${devices.gridbot.phase}`,
      errors: devices.errors,
    },
    {
      id: 'fdm-legacy',
      ok: fdm.ok,
      detail: `shell=${fdm.checks.shellGate} bundlePin=${fdm.checks.bundlePin}; live: npm run soak:fdm:live`,
      errors: fdm.errors,
    },
    {
      id: 'raster-e2e',
      ok: rasterOk,
      detail: raster.ok ? raster.e2eHint : `${raster.e2eHint} (fixtures optional offline)`,
      errors: rasterOk ? [] : raster.errors,
    },
    {
      id: 'laser-soak',
      ok: laser.ok,
      detail: laser.soakHint,
      errors: laser.errors,
    },
    {
      id: 'sla-soak',
      ok: sla.ok,
      detail: sla.soakHint,
      errors: sla.errors,
    },
  ]

  return {
    phases,
    allOk: phases.every((p) => p.ok),
  }
}
