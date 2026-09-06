import { describe, expect, it } from 'vitest'
import { formatGridbotAdvancedOk } from './deviceBridgeGridbotProtocol'
import { DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK } from './deviceBridgeGridbotMockStatus'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from './deviceBridgeCarveraMockStatus'
import {
  simulateCarveraMockCommand,
  simulateGridbotMockCommand,
} from './deviceBridgeMockSimulator'

describe('deviceBridgeMockSimulator', () => {
  it('simulates Carvera ? and $H like device-bridge', () => {
    let state = { alarmed: false }
    const status = simulateCarveraMockCommand('?', state)
    expect(status.lines[0]).toBe(DEVICE_BRIDGE_CARVERA_MOCK_STATUS)
    expect(status.lines[1]).toBe('ok')

    const home = simulateCarveraMockCommand('G0 $H', status.state)
    expect(home.state.alarmed).toBe(true)
    expect(home.lines[0]).toContain('ALARM')
  })

  it('simulates Gridbot M105/M114/G-code like device-bridge', () => {
    let state = { nozzleTarget: 210, bedTarget: 60, bufFree: 16, plnFree: 16 }
    const m105 = simulateGridbotMockCommand('M105', state)
    expect(m105.lines[0]).toMatch(/^ok T:/)

    const m114 = simulateGridbotMockCommand('M114', m105.state)
    expect(m114.lines[0]).toMatch(/^X:/)

    const g1 = simulateGridbotMockCommand('G1 X1', { ...m114.state, bufFree: 16, plnFree: 16 })
    expect(g1.lines[0]).toBe('ok B15 P15')
    expect(formatGridbotAdvancedOk(1, 15, 15)).toBe(DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK)
  })
})
