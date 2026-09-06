import { describe, expect, it } from 'vitest'
import { bindLegacyImpl, clearLegacyImplBindings, getKiriRuntimeState, runWithLegacySliceGuard } from './kiriRuntimeState'

describe('slicer.kiriRuntimeState', () => {
  it('binds and clears legacy impl references', () => {
    const state = getKiriRuntimeState()
    bindLegacyImpl({
      fdmSliceImpl: () => {},
      fakeDeviceProfile: { d: 1 },
      fakeControllerProfile: { c: 1 },
    })
    expect(typeof state.fdmSliceImpl).toBe('function')
    expect(state.fakeDeviceProfile).toEqual({ d: 1 })
    clearLegacyImplBindings()
    expect(state.fdmSliceImpl).toBeNull()
    expect(state.fakeControllerProfile).toBeNull()
  })

  it('bindLegacyImpl clears lastLegacyFdmImportError; clearLegacyImplBindings keeps it for diagnostics', () => {
    const state = getKiriRuntimeState()
    state.lastLegacyFdmImportError = 'dynamic import failed'
    clearLegacyImplBindings()
    expect(state.lastLegacyFdmImportError).toBe('dynamic import failed')
    bindLegacyImpl({
      fdmSliceImpl: () => {},
      fakeDeviceProfile: {},
      fakeControllerProfile: {},
    })
    expect(state.lastLegacyFdmImportError).toBeNull()
  })

  it('rejects concurrent guarded slice runs and releases guard after finish', async () => {
    const state = getKiriRuntimeState()
    state.legacySliceRunning = false
    let resolveGate!: () => void
    const gate = new Promise<void>((resolve) => {
      resolveGate = resolve
    })
    const first = runWithLegacySliceGuard(
      () => gate,
    )
    await expect(runWithLegacySliceGuard(async () => {})).rejects.toThrow('legacy slice already running')
    expect(state.legacySliceRunning).toBe(true)
    resolveGate()
    await first
    expect(state.legacySliceRunning).toBe(false)
  })

  it('clears legacySliceRunning when guarded run rejects', async () => {
    const state = getKiriRuntimeState()
    state.legacySliceRunning = false
    await expect(
      runWithLegacySliceGuard(async () => {
        throw new Error('slice failed')
      }),
    ).rejects.toThrow('slice failed')
    expect(state.legacySliceRunning).toBe(false)
  })

  it('clears legacySliceRunning when guarded run throws synchronously', async () => {
    const state = getKiriRuntimeState()
    state.legacySliceRunning = false
    await expect(
      runWithLegacySliceGuard(() => {
        throw new Error('sync boom')
      }),
    ).rejects.toThrow('sync boom')
    expect(state.legacySliceRunning).toBe(false)
  })
})
