import { describe, expect, it } from 'vitest'
import { getStockFdmDevice, listStockFdmDeviceIds } from './stockFdmDevices'

describe('stockFdmDevices CR-30', () => {
  it('lists Creality.CR-30', () => {
    expect(listStockFdmDeviceIds()).toContain('Creality.CR-30')
  })

  it('normalizes bedBelt and bed size', () => {
    const d = getStockFdmDevice('Creality.CR-30')
    expect(d).not.toBeNull()
    expect(d!.bedBelt).toBe(true)
    expect(d!.bedWidth).toBe(220)
    expect(d!.bedDepth).toBe(350)
    expect(d!.maxHeight).toBe(170)
  })
})
