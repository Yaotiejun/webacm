import { describe, expect, it } from 'vitest'
import { defaultDeviceBridgeEndpoint } from './deviceEndpointReset'

describe('deviceEndpointReset', () => {
  it('returns manifest defaults per device kind', () => {
    expect(defaultDeviceBridgeEndpoint('carvera')).toMatch(/\/carvera$/)
    expect(defaultDeviceBridgeEndpoint('gridbot')).toMatch(/\/gridbot$/)
  })
})
