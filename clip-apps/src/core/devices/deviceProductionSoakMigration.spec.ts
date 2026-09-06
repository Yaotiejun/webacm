import { describe, expect, it } from 'vitest'
import { evaluateDeviceProductionSoakMigration } from './deviceProductionSoakMigration'

describe('deviceProductionSoakMigration', () => {
  it('passes mock contract when live soak not required', async () => {
    const prev = process.env.DEVICE_PRODUCTION_SOAK
    delete process.env.DEVICE_PRODUCTION_SOAK
    const r = await evaluateDeviceProductionSoakMigration()
    if (prev != null) process.env.DEVICE_PRODUCTION_SOAK = prev
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.carvera.phase).toBe('mock-ok')
    expect(r.gridbot.phase).toBe('mock-ok')
  })
})
