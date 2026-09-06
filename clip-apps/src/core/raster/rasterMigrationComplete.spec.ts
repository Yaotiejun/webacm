// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { evaluateRasterMigrationComplete } from './rasterMigrationComplete'

describe('rasterMigrationComplete', () => {
  it('passes migration-complete bundle (path SHA + flat Z + STL when synced)', () => {
    const r = evaluateRasterMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.gripPathSha).toBe(true)
    expect(r.checks.flatCpuZ).toBe(true)
  })
})
