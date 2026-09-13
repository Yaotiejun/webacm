import { describe, expect, it } from 'vitest'
import { evaluateLaserSoakMigrationComplete } from './laserSoakMigrationComplete'

describe('laserSoakMigrationComplete', () => {
  it('passes offline laser golden soak gate', () => {
    const r = evaluateLaserSoakMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.migrationGate).toBe(true)
    expect(r.soakHint).toContain('soak:laser')
  })
})
