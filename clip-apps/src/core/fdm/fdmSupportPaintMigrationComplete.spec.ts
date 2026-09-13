import { describe, expect, it } from 'vitest'
import { evaluateFdmSupportPaintMigrationComplete } from './fdmSupportPaintMigrationComplete'

describe('fdmSupportPaintMigrationComplete', () => {
  it('passes fast FDM support-paint gate (no legacy slice)', () => {
    const r = evaluateFdmSupportPaintMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.api).toBe(true)
    expect(r.checks.densify).toBe(true)
    expect(r.checks.workspaceWired).toBe(true)
  })
})
