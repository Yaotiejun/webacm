import { describe, expect, it, vi } from 'vitest'
import { loadLegacyFdmRuntime } from './kiriRuntimeLoader'
import { getKiriRuntimeState } from './kiriRuntimeState'

describe('slicer.kiriRuntimeLoader', () => {
  it('binds legacy impl when bundle import succeeds', async () => {
    const onBind = vi.fn()
    const onClear = vi.fn()
    await loadLegacyFdmRuntime('auto', import.meta.url, {
      importBundle: async () => ({ default: () => {} }),
      onBind,
      onClear,
    })
    expect(onBind).toHaveBeenCalledTimes(1)
    expect(onClear).not.toHaveBeenCalled()
  })

  it('binds fdm_slice named export from grip slice.js', async () => {
    const onBind = vi.fn()
    await loadLegacyFdmRuntime('auto', import.meta.url, {
      importBundle: async () => ({ fdm_slice: () => {} }),
      onBind,
      onClear: () => {},
    })
    expect(onBind).toHaveBeenCalledTimes(1)
  })

  it('clears bindings in auto mode on import failure', async () => {
    const onBind = vi.fn()
    const onClear = vi.fn()
    await loadLegacyFdmRuntime('auto', import.meta.url, {
      importBundle: async () => {
        throw new Error('boom')
      },
      onBind,
      onClear,
    })
    expect(onBind).not.toHaveBeenCalled()
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(getKiriRuntimeState().lastLegacyFdmImportError).toBe('boom')
  })

  it('throws in strict mode on import failure', async () => {
    await expect(
      loadLegacyFdmRuntime('1', import.meta.url, {
        importBundle: async () => {
          throw new Error('boom')
        },
        onBind: () => {},
        onClear: () => {},
      }),
    ).rejects.toThrow('boom')
  })
})
