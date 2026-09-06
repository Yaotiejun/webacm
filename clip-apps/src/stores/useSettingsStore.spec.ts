import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const settingsMocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}))

vi.mock('@/api/settings', () => ({
  getSettings: (...args: unknown[]) => settingsMocks.getSettings(...args),
  saveSettings: (...args: unknown[]) => settingsMocks.saveSettings(...args),
}))

import { useSettingsStore } from './useSettingsStore'
import type { AppSettings } from '@/types/settings'

describe('stores.useSettingsStore load clone isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load stores clone so mutating API payload after load does not change store', async () => {
    const payload = {
      controller: {
        dark: false,
        nested: { k: 1 },
      },
    } as unknown as AppSettings
    settingsMocks.getSettings.mockResolvedValue(payload)
    const store = useSettingsStore()
    await store.load()
    ;(payload.controller as { nested: { k: number } }).nested.k = 99
    expect((store.settings?.controller as { nested?: { k: number } })?.nested?.k).toBe(1)
  })
})
