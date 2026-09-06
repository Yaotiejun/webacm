import { describe, expect, it } from 'vitest'
import {
  appendDiagnosticsSnapshotComments,
  appendLegacyFdmDebugComments,
  appendSliceInputMetaComments,
  appendSliceInputMetaPairForGcode,
  appendTelemetryDigestComments,
  buildTelemetryDigestText,
  formatTelemetryDigestEntry,
  sliceInputMetaRoughlyEqual,
} from './telemetryComment'

describe('slicer.telemetryComment', () => {
  it('appends telemetry digest block with newline-sanitized message', () => {
    const lines = ['; header']
    appendTelemetryDigestComments(lines, [
      {
        kind: 'slicer_fallback',
        code: 'slicer_legacy_slice_failed',
        reasonCode: 'legacy_slice_failed',
        message: 'line1\nline2',
        ts: Date.parse('2026-04-30T13:00:00.000Z'),
      },
    ])
    expect(lines).toContain('; fallbackTelemetryDigestStart')
    expect(lines).toContain('; fallbackTelemetryDigestEnd')
    expect(lines.some((line) => line.includes('line1 line2'))).toBe(true)
  })

  it('keeps lines unchanged for empty digest', () => {
    const lines = ['; header']
    appendTelemetryDigestComments(lines, [])
    expect(lines).toEqual(['; header'])
  })

  it('formats digest entry for plain-text diagnostics', () => {
    const out = formatTelemetryDigestEntry({
      kind: 'slicer_fallback',
      code: 'slicer_legacy_slice_timeout',
      reasonCode: 'legacy_slice_timeout',
      message: 'line1\r\nline2',
      ts: Date.parse('2026-04-30T13:00:00.000Z'),
    })
    expect(out).toContain('slicer_legacy_slice_timeout / legacy_slice_timeout')
    expect(out.includes('line1 line2')).toBe(true)
  })

  it('appends diagnostics snapshot as G-code comments with newline flattening', () => {
    const lines: string[] = ['; header']
    appendDiagnosticsSnapshotComments(lines, 'a\nb\r\nc', { maxLines: 10 })
    expect(lines).toContain('; slicerDiagnosticsSnapshotStart')
    expect(lines).toContain('; slicerDiagnosticsSnapshotEnd')
    expect(lines).toContain('; a')
    expect(lines).toContain('; b')
    expect(lines).toContain('; c')
  })

  it('skips empty diagnostics snapshot', () => {
    const lines: string[] = ['; header']
    appendDiagnosticsSnapshotComments(lines, '   \n')
    expect(lines).toEqual(['; header'])
  })

  it('truncates long diagnostics snapshots', () => {
    const lines: string[] = []
    appendDiagnosticsSnapshotComments(lines, '1\n2\n3\n4', { maxLines: 2 })
    expect(lines.filter((l) => l.startsWith('; ') && !l.includes('Start') && !l.includes('End'))).toEqual([
      '; 1',
      '; 2',
      '; ... (2 more lines truncated)',
    ])
  })

  it('appends sliceInputMeta as compact G-code comments', () => {
    const lines: string[] = []
    appendSliceInputMetaComments(
      lines,
      {
        vertexCount: 9,
        triangleCount: 1,
        planarBounds: { minX: 0, minY: 0, maxX: 10, maxY: 5 },
        zSpanMm: 2.25,
      },
      'Live',
    )
    expect(lines).toContain('; sliceInputMetaLiveStart')
    expect(lines.some((l) => l.includes('tri=1'))).toBe(true)
    expect(lines).toContain('; sliceInputMetaLiveEnd')
  })

  it('appendSliceInputMetaPairForGcode skips duplicate Job block when equal to Live', () => {
    const meta = {
      vertexCount: 9,
      triangleCount: 1,
      planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      zSpanMm: 1,
    }
    expect(sliceInputMetaRoughlyEqual(meta, meta)).toBe(true)
    const lines: string[] = []
    appendSliceInputMetaPairForGcode(lines, meta, meta)
    expect(lines.filter((l) => l.includes('sliceInputMetaJob'))).toHaveLength(0)
  })

  it('appendSliceInputMetaPairForGcode emits Job when saved differs from Live', () => {
    const live = {
      vertexCount: 9,
      triangleCount: 1,
      planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      zSpanMm: 1,
    }
    const job = { ...live, triangleCount: 2 }
    const lines: string[] = []
    appendSliceInputMetaPairForGcode(lines, live, job)
    expect(lines.some((l) => l.includes('sliceInputMetaJobStart'))).toBe(true)
  })

  it('builds unified digest text with optional header', () => {
    const out = buildTelemetryDigestText(
      [
        {
          kind: 'slicer_fallback',
          code: 'slicer_legacy_slice_timeout',
          reasonCode: 'legacy_slice_timeout',
          message: 'timeout',
          ts: Date.parse('2026-04-30T13:00:00.000Z'),
        },
      ],
      { header: 'jobId=j1' },
    )
    expect(out.startsWith('jobId=j1\n')).toBe(true)
    expect(out).toContain('slicer_legacy_slice_timeout / legacy_slice_timeout')
  })

  it('appends legacy FDM debug comments and truncates multiline errors', () => {
    const lines: string[] = []
    appendLegacyFdmDebugComments(lines, {
      ready: false,
      hasSliceImpl: true,
      initErrorMessage: 'init failed\nline2',
      legacyImportErrorMessage: 'import failed\r\nline2',
    })
    expect(lines).toContain('; legacyFdmReady=0')
    expect(lines).toContain('; legacyFdmHasSliceImpl=1')
    expect(lines.some((l) => l.includes('legacyFdmInitError=init failed line2'))).toBe(true)
    expect(lines.some((l) => l.includes('legacyFdmImportError=import failed line2'))).toBe(true)
  })
})
