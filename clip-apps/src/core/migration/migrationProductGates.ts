import { evaluateCamMigrationComplete } from '@/core/cam/camMigrationComplete'
import { evaluateCarveraMigrationComplete } from '@/core/devices/carveraMigrationComplete'
import { evaluateGridbotMigrationComplete } from '@/core/devices/gridbotMigrationComplete'
import { evaluateRasterMigrationComplete } from '@/core/raster/rasterMigrationComplete'
import { evaluateTexturizerMigrationComplete } from '@/core/texturizer/texturizerMigrationComplete'
import { evaluateBackendMigrationComplete } from '@/core/migration/backendMigrationComplete'
import { evaluateOtherMigrationComplete } from '@/core/migration/otherMigrationComplete'
import { evaluateFdmMigrationComplete } from '@/core/slicer/fdmMigrationComplete'
import { evaluateDeviceBridgeMigrationComplete } from '@/core/migration/deviceBridgeMigrationComplete'
import { evaluateBootstrapMigrationComplete } from '@/core/bootstrap/bootstrapMigrationComplete'
import { computeMigrationProgressTotals } from '@/core/migration/migrationProgressScoreboard'

export interface MigrationProductGateRow {
  id: string
  ok: boolean
  errors: string[]
}

export interface MigrationProductGatesReport {
  scoreboard: ReturnType<typeof computeMigrationProgressTotals>
  gates: MigrationProductGateRow[]
  /** FDM workspace shell (not in grip scoreboard weights). */
  fdm: { ok: boolean; errors: string[] }
  deviceBridge: { ok: boolean; errors: string[] }
  bootstrap: { ok: boolean; errors: string[] }
  allOk: boolean
}

/** Offline product-path gates (used by soak:offline and CI summaries). */
export async function evaluateMigrationProductGates(): Promise<MigrationProductGatesReport> {
  const [cam, texturizer] = await Promise.all([
    evaluateCamMigrationComplete(),
    evaluateTexturizerMigrationComplete(),
  ])
  const raster = evaluateRasterMigrationComplete()
  const carvera = evaluateCarveraMigrationComplete()
  const gridbot = evaluateGridbotMigrationComplete()
  const backend = evaluateBackendMigrationComplete()
  const other = evaluateOtherMigrationComplete()
  const fdm = evaluateFdmMigrationComplete()
  const deviceBridge = evaluateDeviceBridgeMigrationComplete()
  const bootstrap = evaluateBootstrapMigrationComplete()

  const gates: MigrationProductGateRow[] = [
    { id: 'texturizer', ok: texturizer.ok, errors: texturizer.errors },
    { id: 'raster', ok: raster.ok, errors: raster.errors },
    { id: 'cam', ok: cam.ok, errors: cam.errors },
    { id: 'carvera', ok: carvera.ok, errors: carvera.errors },
    { id: 'gridbot', ok: gridbot.ok, errors: gridbot.errors },
    { id: 'backend', ok: backend.ok, errors: backend.errors },
    { id: 'other', ok: other.ok, errors: other.errors },
  ]

  return {
    scoreboard: computeMigrationProgressTotals(),
    gates,
    fdm: { ok: fdm.ok, errors: fdm.errors },
    deviceBridge: { ok: deviceBridge.ok, errors: deviceBridge.errors },
    bootstrap: { ok: bootstrap.ok, errors: bootstrap.errors },
    allOk: gates.every((g) => g.ok) && fdm.ok && deviceBridge.ok && bootstrap.ok,
  }
}
