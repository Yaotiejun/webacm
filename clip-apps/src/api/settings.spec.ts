import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, saveSettings } from './settings'
import type { AppSettings } from '@/types/settings'

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

describe('api.settings', () => {
  it('returns defaults when storage is empty', async () => {
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
    expect(s.controller.webGPU).toBe(false)
  })

  it('merges stored controller over defaults', async () => {
    lsStore['ws-settings'] = JSON.stringify({
      controller: { units: 'in', webGPU: true },
    })
    const s = await getSettings()
    expect(s.controller.units).toBe('in')
    expect(s.controller.webGPU).toBe(true)
    expect(s.controller.dark).toBe(false)
  })

  it('saveSettings writes merged payload', async () => {
    const payload: AppSettings = {
      controller: {
        ...(await getSettings()).controller,
        dark: true,
      },
    }
    await saveSettings(payload)
    const raw = lsStore['ws-settings']
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as AppSettings
    expect(parsed.controller.dark).toBe(true)
  })

  it('falls back to defaults on invalid JSON', async () => {
    lsStore['ws-settings'] = 'not-json{'
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
  })

  it('falls back to defaults when JSON root is an array', async () => {
    lsStore['ws-settings'] = JSON.stringify([])
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
    expect(s.controller.webGPU).toBe(false)
  })

  it('falls back to defaults when JSON root is a non-object primitive', async () => {
    lsStore['ws-settings'] = '42'
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
  })

  it('uses default controller when stored controller is null', async () => {
    lsStore['ws-settings'] = JSON.stringify({ controller: null })
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
    expect(s.controller.dark).toBe(false)
  })

  it('uses default controller when stored controller is not a plain object', async () => {
    lsStore['ws-settings'] = JSON.stringify({ controller: ['x'] })
    const s = await getSettings()
    expect(s.controller.units).toBe('mm')
    expect(s.controller.webGPU).toBe(false)
  })
})
