import { describe, expect, it } from 'vitest'
import { evaluateSlaSoakMigrationComplete } from './slaSoakMigrationComplete'

describe('slaSoakMigrationComplete', () => {
  it('passes offline SLA golden soak gate', async () => {
    const r = await evaluateSlaSoakMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.migrationGate).toBe(true)
    expect(r.soakHint).toContain('soak:sla')
  })
})
