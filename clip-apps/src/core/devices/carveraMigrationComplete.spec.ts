import { describe, expect, it } from 'vitest'
import { evaluateCarveraMigrationComplete } from './carveraMigrationComplete'

describe('carveraMigrationComplete', () => {
  it('passes migration-complete bundle on bridge mock contract', () => {
    const r = evaluateCarveraMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.productionSoakMock).toBe(true)
  })
})
