import { describe, expect, it } from 'vitest'
import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
} from '@/core/migration/deviceBridgeGridbotMockStatus'
import { evaluateGridbotProductionSoak } from './gridbotProductionSoak'

describe('gridbotProductionSoak', () => {
  it('passes on device-bridge mock lines', () => {
    const r = evaluateGridbotProductionSoak([
      { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE, at: 0 },
      { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE, at: 1 },
      { line: DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK, at: 2 },
      { line: 'ok B14 P15', at: 3 },
    ])
    expect(r.ok).toBe(true)
    expect(r.sawAdvancedOk).toBe(true)
  })
})
