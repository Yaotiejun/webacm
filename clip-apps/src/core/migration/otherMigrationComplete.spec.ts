import { describe, expect, it } from 'vitest'
import { evaluateOtherMigrationComplete } from './otherMigrationComplete'

describe('otherMigrationComplete', () => {
  it('passes out-of-scope inventory gate', () => {
    const r = evaluateOtherMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
