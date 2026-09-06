import { describe, expect, it } from 'vitest'
import { evaluateBootstrapMigrationComplete } from './bootstrapMigrationComplete'

describe('bootstrapMigrationComplete', () => {
  it('passes boot policy migration gate', () => {
    const r = evaluateBootstrapMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
