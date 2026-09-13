import { describe, expect, it } from 'vitest'
import { evaluateMigrationProductGates } from './migrationProductGates'

describe('migrationProductGates', () => {
  it('all offline product gates pass', async () => {
    const r = await evaluateMigrationProductGates()
    expect(r.scoreboard.strictTotalPct).toBe(100)
    expect(r.scoreboard.primaryProductPathPct).toBe(100)
    expect(r.fdm.ok, r.fdm.errors.join('; ')).toBe(true)
    expect(r.fdmPaint.ok, r.fdmPaint.errors.join('; ')).toBe(true)
    expect(r.laser.ok, r.laser.errors.join('; ')).toBe(true)
    expect(r.sla.ok, r.sla.errors.join('; ')).toBe(true)
    expect(r.deviceBridge.ok, r.deviceBridge.errors.join('; ')).toBe(true)
    expect(r.bootstrap.ok, r.bootstrap.errors.join('; ')).toBe(true)
    expect(r.allOk, r.gates.filter((g) => !g.ok).map((g) => `${g.id}: ${g.errors.join('; ')}`).join(' | ')).toBe(
      true,
    )
  })
})
