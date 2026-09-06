import { describe, expect, it } from 'vitest'
import { gripBaselineFixturesPresent } from '@/core/raster/rasterGripBaselineLoader.node'
import { evaluateRasterE2eMigrationComplete } from './rasterE2eMigrationComplete'

const fixturesPresent = gripBaselineFixturesPresent()

describe('rasterE2eMigrationComplete', () => {
  it.skipIf(!fixturesPresent)('passes raster E2E prerequisites when fixtures synced', () => {
    const r = evaluateRasterE2eMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.e2eHint).toContain('E2E_RASTER_BASELINE')
  })

  it('reports missing fixtures when not synced', () => {
    if (fixturesPresent) return
    const r = evaluateRasterE2eMigrationComplete()
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('sync:grip-fixtures'))).toBe(true)
  })
})
