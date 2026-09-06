import { describe, expect, it } from 'vitest'
import {
  parseGridbotM105Line,
  parseGridbotM114Line,
} from '@/core/devices/gridbotLineParse'
import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
} from './deviceBridgeGridbotMockStatus'

describe('deviceBridgeGridbotMockStatus', () => {
  it('gridbot mock M105 line parses nozzle/bed temps', () => {
    const t = parseGridbotM105Line(DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE)
    expect(t?.nozzle).toBe(210)
    expect(t?.nozzleTarget).toBe(210)
    expect(t?.bed).toBe(60)
    expect(t?.bedTarget).toBe(60)
  })

  it('gridbot mock M114 line parses position', () => {
    expect(parseGridbotM114Line(DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE)).toEqual({
      x: 0,
      y: 0,
      z: 0,
      e: 0,
    })
  })

  it('gridbot mock ADVANCED_OK line is classified as ok', () => {
    expect(DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK).toMatch(/^ok\b/i)
    expect(DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK).toMatch(/B\d+\s+P\d+/)
  })
})
