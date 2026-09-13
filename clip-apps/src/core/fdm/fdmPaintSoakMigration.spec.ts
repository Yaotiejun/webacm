import { describe, expect, it } from 'vitest'
import { evaluateFdmPaintSoakMigration } from './fdmPaintSoakMigration'

describe('fdmPaintSoakMigration', () => {
  it('registers paint soak entry points', () => {
    const r = evaluateFdmPaintSoakMigration()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.integrationSpecPresent).toBe(true)
    expect(r.checks.soakScriptDocumented).toBe(true)
  })
})
