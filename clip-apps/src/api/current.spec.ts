import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@/types/settings'
import type { ControllerSettings } from '@/types/settings'

vi.mock('@/api/settings', () => ({
  getSettings: vi.fn(() =>
    Promise.resolve({
      controller: {} as ControllerSettings,
    } as AppSettings),
  ),
}))

import {
  readCurrentKeys,
  readWsSettings,
  setCurrentDevice,
  setCurrentMaterial,
  setCurrentProcess,
  writeWsSettings,
} from './current'

let lsStore: Record<string, string> = {}

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

describe('api.current ws-settings helpers', () => {
  it('readWsSettings merges defaults when storage empty', async () => {
    const ws = await readWsSettings()
    expect(ws.cproc?.FDM).toBe('default')
    expect(ws.filter?.FDM).toBe('Any.Generic.Marlin')
  })

  it('readCurrentKeys returns FDM defaults on fresh storage', async () => {
    const keys = await readCurrentKeys()
    expect(keys).toEqual({
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
    })
  })

  it('readWsSettings recovers from invalid JSON via getSettings merge', async () => {
    lsStore['ws-settings'] = '{not-json'
    const ws = await readWsSettings()
    expect(ws.cproc?.FDM).toBe('default')
    expect(ws.filter?.FDM).toBe('Any.Generic.Marlin')
  })

  it('readWsSettings merges defaults when JSON root is not a plain object', async () => {
    lsStore['ws-settings'] = JSON.stringify([1])
    const ws = await readWsSettings()
    expect(ws.cproc?.FDM).toBe('default')
    expect(ws.filter?.FDM).toBe('Any.Generic.Marlin')
  })

  it('readWsSettings returns parsed ws-settings when JSON is valid', async () => {
    lsStore['ws-settings'] = JSON.stringify({ filter: { FDM: 'Custom.Device' }, cproc: { FDM: 'p1' } })
    const ws = await readWsSettings()
    expect(ws.filter.FDM).toBe('Custom.Device')
    expect(ws.cproc.FDM).toBe('p1')
  })

  it('writeWsSettings applies patch', async () => {
    await writeWsSettings((ws) => {
      ws.cproc = ws.cproc || {}
      ws.cproc.FDM = 'p99'
    })
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.cproc.FDM).toBe('p99')
  })

  it('readCurrentKeys reads persisted selection', async () => {
    await setCurrentProcess('p99')
    const keys = await readCurrentKeys()
    expect(keys.process).toBe('p99')
  })

  it('setCurrentDevice updates filter.FDM', async () => {
    await setCurrentDevice('MyPrinter')
    const keys = await readCurrentKeys()
    expect(keys.device).toBe('MyPrinter')
  })

  it('setCurrentMaterial updates currentMaterial.FDM', async () => {
    await setCurrentMaterial('PETG')
    const keys = await readCurrentKeys()
    expect(keys.material).toBe('PETG')
  })
})
