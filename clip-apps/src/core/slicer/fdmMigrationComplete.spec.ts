import { describe, expect, it } from 'vitest'
import { evaluateFdmMigrationComplete } from './fdmMigrationComplete'

describe('fdmMigrationComplete', () => {
  it('passes FDM shell migration gate', () => {
    const r = evaluateFdmMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
