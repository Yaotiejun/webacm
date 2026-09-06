import { describe, expect, it } from 'vitest'
import {
  TRACE_NONE_VALUE,
  buildTraceCommentLines,
  buildTraceHeaderLines,
  formatTraceLine,
} from './traceKeys'
import {
  TRACE_FIXTURE_COMMENT_LINES,
  TRACE_FIXTURE_HEADER_LINES,
  TRACE_FIXTURE_SOURCE_FINGERPRINT,
  TRACE_FIXTURE_SOURCE_LABEL,
} from './traceFixtures'

describe('core.traceKeys', () => {
  it('formatTraceLine joins key and value with equals', () => {
    expect(formatTraceLine('sourceLabel', 'job-1')).toBe('sourceLabel=job-1')
  })

  it('TRACE_NONE_VALUE is stable sentinel for missing trace source', () => {
    expect(TRACE_NONE_VALUE).toBe('<none>')
  })

  it('builds trace header lines in stable order', () => {
    const lines = buildTraceHeaderLines(TRACE_FIXTURE_SOURCE_LABEL, TRACE_FIXTURE_SOURCE_FINGERPRINT)
    expect(lines).toEqual(TRACE_FIXTURE_HEADER_LINES)
  })

  it('builds trace comment lines for gcode headers', () => {
    const lines = buildTraceCommentLines(TRACE_FIXTURE_SOURCE_LABEL, TRACE_FIXTURE_SOURCE_FINGERPRINT)
    expect(lines).toEqual(TRACE_FIXTURE_COMMENT_LINES)
  })
})
