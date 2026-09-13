import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MIGRATION_SCOREBOARD_ROWS } from './migrationProgressScoreboard'
import { MIGRATION_CI_SCRIPTS, MIGRATION_SOAK_SCRIPTS } from './migrationSoakManifest'

describe('migrationSoakManifest', () => {
  it('package.json defines offline and live soak scripts', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }
    const scripts = pkg.scripts ?? {}
    expect(scripts[MIGRATION_SOAK_SCRIPTS.carvera]).toContain('carveraProductionSoak.live')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.gridbot]).toContain('gridbotProductionSoak.live')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.texturizer]).toContain('texturizerMigrationSoak')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.texturizerLive]).toContain('texturizerLiveMesh.live')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.camLive]).toContain('camEngine.legacy.exportStream.live')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.ordered]).toContain('migration-ordered-soak')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.gates]).toContain('migrationProductGates.spec')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.offline]).toContain('migrationProductGates')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.laser]).toContain('laserGolden.soak')
    expect(scripts[MIGRATION_SOAK_SCRIPTS.sla]).toContain('slaGolden.soak')
    expect(scripts[MIGRATION_CI_SCRIPTS.ci]).toContain('ci-migration')
  })

  it('scoreboard marks primary product domains at 100%', () => {
    for (const id of ['texturizer', 'raster', 'cam', 'carvera', 'gridbot'] as const) {
      const row = MIGRATION_SCOREBOARD_ROWS.find((r) => r.id === id)
      expect(row?.completionPct, id).toBe(100)
    }
  })
})
