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
  cloneFdmMaterialFromCurrent,
  deleteFdmMaterial,
  getFdmMaterial,
  listFdmMaterials,
  saveFdmMaterial,
} from './material'

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

describe('api.material FDM materials (ws-settings)', () => {
  it('lists stock materials and default PLA local', async () => {
    const { stock, local } = await listFdmMaterials()
    expect(stock.map((s) => s.name)).toEqual(expect.arrayContaining(['PLA', 'PETG', 'ABS']))
    expect(local.some((m) => m.name === 'PLA')).toBe(true)
  })

  it('getFdmMaterial returns PLA on fresh storage', async () => {
    const m = await getFdmMaterial('PLA')
    expect(m).not.toBeNull()
    expect(m?.name).toBe('PLA')
    expect(m?.nozzleTemp).toBe(200)
  })

  it('getFdmMaterial returns null for unknown material name', async () => {
    expect(await getFdmMaterial('NylonGhost')).toBeNull()
  })

  it('saveFdmMaterial sets currentMaterial.FDM to saved name', async () => {
    const custom = {
      name: 'NylonX',
      nozzleTemp: 250,
      bedTemp: 80,
      fanSpeed: 200,
      fanLayer: 2,
      flowMult: 0.95,
      retractDist: 2,
      retractSpeed: 45,
    }
    await saveFdmMaterial('NylonX', custom)
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.currentMaterial.FDM).toBe('NylonX')
  })

  it('saveFdmMaterial round-trips', async () => {
    const custom = {
      name: 'NylonX',
      nozzleTemp: 250,
      bedTemp: 80,
      fanSpeed: 200,
      fanLayer: 2,
      flowMult: 0.95,
      retractDist: 2,
      retractSpeed: 45,
    }
    await saveFdmMaterial('NylonX', custom)
    const out = await getFdmMaterial('NylonX')
    expect(out?.nozzleTemp).toBe(250)
    expect(out?.name).toBe('NylonX')
  })

  it('deleteFdmMaterial removes entry', async () => {
    await saveFdmMaterial('tmp', {
      name: 'tmp',
      nozzleTemp: 200,
      bedTemp: 60,
      fanSpeed: 255,
      fanLayer: 1,
      flowMult: 1,
      retractDist: 1,
      retractSpeed: 40,
    })
    await deleteFdmMaterial('tmp')
    expect(await getFdmMaterial('tmp')).toBeNull()
  })

  it('cloneFdmMaterialFromCurrent copies active material', async () => {
    await saveFdmMaterial('src', {
      name: 'src',
      nozzleTemp: 222,
      bedTemp: 55,
      fanSpeed: 200,
      fanLayer: 1,
      flowMult: 1,
      retractDist: 1,
      retractSpeed: 40,
    })
    await cloneFdmMaterialFromCurrent('cloned')
    const c = await getFdmMaterial('cloned')
    expect(c?.nozzleTemp).toBe(222)
    expect(c?.name).toBe('cloned')
  })

  it('invalid ws-settings JSON recovers PLA default', async () => {
    lsStore['ws-settings'] = '{bad'
    const m = await getFdmMaterial('PLA')
    expect(m?.name).toBe('PLA')
  })

  it('listFdmMaterials recovers when ws-settings JSON is invalid', async () => {
    lsStore['ws-settings'] = '{bad-json'
    const { stock, local } = await listFdmMaterials()
    expect(stock.map((s) => s.name)).toEqual(expect.arrayContaining(['PLA', 'PETG', 'ABS']))
    expect(local.some((m) => m.name === 'PLA')).toBe(true)
  })

  it('listFdmMaterials recovers when ws-settings root is not a plain object', async () => {
    lsStore['ws-settings'] = JSON.stringify([1, 2])
    const { stock, local } = await listFdmMaterials()
    expect(stock.map((s) => s.name)).toEqual(expect.arrayContaining(['PLA', 'PETG', 'ABS']))
    expect(local.some((m) => m.name === 'PLA')).toBe(true)
  })

  it('deleteFdmMaterial resets currentMaterial to PLA when removing active material', async () => {
    await saveFdmMaterial('active', {
      name: 'active',
      nozzleTemp: 210,
      bedTemp: 60,
      fanSpeed: 255,
      fanLayer: 1,
      flowMult: 1,
      retractDist: 1,
      retractSpeed: 40,
    })
    await deleteFdmMaterial('active')
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.currentMaterial.FDM).toBe('PLA')
    expect(await getFdmMaterial('active')).toBeNull()
  })
})
