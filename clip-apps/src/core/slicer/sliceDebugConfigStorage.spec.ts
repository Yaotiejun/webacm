import { describe, expect, it } from 'vitest'
import {
  loadSlicerDebugConfig,
  saveSlicerDebugConfig,
  SLICER_DEBUG_CONFIG_SESSION_KEY,
} from './sliceDebugConfigStorage'

describe('slicer.sliceDebugConfigStorage', () => {
  it('saves config snapshot JSON into session storage key', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    }
    saveSlicerDebugConfig(storage, { digestMaxEntries: 7, timelineMaxEntries: 21 })
    expect(store.get(SLICER_DEBUG_CONFIG_SESSION_KEY)).toContain('"digestMaxEntries":7')
  })

  it('loads raw config JSON from session storage key', () => {
    const storage = {
      getItem: (k: string) => (k === SLICER_DEBUG_CONFIG_SESSION_KEY ? '{"digestMaxEntries":5}' : null),
      setItem: (_k: string, _v: string) => {},
    }
    expect(loadSlicerDebugConfig(storage)).toBe('{"digestMaxEntries":5}')
  })
})
