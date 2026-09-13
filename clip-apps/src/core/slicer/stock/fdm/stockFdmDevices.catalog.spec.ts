import { describe, expect, it } from 'vitest'
import { countBundledFdmDevices, getStockFdmDevice, listStockFdmDeviceIds } from './stockFdmDevices'

describe('stockFdmDevices catalog expansion', () => {
  it('bundles ≥20 Kiri FDM devices including Ender.5 and CR-30', () => {
    expect(countBundledFdmDevices()).toBeGreaterThanOrEqual(20)
    const ids = listStockFdmDeviceIds()
    expect(ids).toContain('Creality.Ender.5')
    expect(ids).toContain('Creality.K1')
    expect(ids).toContain('Creality.CR-30')
    expect(ids).toContain('Anycubic.Kobra')
    expect(getStockFdmDevice('Creality.Ender.5')?.bedWidth).toBeGreaterThan(0)
    expect(getStockFdmDevice('Creality.CR-30')?.bedBelt).toBe(true)
  })
})
