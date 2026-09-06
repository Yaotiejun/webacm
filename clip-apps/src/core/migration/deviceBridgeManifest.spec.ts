import { describe, expect, it } from 'vitest'
import {
  DEVICE_BRIDGE_DEFAULT_PORT,
  DEVICE_BRIDGE_WS_PATHS,
  deviceBridgeCarveraUrl,
  deviceBridgeGridBotUrl,
} from './deviceBridgeManifest'

describe('deviceBridgeManifest', () => {
  it('documents default bridge endpoints', () => {
    expect(DEVICE_BRIDGE_WS_PATHS.carvera).toBe('/carvera')
    expect(DEVICE_BRIDGE_WS_PATHS.gridbot).toBe('/gridbot')
    expect(deviceBridgeCarveraUrl()).toBe(`ws://localhost:${DEVICE_BRIDGE_DEFAULT_PORT}/carvera`)
    expect(deviceBridgeGridBotUrl()).toBe(`ws://localhost:${DEVICE_BRIDGE_DEFAULT_PORT}/gridbot`)
  })
})
