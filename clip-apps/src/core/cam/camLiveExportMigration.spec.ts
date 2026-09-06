import { describe, expect, it } from 'vitest'
import { evaluateCamLiveExportMigration } from './camLiveExportMigration'

describe('camLiveExportMigration', () => {
  it('skips when CAM_LIVE_MIGRATION is unset', async () => {
    const prev = process.env.CAM_LIVE_MIGRATION
    delete process.env.CAM_LIVE_MIGRATION
    const r = await evaluateCamLiveExportMigration()
    if (prev != null) process.env.CAM_LIVE_MIGRATION = prev
    expect(r.phase).toBe('skipped')
    expect(r.ok).toBe(true)
  })
})
