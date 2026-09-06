import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FdmDevice } from '@/types/device'
import { addLocalFdmDeviceFromCurrent, deleteLocalFdmDevice, listFdmDevices } from './devices'

let lsStore: Record<string, string> = {}

function minimalDevice(over: Partial<FdmDevice> = {}): FdmDevice {
  return {
    deviceName: 'Cur',
    mode: 'FDM',
    bedWidth: 220,
    bedDepth: 220,
    bedHeight: 250,
    bedRound: false,
    bedBelt: false,
    originCenter: false,
    maxHeight: 250,
    gcodeTime: 0,
    gcodeChange: [],
    gcodePre: [],
    gcodePost: [],
    gcodeProc: '',
    gcodeFan: [],
    gcodeFeature: [],
    gcodeTrack: [],
    gcodeLayer: [],
    gcodeFExt: '',
    extruders: [{ extFilament: 0, extNozzle: 0.4, extOffsetX: 0, extOffsetY: 0 }],
    ...over,
  }
}

beforeEach(() => {
  lsStore = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in lsStore ? lsStore[k]! : null),
    setItem: (k: string, v: string) => {
      lsStore[k] = v
    },
    removeItem: (k: string) => {
      delete lsStore[k]
    },
    clear: () => {
      lsStore = {}
    },
    key: () => null,
    length: 0,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api.devices FDM device list (ws-settings)', () => {
  it('lists stock device and empty local without ws-settings', async () => {
    const { stock, local } = await listFdmDevices()
    expect(stock.map((d) => d.name)).toContain('Any.Generic.Marlin')
    expect(local).toEqual([])
  })

  it('listFdmDevices recovers when ws-settings JSON is invalid', async () => {
    lsStore['ws-settings'] = '{bad-json'
    const { stock, local } = await listFdmDevices()
    expect(stock.map((d) => d.name)).toContain('Any.Generic.Marlin')
    expect(local).toEqual([])
  })

  it('listFdmDevices recovers when ws-settings JSON root is not a plain object', async () => {
    lsStore['ws-settings'] = JSON.stringify([])
    const a = await listFdmDevices()
    expect(a.local).toEqual([])
    lsStore['ws-settings'] = '99'
    const b = await listFdmDevices()
    expect(b.local).toEqual([])
  })

  it('listFdmDevices includes local device keys from ws-settings', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      devices: { myprinter: minimalDevice({ deviceName: 'myprinter' }) },
      filter: { FDM: 'myprinter' },
    })
    const { stock, local } = await listFdmDevices()
    expect(local.map((d) => d.name)).toEqual(['myprinter'])
    expect(local[0]?.isLocal).toBe(true)
    expect(stock.map((d) => d.name)).toContain('Any.Generic.Marlin')
  })

  it('addLocalFdmDeviceFromCurrent throws when ws has no device payload', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      mode: 'FDM',
      devices: {},
      filter: { FDM: 'Any.Generic.Marlin' },
    })
    await expect(addLocalFdmDeviceFromCurrent('x')).rejects.toThrow('当前配置中没有可用的')
  })

  it('addLocalFdmDeviceFromCurrent copies current device and updates filter', async () => {
    const dev = minimalDevice()
    lsStore['ws-settings'] = JSON.stringify({
      mode: 'FDM',
      devices: {},
      filter: { FDM: 'Any.Generic.Marlin' },
      device: dev,
    })
    await addLocalFdmDeviceFromCurrent('myprinter')
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.devices.myprinter).toBeTruthy()
    expect(ws.filter.FDM).toBe('myprinter')
  })

  it('deleteLocalFdmDevice removes device and resets filter when selected', async () => {
    const dev = minimalDevice({ deviceName: 'myprinter' })
    lsStore['ws-settings'] = JSON.stringify({
      mode: 'FDM',
      devices: { myprinter: dev },
      filter: { FDM: 'myprinter' },
      device: dev,
    })
    await deleteLocalFdmDevice('myprinter')
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.devices.myprinter).toBeUndefined()
    expect(ws.filter.FDM).toBe('Any.Generic.Marlin')
  })
})
