import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getRasterGripBridgeSessionOverride,
  isRasterGripBridgeEnabled,
  setRasterGripBridgeSessionOverride,
  shouldRunRasterViaGripBridge,
} from './rasterGripBridgePolicy'

describe('rasterGripBridgePolicy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    setRasterGripBridgeSessionOverride(null)
  })

  it('is off when env is 0 and no session override', () => {
    vi.stubEnv('VITE_RASTER_GRIP_BRIDGE', '0')
    setRasterGripBridgeSessionOverride(null)
    expect(isRasterGripBridgeEnabled()).toBe(false)
    expect(shouldRunRasterViaGripBridge('planar')).toBe(false)
  })

  it('enables planar/radial when env is 1', () => {
    vi.stubEnv('VITE_RASTER_GRIP_BRIDGE', '1')
    expect(shouldRunRasterViaGripBridge('planar')).toBe(true)
    expect(shouldRunRasterViaGripBridge('radial')).toBe(true)
    expect(shouldRunRasterViaGripBridge('tracing')).toBe(false)
  })

  it('session override wins over env', () => {
    vi.stubEnv('VITE_RASTER_GRIP_BRIDGE', '0')
    setRasterGripBridgeSessionOverride(true)
    expect(isRasterGripBridgeEnabled()).toBe(true)
    setRasterGripBridgeSessionOverride(null)
    expect(getRasterGripBridgeSessionOverride()).toBe(null)
    expect(isRasterGripBridgeEnabled()).toBe(false)
  })
})
