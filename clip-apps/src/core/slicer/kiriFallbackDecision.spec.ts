import { describe, expect, it } from 'vitest'
import {
  buildLegacyGateSnapshot,
  resolveLegacyFailureTelemetry,
  resolveLegacyFallbackBeforeRun,
  resolveLegacyFallbackFromError,
} from './kiriFallbackDecision'

describe('slicer.kiriFallbackDecision', () => {
  it('builds normalized legacy gate snapshot', () => {
    const gate = buildLegacyGateSnapshot({
      mode: 'auto',
      runtimeReady: 1 as any,
      runtimeError: null,
      hasSliceImpl: 'yes' as any,
      hasVertices: 0 as any,
    })
    expect(gate.runtimeReady).toBe(true)
    expect(gate.hasSliceImpl).toBe(true)
    expect(gate.hasVertices).toBe(false)
  })

  it('produces skip fallback when legacy is disabled', () => {
    const out = resolveLegacyFallbackBeforeRun({
      mode: '0',
      runtimeReady: true,
      runtimeError: null,
      hasSliceImpl: true,
      hasVertices: true,
    })
    expect(out.shouldRunLegacy).toBe(false)
    expect(out.fallback?.reasonCode).toBe('legacy_disabled')
    expect(out.fallback?.warningCode).toBe('slicer_legacy_disabled')
  })

  it('allows legacy run when gate is green', () => {
    const out = resolveLegacyFallbackBeforeRun({
      mode: 'auto',
      runtimeReady: true,
      runtimeError: null,
      hasSliceImpl: true,
      hasVertices: true,
    })
    expect(out.shouldRunLegacy).toBe(true)
    expect(out.fallback).toBeNull()
  })

  it('maps runtime errors to structured fallback', () => {
    const out = resolveLegacyFallbackFromError(new Error('legacy slice already running'))
    expect(out?.reasonCode).toBe('legacy_slice_reentry')
    expect(out?.warningCode).toBe('slicer_legacy_slice_reentry')
  })

  it.each([
    {
      name: 'timeout error',
      err: new Error('legacy slice timeout after 500ms'),
      reasonCode: 'legacy_slice_timeout',
      warningCode: 'slicer_legacy_slice_timeout',
    },
    {
      name: 'reentry error',
      err: new Error('legacy slice already running'),
      reasonCode: 'legacy_slice_reentry',
      warningCode: 'slicer_legacy_slice_reentry',
    },
    {
      name: 'unknown error fallback',
      err: new Error('legacy slice crashed'),
      reasonCode: 'legacy_slice_failed',
      warningCode: 'slicer_legacy_slice_failed',
    },
  ])('builds telemetry for $name', ({ err, reasonCode, warningCode }) => {
    const out = resolveLegacyFailureTelemetry(err)
    expect(out.fallback.reasonCode).toBe(reasonCode)
    expect(out.warningCode).toBe(warningCode)
    expect(out.fallback.warningCode).toBe(warningCode)
    expect(out.fallback.message.length > 0).toBe(true)
  })

  it('resolveLegacyFailureTelemetry maps plain string timeout to timeout reason', () => {
    const out = resolveLegacyFailureTelemetry('legacy slice timeout')
    expect(out.fallback.reasonCode).toBe('legacy_slice_timeout')
    expect(out.warningCode).toBe('slicer_legacy_slice_timeout')
  })
})
