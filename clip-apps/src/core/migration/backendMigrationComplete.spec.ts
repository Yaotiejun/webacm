import { describe, expect, it } from 'vitest'
import { evaluateBackendMigrationComplete } from './backendMigrationComplete'

describe('backendMigrationComplete', () => {
  it('passes shared backend migration bundle', () => {
    const r = evaluateBackendMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(Object.values(r.checks).every(Boolean)).toBe(true)
  })
})
