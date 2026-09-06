import { describe, expect, it } from 'vitest'
import {
  TRACE_FIXTURE_COMMENT_LINES,
  TRACE_FIXTURE_HEADER_LINES,
  TRACE_FIXTURE_SOURCE_FINGERPRINT,
  TRACE_FIXTURE_SOURCE_LABEL,
} from './traceFixtures'
import { buildTraceCommentLines, buildTraceHeaderLines } from './traceKeys'

describe('core.traceFixtures', () => {
  it('matches buildTraceHeaderLines for the canonical fixture label + fingerprint', () => {
    expect(TRACE_FIXTURE_HEADER_LINES).toEqual(
      buildTraceHeaderLines(TRACE_FIXTURE_SOURCE_LABEL, TRACE_FIXTURE_SOURCE_FINGERPRINT),
    )
  })

  it('matches buildTraceCommentLines with default G-code comment prefix', () => {
    expect(TRACE_FIXTURE_COMMENT_LINES).toEqual(
      buildTraceCommentLines(TRACE_FIXTURE_SOURCE_LABEL, TRACE_FIXTURE_SOURCE_FINGERPRINT),
    )
  })

  it('prefixes every fixture comment line for G-code embedding', () => {
    for (const line of TRACE_FIXTURE_COMMENT_LINES) {
      expect(line.startsWith('; ')).toBe(true)
    }
  })
})
