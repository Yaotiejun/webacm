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
  cloneFdmProcessFromCurrent,
  deleteFdmProcess,
  getFdmProcess,
  listFdmProcesses,
  saveFdmProcess,
} from './process'

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

describe('api.process FDM profiles (ws-settings)', () => {
  it('returns default process on fresh storage', async () => {
    const p = await getFdmProcess('default')
    expect(p).not.toBeNull()
    expect(p?.processName).toBe('default')
    expect(p?.sliceHeight).toBe(0.25)
  })

  it('listFdmProcesses includes stock and at least default local', async () => {
    const { stock, local } = await listFdmProcesses()
    expect(stock.map((s) => s.name)).toContain('default')
    expect(local.some((l) => l.name === 'default')).toBe(true)
  })

  it('getFdmProcess returns null for unknown profile name', async () => {
    expect(await getFdmProcess('no-such-profile')).toBeNull()
  })

  it('saveFdmProcess sets cproc.FDM to saved profile name', async () => {
    const base = await getFdmProcess('default')
    await saveFdmProcess('myproc', { ...base!, processName: 'myproc', sliceHeight: 0.5 })
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.cproc.FDM).toBe('myproc')
  })

  it('saveFdmProcess round-trips via getFdmProcess', async () => {
    const base = await getFdmProcess('default')
    expect(base).toBeTruthy()
    const named = { ...base!, sliceHeight: 0.42, processName: 'myproc' }
    await saveFdmProcess('myproc', named)
    const out = await getFdmProcess('myproc')
    expect(out?.processName).toBe('myproc')
    expect(out?.sliceHeight).toBe(0.42)
  })

  it('deleteFdmProcess removes a saved profile', async () => {
    const base = await getFdmProcess('default')
    await saveFdmProcess('gone', { ...base!, processName: 'gone' })
    expect(await getFdmProcess('gone')).not.toBeNull()
    await deleteFdmProcess('gone')
    expect(await getFdmProcess('gone')).toBeNull()
  })

  it('deleteFdmProcess resets cproc to default when removing active profile', async () => {
    const base = await getFdmProcess('default')
    await saveFdmProcess('active', { ...base!, sliceHeight: 0.33, processName: 'active' })
    await deleteFdmProcess('active')
    const ws = JSON.parse(lsStore['ws-settings']!)
    expect(ws.cproc.FDM).toBe('default')
    expect(await getFdmProcess('active')).toBeNull()
  })

  it('cloneFdmProcessFromCurrent copies active profile', async () => {
    const base = await getFdmProcess('default')
    await saveFdmProcess('active', { ...base!, sliceHeight: 0.37, processName: 'active' })
    await cloneFdmProcessFromCurrent('cloned')
    const c = await getFdmProcess('cloned')
    expect(c?.sliceHeight).toBe(0.37)
    expect(c?.processName).toBe('cloned')
  })

  it('cloneFdmProcessFromCurrent throws when active profile name is missing from sproc', async () => {
    const base = await getFdmProcess('default')
    lsStore['ws-settings'] = JSON.stringify({
      mode: 'FDM',
      cproc: { FDM: 'ghost' },
      sproc: { FDM: { default: base } },
    })
    await expect(cloneFdmProcessFromCurrent('copy')).rejects.toThrow('当前配置中没有可用的工艺 profile')
  })

  it('listFdmProcesses recovers when ws-settings JSON is invalid', async () => {
    lsStore['ws-settings'] = '{bad-json'
    const { stock, local } = await listFdmProcesses()
    expect(stock.map((s) => s.name)).toContain('default')
    expect(local.some((l) => l.name === 'default')).toBe(true)
  })

  it('listFdmProcesses recovers when ws-settings root is not a plain object', async () => {
    lsStore['ws-settings'] = 'false'
    const { stock, local } = await listFdmProcesses()
    expect(stock.map((s) => s.name)).toContain('default')
    expect(local.some((l) => l.name === 'default')).toBe(true)
  })

  it('recoverable when ws-settings JSON is invalid', async () => {
    lsStore['ws-settings'] = '{not-json'
    const p = await getFdmProcess('default')
    expect(p?.processName).toBe('default')
  })
})
