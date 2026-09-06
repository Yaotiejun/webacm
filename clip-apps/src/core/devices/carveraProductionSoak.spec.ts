import { describe, expect, it } from 'vitest'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from '@/core/migration/deviceBridgeCarveraMockStatus'
import { evaluateCarveraProductionSoak } from './carveraProductionSoak'

describe('carveraProductionSoak', () => {
  it('passes on device-bridge mock status line', () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({
      line: DEVICE_BRIDGE_CARVERA_MOCK_STATUS,
      parsed: null,
      at: i,
    }))
    const r = evaluateCarveraProductionSoak(samples)
    expect(r.ok).toBe(true)
    expect(r.sawMpos).toBe(true)
    expect(r.sawWpos).toBe(true)
    expect(r.sawBuf).toBe(true)
  })
})
