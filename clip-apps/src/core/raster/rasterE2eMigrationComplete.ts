import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateRasterMigrationComplete } from '@/core/raster/rasterMigrationComplete'
import { gripBaselineFixturesDir, gripBaselineFixturesPresent } from '@/core/raster/rasterGripBaselineLoader.node'
import { validateGripPlanarBaselineMeta } from '@/core/raster/rasterGripBaselineMeta'

export interface RasterE2eMigrationCompleteResult {
  ok: boolean
  checks: {
    fixturesPresent: boolean
    planarMetaValid: boolean
    rasterGate: boolean
  }
  e2eHint: string
  errors: string[]
}

/**
 * Phase 4 — Raster E2E baseline prerequisites.
 * Browser checksum: `E2E_RASTER_BASELINE=1 npm run test:e2e:raster-baseline`
 */
export function evaluateRasterE2eMigrationComplete(): RasterE2eMigrationCompleteResult {
  const errors: string[] = []
  const fixturesPresent = gripBaselineFixturesPresent()
  if (!fixturesPresent) {
    errors.push('missing public/grip-raster-fixtures (run npm run sync:grip-fixtures)')
  }

  let planarMetaValid = false
  if (fixturesPresent) {
    const metaPath = resolve(gripBaselineFixturesDir(), 'planar-baseline.meta.json')
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as unknown
        planarMetaValid = validateGripPlanarBaselineMeta(meta).length === 0
      } catch {
        errors.push('planar-baseline.meta.json parse failed')
      }
    } else {
      errors.push('planar-baseline.meta.json missing')
    }
  }
  if (fixturesPresent && !planarMetaValid && !errors.some((e) => e.includes('meta'))) {
    errors.push('planar-baseline.meta.json validation failed')
  }

  const rasterGate = evaluateRasterMigrationComplete()
  if (!rasterGate.ok) errors.push(...rasterGate.errors.map((e) => `raster: ${e}`))

  const e2eHint =
    'E2E_RASTER_BASELINE=1 npm run test:e2e:raster-baseline (starts Vite; planar 基线一键 checksum)'

  return {
    ok: errors.length === 0,
    checks: {
      fixturesPresent,
      planarMetaValid,
      rasterGate: rasterGate.ok,
    },
    e2eHint,
    errors,
  }
}
