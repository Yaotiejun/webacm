import { describe, expect, it } from 'vitest'
import { resolveCamSessionBundleTrace } from './sessionBundleTraceResolve'
import { TRACE_NONE_VALUE } from '@/core/traceKeys'

describe('cam.sessionBundleTraceResolve', () => {
  it('prefers explicit trace values when present', () => {
    const out = resolveCamSessionBundleTrace({
      trace: {
        sourceLabel: 'trace:label',
        sourceFingerprint: 'trace:fingerprint',
      },
      targetRun: {
        id: 'run-1',
        name: 'Run A',
      },
      migrationMeta: {
        engineHints: {
          targetGcodeSha256: 'legacy-sha',
        },
      },
    })
    expect(out).toEqual({
      sourceLabel: 'trace:label',
      sourceFingerprint: 'trace:fingerprint',
    })
  })

  it('falls back to targetRun and targetGcodeSha256 when trace is missing', () => {
    const out = resolveCamSessionBundleTrace({
      targetRun: {
        id: 'run-1',
        name: 'Run A',
      },
      migrationMeta: {
        engineHints: {
          targetGcodeSha256: 'legacy-sha',
        },
      },
    })
    expect(out).toEqual({
      sourceLabel: 'run-1:Run A',
      sourceFingerprint: 'legacy-sha',
    })
  })

  it('uses <none> placeholders when no trace hints exist', () => {
    const out = resolveCamSessionBundleTrace(null)
    expect(out).toEqual({
      sourceLabel: TRACE_NONE_VALUE,
      sourceFingerprint: TRACE_NONE_VALUE,
    })
  })
})
