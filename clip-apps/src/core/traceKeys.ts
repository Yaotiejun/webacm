export const TRACE_SCHEMA_VERSION = 1
export const TRACE_SCHEMA_VERSION_KEY = 'traceSchemaVersion'
export const TRACE_SOURCE_LABEL_KEY = 'sourceLabel'
export const TRACE_SOURCE_FINGERPRINT_KEY = 'sourceFingerprint'
export const TRACE_NONE_VALUE = '<none>'

export function formatTraceLine(key: string, value: string): string {
  return `${key}=${value}`
}

export function buildTraceHeaderLines(sourceLabel: string, sourceFingerprint: string): string[] {
  return [
    formatTraceLine(TRACE_SCHEMA_VERSION_KEY, String(TRACE_SCHEMA_VERSION)),
    formatTraceLine(TRACE_SOURCE_LABEL_KEY, sourceLabel),
    formatTraceLine(TRACE_SOURCE_FINGERPRINT_KEY, sourceFingerprint),
  ]
}

export function buildTraceCommentLines(
  sourceLabel: string,
  sourceFingerprint: string,
  commentPrefix = '; ',
): string[] {
  return buildTraceHeaderLines(sourceLabel, sourceFingerprint).map((line) => `${commentPrefix}${line}`)
}
