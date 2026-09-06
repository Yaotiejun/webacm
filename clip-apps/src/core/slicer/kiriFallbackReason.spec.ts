import { describe, expect, it } from 'vitest'
import { resolveKiriFallbackReason } from './kiriFallbackReason'

describe('slicer.kiriFallbackReason', () => {
  it('maps disabled mode regardless of error detail', () => {
    const out = resolveKiriFallbackReason({ err: new Error('anything'), legacyFdmMode: '0' })
    expect(out.reasonCode).toBe('legacy_disabled')
    expect(out.warningCode).toBe('slicer_legacy_disabled')
  })

  it('maps specific runtime and execution failures', () => {
    expect(resolveKiriFallbackReason({ err: new Error('runtime init failed: x'), legacyFdmMode: 'auto' }).reasonCode).toBe(
      'runtime_init_error',
    )
    expect(resolveKiriFallbackReason({ err: new Error('runtime init failed: x'), legacyFdmMode: 'auto' }).warningCode).toBe(
      'slicer_runtime_init_error',
    )
    expect(resolveKiriFallbackReason({ err: new Error('runtime not ready'), legacyFdmMode: 'auto' }).reasonCode).toBe(
      'runtime_not_ready',
    )
    expect(resolveKiriFallbackReason({ err: new Error('legacy slice already running'), legacyFdmMode: 'auto' }).reasonCode).toBe(
      'legacy_slice_reentry',
    )
    expect(resolveKiriFallbackReason({ err: new Error('legacy slice timeout after 100ms'), legacyFdmMode: 'auto' }).reasonCode).toBe(
      'legacy_slice_timeout',
    )
    expect(resolveKiriFallbackReason({ err: new Error('implementation missing'), legacyFdmMode: 'auto' }).reasonCode).toBe(
      'legacy_impl_missing',
    )
  })

  it('maps non-Error string errors by substring', () => {
    expect(resolveKiriFallbackReason({ err: 'slice timeout', legacyFdmMode: 'auto' }).reasonCode).toBe('legacy_slice_timeout')
  })

  it('defaults unknown errors to legacy_slice_failed', () => {
    const out = resolveKiriFallbackReason({ err: new Error('something else entirely'), legacyFdmMode: 'auto' })
    expect(out.reasonCode).toBe('legacy_slice_failed')
    expect(out.warningCode).toBe('slicer_legacy_slice_failed')
  })
})
