import { describe, expect, it } from 'vitest'
import { normalizeCamDeviceJson } from './normalizeCamDevice'
import { countBundledCamDevices, getStockCamDevice, listStockCamDeviceIds } from './stock/stockCamDevices'

describe('normalizeCamDeviceJson', () => {
  it('maps Kiri CAM JSON fields', () => {
    const d = normalizeCamDeviceJson(
      {
        deviceName: 'Makera Carvera',
        bedWidth: 360,
        bedDepth: 240,
        maxHeight: 150,
        spindleMax: 20000,
        originCenter: false,
        gcodeFExt: 'nc',
        gcodePre: ['G21'],
        gcodePost: ['M30'],
        gcodeDwell: ['G4 P{time}'],
        gcodeSpindle: ['M3 S{spindle}'],
        gcodeChange: ['M6 T{tool}'],
      },
      'Makera.Carvera',
    )
    expect(d.mode).toBe('CAM')
    expect(d.deviceName).toBe('Makera Carvera')
    expect(d.bedWidth).toBe(360)
    expect(d.spindleMax).toBe(20000)
    expect(d.gcodePre).toEqual(['G21'])
  })
})

describe('stockCamDevices', () => {
  it('bundles Carvera and Grbl', () => {
    expect(countBundledCamDevices()).toBeGreaterThanOrEqual(8)
    expect(listStockCamDeviceIds()).toContain('Makera.Carvera')
    expect(listStockCamDeviceIds()).toContain('Any.Generic.Grbl')
    const carvera = getStockCamDevice('Makera.Carvera')
    expect(carvera?.bedWidth).toBe(360)
    expect(carvera?.bedDepth).toBe(240)
  })
})
