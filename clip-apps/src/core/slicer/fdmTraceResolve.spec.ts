import { describe, expect, it } from 'vitest'
import { TRACE_NONE_VALUE, TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import {
  buildFdmEstimateMetaExportContext,
  buildFdmLegacyComparisonTrace,
  buildFdmTraceExportContext,
  buildFdmTraceHeaderLines,
  resolveFdmSourceLabel,
  resolveFdmTrace,
} from './fdmTraceResolve'

describe('slicer.fdmTraceResolve', () => {
  it('builds sourceLabel from selected job id/name', () => {
    expect(resolveFdmSourceLabel({ selectedJobId: 'job-1', selectedJobName: 'Benchy' })).toBe('job-1:Benchy')
    expect(resolveFdmSourceLabel({ selectedJobId: 'job-1', selectedJobName: null })).toBe('job-1')
  })

  it('returns <none> sourceLabel when job id is absent', () => {
    expect(resolveFdmSourceLabel({ selectedJobId: null, selectedJobName: 'Benchy' })).toBe(TRACE_NONE_VALUE)
  })

  it('resolves trace object with deterministic fingerprint', () => {
    const out = resolveFdmTrace({
      selectedJobId: 'job-1',
      selectedJobName: 'Benchy',
      telemetryDigest: [],
      jobSliceInputMeta: null,
      jobLegacyDebug: null,
    })
    expect(out.sourceLabel).toBe('job-1:Benchy')
    expect(out.sourceFingerprint).toMatch(/^fnv1a32:[0-9a-f]{8}$/)
  })

  it('builds trace header lines with stable order and job id', () => {
    const lines = buildFdmTraceHeaderLines({
      sourceLabel: 'job-1:Benchy',
      sourceFingerprint: 'fnv1a32:1234abcd',
      selectedJobId: 'job-1',
    })
    expect(lines).toEqual([
      `traceSchemaVersion=${TRACE_SCHEMA_VERSION}`,
      'sourceLabel=job-1:Benchy',
      'sourceFingerprint=fnv1a32:1234abcd',
      'jobId=job-1',
    ])
  })

  it('uses placeholders in trace header lines when values are absent', () => {
    const lines = buildFdmTraceHeaderLines({
      sourceLabel: null,
      sourceFingerprint: '',
      selectedJobId: null,
    })
    expect(lines).toEqual([
      `traceSchemaVersion=${TRACE_SCHEMA_VERSION}`,
      `sourceLabel=${TRACE_NONE_VALUE}`,
      `sourceFingerprint=${TRACE_NONE_VALUE}`,
      'jobId=unknown',
    ])
  })

  it('builds normalized trace export context for downstream exporters', () => {
    const context = buildFdmTraceExportContext({
      selectedJobId: ' job-1 ',
      selectedJobName: '  ',
      trace: {
        sourceLabel: 'job-1:Benchy',
        sourceFingerprint: 'fnv1a32:1234abcd',
      },
    })
    expect(context).toEqual({
      jobId: 'job-1',
      jobName: null,
      sourceLabel: 'job-1:Benchy',
      sourceFingerprint: 'fnv1a32:1234abcd',
    })
  })

  it('builds estimate export context from trace export context', () => {
    const context = buildFdmEstimateMetaExportContext({
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      traceContext: {
        jobId: 'job-1',
        jobName: 'Benchy',
        sourceLabel: 'job-1:Benchy',
        sourceFingerprint: 'fnv1a32:1234abcd',
      },
    })
    expect(context).toEqual({
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      jobId: 'job-1',
      jobName: 'Benchy',
      sourceLabel: 'job-1:Benchy',
      sourceFingerprint: 'fnv1a32:1234abcd',
    })
  })

  it('builds legacy comparison trace from shared trace export context', () => {
    const trace = buildFdmLegacyComparisonTrace({
      traceContext: {
        jobId: 'job-1',
        jobName: 'Benchy',
        sourceLabel: 'job-1:Benchy',
        sourceFingerprint: 'fnv1a32:1234abcd',
      },
    })
    expect(trace).toEqual({
      sourceLabel: 'job-1:Benchy',
      sourceFingerprint: 'fnv1a32:1234abcd',
    })
  })

  it('uses placeholders in legacy comparison trace when context values are empty', () => {
    const trace = buildFdmLegacyComparisonTrace({
      traceContext: {
        jobId: null,
        jobName: null,
        sourceLabel: '   ',
        sourceFingerprint: '',
      },
    })
    expect(trace).toEqual({
      sourceLabel: TRACE_NONE_VALUE,
      sourceFingerprint: TRACE_NONE_VALUE,
    })
  })
})
