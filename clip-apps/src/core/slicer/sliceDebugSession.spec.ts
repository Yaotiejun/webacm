import { describe, expect, it } from 'vitest'
import {
  buildSlicerDebugConfigChangeHandler,
  initSlicerDebugSession,
  restoreSlicerDebugConfigFromSession,
} from './sliceDebugSession'
import { getSlicerDebugApi, uninstallSlicerDebugApi } from './sliceDebugApi'

describe('slicer.sliceDebugSession', () => {
  it('persists config changes via storage handler', () => {
    let saved = ''
    const storage = {
      getItem: (_k: string) => null,
      setItem: (_k: string, v: string) => {
        saved = v
      },
    }
    const onChange = buildSlicerDebugConfigChangeHandler(storage)
    onChange({ digestMaxEntries: 8, timelineMaxEntries: 32 })
    expect(saved).toContain('"digestMaxEntries":8')
  })

  it('installs debug session and restores config from storage', () => {
    const storage = {
      getItem: (_k: string) => '{"digestMaxEntries":9,"timelineMaxEntries":40}',
      setItem: (_k: string, _v: string) => {},
    }
    const w = {} as Window
    const restored = initSlicerDebugSession(w, storage, {
      dumpTimeline: () => [],
      clearTimeline: () => {},
    })
    expect(restored?.digestMaxEntries).toBe(9)
    expect(getSlicerDebugApi(w)?.getTelemetryTimelineMaxEntries()).toBe(40)
    uninstallSlicerDebugApi(w)
  })

  it('returns null when no session config exists', () => {
    const storage = {
      getItem: (_k: string) => null,
      setItem: (_k: string, _v: string) => {},
    }
    const w = {} as Window
    expect(restoreSlicerDebugConfigFromSession(w, storage)).toBeNull()
  })
})
