import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CARVERA_BRIDGE_ENDPOINT,
  DEFAULT_GRIDBOT_BRIDGE_ENDPOINT,
  defaultCarveraBridgeEndpoint,
  defaultGridBotBridgeEndpoint,
} from './deviceBridgeDefaultEndpoint'

describe('deviceBridgeDefaultEndpoint', () => {
  it('matches device-bridge manifest URLs', () => {
    expect(DEFAULT_CARVERA_BRIDGE_ENDPOINT).toBe('ws://localhost:9999/carvera')
    expect(DEFAULT_GRIDBOT_BRIDGE_ENDPOINT).toBe('ws://localhost:9999/gridbot')
  })

  it('builds URLs for custom port', () => {
    expect(defaultCarveraBridgeEndpoint(10001)).toBe('ws://localhost:10001/carvera')
    expect(defaultGridBotBridgeEndpoint(10001)).toBe('ws://localhost:10001/gridbot')
  })
})
