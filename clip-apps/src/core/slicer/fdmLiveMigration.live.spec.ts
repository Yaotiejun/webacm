/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { evaluateFdmLiveMigration } from './fdmLiveMigration'

describe('fdmLiveMigration.live', () => {
  it('runs slice path when FDM_LIVE_MIGRATION=1', async () => {
    const prev = process.env.FDM_LIVE_MIGRATION
    process.env.FDM_LIVE_MIGRATION = '1'
    const r = await evaluateFdmLiveMigration()
    if (prev != null) process.env.FDM_LIVE_MIGRATION = prev
    else delete process.env.FDM_LIVE_MIGRATION

    expect(r.layerCount, r.errors.join('; ')).toBeGreaterThan(0)
    expect(['live-passed', 'live-failed']).toContain(r.phase)
  }, 120_000)
})
