import { describe, expect, it } from 'vitest'
import {
  canRunLegacyFdmPreview,
  resolveLegacyFdmMode,
  resolveLegacyPreviewSkipFallback,
  resolveLegacySliceFailureCode,
  resolveLegacySliceTimeoutMs,
  toSliceFallbackReasonCode,
  shouldThrowOnLegacyImportFailure,
  shouldTryLegacyFdm,
} from './kiriRuntimePolicy'

describe('slicer.kiriRuntimePolicy', () => {
  it('normalizes legacy mode values', () => {
    expect(resolveLegacyFdmMode('0')).toBe('0')
    expect(resolveLegacyFdmMode('1')).toBe('1')
    expect(resolveLegacyFdmMode('whatever')).toBe('auto')
  })

  it('computes try/throw policy from mode', () => {
    expect(shouldTryLegacyFdm('0')).toBe(false)
    expect(shouldTryLegacyFdm('auto')).toBe(true)
    expect(shouldThrowOnLegacyImportFailure('1')).toBe(true)
    expect(shouldThrowOnLegacyImportFailure('auto')).toBe(false)
  })

  it('computes runtime execution gate', () => {
    expect(
      canRunLegacyFdmPreview({
        runtimeReady: true,
        runtimeError: null,
        hasSliceImpl: true,
        hasVertices: true,
      }),
    ).toBe(true)
    expect(
      canRunLegacyFdmPreview({
        runtimeReady: true,
        runtimeError: new Error('x'),
        hasSliceImpl: true,
        hasVertices: true,
      }),
    ).toBe(false)
  })

  it('blocks legacy preview when slice impl or vertices are missing', () => {
    expect(
      canRunLegacyFdmPreview({
        runtimeReady: true,
        runtimeError: null,
        hasSliceImpl: false,
        hasVertices: true,
      }),
    ).toBe(false)
    expect(
      canRunLegacyFdmPreview({
        runtimeReady: true,
        runtimeError: null,
        hasSliceImpl: true,
        hasVertices: false,
      }),
    ).toBe(false)
  })

  it('resolves legacy slice timeout with sane bounds', () => {
    expect(resolveLegacySliceTimeoutMs(undefined)).toBe(30_000)
    expect(resolveLegacySliceTimeoutMs('2500')).toBe(2500)
    expect(resolveLegacySliceTimeoutMs(10)).toBe(100)
    expect(resolveLegacySliceTimeoutMs(99999999)).toBe(300_000)
  })

  it('classifies legacy slice failure codes for observability', () => {
    expect(resolveLegacySliceFailureCode(new Error('legacy slice already running'))).toBe('legacy_slice_reentry')
    expect(resolveLegacySliceFailureCode(new Error('legacy slice timeout after 100ms'))).toBe('legacy_slice_timeout')
    expect(resolveLegacySliceFailureCode(new Error('other'))).toBe('legacy_slice_failed')
  })

  it('classifies legacy slice failure from non-Error values', () => {
    expect(resolveLegacySliceFailureCode('timeout in worker')).toBe('legacy_slice_timeout')
    expect(resolveLegacySliceFailureCode({ message: 'already running' })).toBe('legacy_slice_reentry')
  })

  it('maps failure code to slice fallback reason code', () => {
    expect(toSliceFallbackReasonCode('legacy_slice_reentry')).toBe('legacy_slice_reentry')
    expect(toSliceFallbackReasonCode('legacy_slice_timeout')).toBe('legacy_slice_timeout')
    expect(toSliceFallbackReasonCode('legacy_slice_failed')).toBe('legacy_slice_failed')
  })

  it('resolves skip fallback reason for non-execution paths', () => {
    expect(
      resolveLegacyPreviewSkipFallback({
        mode: '0',
        runtimeReady: true,
        runtimeError: null,
        hasSliceImpl: true,
        hasVertices: true,
      })?.reasonCode,
    ).toBe('legacy_disabled')
    expect(
      resolveLegacyPreviewSkipFallback({
        mode: 'auto',
        runtimeReady: true,
        runtimeError: new Error('init fail'),
        hasSliceImpl: true,
        hasVertices: true,
      })?.reasonCode,
    ).toBe('runtime_init_error')
    expect(
      resolveLegacyPreviewSkipFallback({
        mode: 'auto',
        runtimeReady: false,
        runtimeError: null,
        hasSliceImpl: true,
        hasVertices: true,
      })?.reasonCode,
    ).toBe('runtime_not_ready')
    expect(
      resolveLegacyPreviewSkipFallback({
        mode: 'auto',
        runtimeReady: true,
        runtimeError: null,
        hasSliceImpl: false,
        hasVertices: true,
      })?.reasonCode,
    ).toBe('legacy_impl_missing')
  })

  it('returns null skip fallback when vertices are absent (nothing to preview)', () => {
    expect(
      resolveLegacyPreviewSkipFallback({
        mode: 'auto',
        runtimeReady: false,
        runtimeError: null,
        hasSliceImpl: false,
        hasVertices: false,
      }),
    ).toBeNull()
  })
})
