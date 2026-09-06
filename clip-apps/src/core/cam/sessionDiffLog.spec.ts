import { describe, expect, it } from 'vitest'
import { appendDiffActionLog, createDiffLogExportArtifact } from './sessionDiffLog'
import { TRACE_NONE_VALUE, TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'

describe('cam.sessionDiffLog', () => {
  it('appends and truncates logs by max limit', () => {
    const logs = appendDiffActionLog(
      [
        { time: '10:00:00', action: 'apply', field: 'a' },
        { time: '10:00:01', action: 'undo', field: 'b' },
      ],
      'redo',
      'c',
      new Date('2026-01-02T03:04:05.000Z'),
      2,
    )
    expect(logs).toHaveLength(2)
    expect(logs[0]?.action).toBe('redo')
  })

  it('creates export artifact with expected filename and payload', () => {
    const out = createDiffLogExportArtifact(
      'run-a',
      'id-a',
      [{ time: '10:00:00', action: 'apply', field: 'x' }],
      {
        sourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
        sourceFingerprint: TRACE_FIXTURE_SOURCE_FINGERPRINT,
      },
      new Date('2026-01-02T03:04:05.678Z'),
    )
    expect(out.filename).toBe('cam-diff-logs-2026-01-02T03-04-05-678Z.json')
    const parsed = JSON.parse(out.json) as {
      targetRunId: string
      trace: { traceSchemaVersion: number; sourceLabel: string; sourceFingerprint: string }
      logs: Array<{ field: string }>
    }
    expect(parsed.targetRunId).toBe('id-a')
    expect(parsed.trace.traceSchemaVersion).toBe(TRACE_SCHEMA_VERSION)
    expect(parsed.trace.sourceLabel).toBe(TRACE_FIXTURE_SOURCE_LABEL)
    expect(parsed.trace.sourceFingerprint).toBe(TRACE_FIXTURE_SOURCE_FINGERPRINT)
    expect(parsed.logs[0]?.field).toBe('x')
  })

  it('creates export artifact with trace placeholders when trace is omitted', () => {
    const out = createDiffLogExportArtifact('run-b', 'id-b', [], undefined, new Date('2026-01-02T03:04:05.000Z'))
    const parsed = JSON.parse(out.json) as {
      trace: { traceSchemaVersion: number; sourceLabel: string; sourceFingerprint: string }
    }
    expect(parsed.trace.traceSchemaVersion).toBe(TRACE_SCHEMA_VERSION)
    expect(parsed.trace.sourceLabel).toBe(TRACE_NONE_VALUE)
    expect(parsed.trace.sourceFingerprint).toBe(TRACE_NONE_VALUE)
  })
})
