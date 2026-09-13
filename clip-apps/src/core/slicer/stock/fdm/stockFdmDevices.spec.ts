import { describe, expect, it } from 'vitest'
import { getStockFdmDevice, listStockFdmDeviceIds } from './stockFdmDevices'

describe('stockFdmDevices', () => {
  it('bundles curated Kiri device profiles', () => {
    const ids = listStockFdmDeviceIds()
    expect(ids).toContain('Creality.Ender.3')
    expect(ids).toContain('Any.Generic.Marlin')
    const ender = getStockFdmDevice('Creality.Ender.3')
    expect(ender?.bedWidth).toBe(220)
    expect(ender?.originCenter).toBe(false)
    expect(ender?.gcodePre.length).toBeGreaterThan(0)
    const marlin = getStockFdmDevice('Any.Generic.Marlin')
    expect(marlin?.bedWidth).toBeGreaterThan(0)
    expect(marlin?.gcodePre.length).toBeGreaterThan(0)
  })

  it('resolves Prusa.MK3 alias', () => {
    const d = getStockFdmDevice('Prusa.MK3')
    expect(d?.deviceName.toLowerCase()).toContain('mk3')
  })
})
