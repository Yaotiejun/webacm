import { describe, expect, it } from 'vitest'
import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
} from '@/core/migration/deviceBridgeGridbotMockStatus'
import { evaluateGridbotBridgeMockSoak } from './gridbotBridgeMockSoak'

describe('gridbotBridgeMockSoak', () => {
  it('passes when mock M105 and M114 lines are present', () => {
    const r = evaluateGridbotBridgeMockSoak([
      { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE, at: 0 },
      { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE, at: 1 },
    ])
    expect(r.ok).toBe(true)
    expect(r.sawM105).toBe(true)
    expect(r.sawM114).toBe(true)
  })
})
