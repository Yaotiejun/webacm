import { describe, expect, it } from 'vitest'
import { evaluateLaserMigrationComplete } from './laserMigrationComplete'

describe('laserMigrationComplete', () => {
  it('passes laser migration-complete gate', () => {
    const r = evaluateLaserMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
