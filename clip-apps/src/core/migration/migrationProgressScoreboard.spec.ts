import { describe, expect, it } from 'vitest'
import {
  MIGRATION_SCOREBOARD_ROWS,
  computeMigrationProgressTotals,
  formatMigrationProgressReport,
} from './migrationProgressScoreboard'

describe('migrationProgressScoreboard', () => {
  it('weights sum to 100', () => {
    const w = MIGRATION_SCOREBOARD_ROWS.reduce((s, r) => s + r.weightPct, 0)
    expect(w).toBe(100)
  })

  it('computes strict and primary path totals', () => {
    const t = computeMigrationProgressTotals()
    expect(t.strictTotalPct).toBe(100)
    expect(t.primaryProductPathPct).toBe(100)
  })

  it('formats markdown report', () => {
    const md = formatMigrationProgressReport({ migrationGatePassed: 1141, migrationGateSkipped: 3 })
    expect(md).toContain('Strict full-scope total')
    expect(md).toContain('1141 passed')
    expect(md).toContain('Optional production / maintenance')
    expect(md).toContain('primary path at 100%')
  })
})
