import { describe, expect, it } from 'vitest'
import type { SliceResult } from '@/api/slice'
import { TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'
import {
  buildEstimateMetaCompactSummary,
  buildEstimateMetaExportPayload,
  buildEstimateMetaFingerprint,
} from './estimateMetaExport'

function makeResult(): SliceResult {
  return {
    backend: 'mock',
    summary: {
      layers: 12,
      timeMinutes: 3.4567,
      filamentMm: 123.4567,
      estimateMeta: {
        lengths: {
          perimeter: 100.1234,
          infill: 50.5678,
          support: 10.2345,
          travelInLayer: 30.3456,
          travelInterLayer: 8.4567,
        },
        retract: {
          triggerDistance: 1.5,
          travelSegments: 20,
          interLayerSegments: 8,
          estimatedCount: 7,
        },
        timeSec: {
          print: 80,
          travel: 20,
          retract: 10,
          floor: 0,
          final: 110.789,
        },
      },
    },
    fallback: null,
    preview: {
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      layers: [],
    },
  }
}

describe('slicer.estimateMetaExport', () => {
  it('builds stable fingerprint from context and summary', () => {
    const result = makeResult()
    const fp = buildEstimateMetaFingerprint(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
    })
    expect(fp).toContain('device:Any.Generic.Marlin')
    expect(fp).toContain('time:3.457')
    expect(fp).toContain('lenP:100.123')
    expect(fp).toContain('final:110.789')
  })

  it('builds export payload with trace context', () => {
    const result = makeResult()
    const payload = buildEstimateMetaExportPayload(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      jobId: 'j1',
      jobName: 'job-a',
      sourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
      sourceFingerprint: TRACE_FIXTURE_SOURCE_FINGERPRINT,
    })
    expect(payload).not.toBeNull()
    expect(payload?.job.id).toBe('j1')
    expect(payload?.current.process).toBe('default')
    expect(payload?.trace.traceSchemaVersion).toBe(TRACE_SCHEMA_VERSION)
    expect(payload?.trace.sourceLabel).toBe(TRACE_FIXTURE_SOURCE_LABEL)
    expect(payload?.trace.sourceFingerprint).toBe(TRACE_FIXTURE_SOURCE_FINGERPRINT)
    expect(payload?.backend).toBe('mock')
    expect(payload?.estimateMeta.lengths.infill).toBeCloseTo(50.5678)
  })

  it('builds one-line compact summary for chat paste', () => {
    const result = makeResult()
    const line = buildEstimateMetaCompactSummary(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      jobName: 'job-a',
    })
    expect(line).toContain('[FDM estimate]')
    expect(line).toContain('job=job-a')
    expect(line).toContain('backend=mock')
    expect(line).toContain('layers=12')
    expect(line).toContain('finalSec=110.79')
  })

  it('includes new legacy fallback codes in summary/fingerprint/payload', () => {
    const result = makeResult()
    result.backend = 'kiri'
    result.fallback = { reasonCode: 'legacy_slice_timeout', message: 'legacy slice timeout after 100ms' }
    const fp = buildEstimateMetaFingerprint(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
    })
    const line = buildEstimateMetaCompactSummary(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      jobName: 'job-a',
    })
    const payload = buildEstimateMetaExportPayload(result, {
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
    })
    expect(fp).toContain('fallback:legacy_slice_timeout')
    expect(line).toContain('fallback=legacy_slice_timeout')
    expect(payload?.fallback?.reasonCode).toBe('legacy_slice_timeout')
  })
})
