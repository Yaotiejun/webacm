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

vi.mock('@/api/devices', () => ({
  listFdmDevices: vi.fn(() =>
    Promise.resolve({
      stock: [{ name: 'StockD', mode: 'FDM', isLocal: false }],
      local: [{ name: 'LocalD', mode: 'FDM', isLocal: true }],
    }),
  ),
}))

vi.mock('@/api/process', () => ({
  listFdmProcesses: vi.fn(() =>
    Promise.resolve({
      stock: [{ name: 'stockP', mode: 'FDM', isLocal: false }],
      local: [{ name: 'localP', mode: 'FDM', isLocal: true }],
    }),
  ),
}))

vi.mock('@/api/material', () => ({
  listFdmMaterials: vi.fn(() =>
    Promise.resolve({
      stock: [{ name: 'ABS', mode: 'FDM', isLocal: false }],
      local: [{ name: 'localM', mode: 'FDM', isLocal: true }],
    }),
  ),
}))

import { listFdmDevices } from '@/api/devices'
import { listFdmMaterials } from '@/api/material'
import { listFdmProcesses } from '@/api/process'
import { getCurrentFdmConfig, setCurrentFdmConfig } from './config'

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
  vi.mocked(listFdmDevices).mockClear()
  vi.mocked(listFdmProcesses).mockClear()
  vi.mocked(listFdmMaterials).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api.config CurrentFdmConfig', () => {
  it('merges defaults and list-derived name arrays on fresh storage', async () => {
    const cfg = await getCurrentFdmConfig()
    expect(cfg.device).toBe('Any.Generic.Marlin')
    expect(cfg.process).toBe('default')
    expect(cfg.material).toBe('PLA')
    expect(cfg.devices).toEqual(['LocalD', 'StockD'])
    expect(cfg.processes).toEqual(['localP', 'stockP'])
    expect(cfg.materials).toEqual(['localM', 'ABS'])
    expect(listFdmDevices).toHaveBeenCalled()
    expect(listFdmProcesses).toHaveBeenCalled()
    expect(listFdmMaterials).toHaveBeenCalled()
  })

  it('uses list fallbacks when ws omits filter/cproc/currentMaterial', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      mode: 'FDM',
    })
    const cfg = await getCurrentFdmConfig()
    expect(cfg.device).toBe('LocalD')
    expect(cfg.process).toBe('localP')
    expect(cfg.material).toBe('localM')
  })

  it('setCurrentFdmConfig persists selections for next getCurrentFdmConfig', async () => {
    await setCurrentFdmConfig({ device: 'LocalD', process: 'localP', material: 'ABS' })
    const cfg = await getCurrentFdmConfig()
    expect(cfg.device).toBe('LocalD')
    expect(cfg.process).toBe('localP')
    expect(cfg.material).toBe('ABS')
  })

  it('setCurrentFdmConfig partial patch updates only provided keys', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      filter: { FDM: 'A' },
      cproc: { FDM: 'B' },
      currentMaterial: { FDM: 'C' },
    })
    await setCurrentFdmConfig({ material: 'PETG' })
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.filter.FDM).toBe('A')
    expect(ws.cproc.FDM).toBe('B')
    expect(ws.currentMaterial.FDM).toBe('PETG')
  })

  it('getCurrentFdmConfig reads persisted filter/cproc/currentMaterial from valid ws-settings', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      filter: { FDM: 'SavedD' },
      cproc: { FDM: 'SavedP' },
      currentMaterial: { FDM: 'SavedM' },
    })
    const cfg = await getCurrentFdmConfig()
    expect(cfg.device).toBe('SavedD')
    expect(cfg.process).toBe('SavedP')
    expect(cfg.material).toBe('SavedM')
  })

  it('recovers from invalid ws-settings JSON like empty storage', async () => {
    lsStore['ws-settings'] = '{bad json'
    const cfg = await getCurrentFdmConfig()
    expect(cfg.process).toBe('default')
    expect(cfg.material).toBe('PLA')
  })

  it('recovers from ws-settings JSON root that is not a plain object', async () => {
    lsStore['ws-settings'] = JSON.stringify(null)
    const cfg = await getCurrentFdmConfig()
    expect(cfg.device).toBe('Any.Generic.Marlin')
    expect(cfg.process).toBe('default')
  })
})
