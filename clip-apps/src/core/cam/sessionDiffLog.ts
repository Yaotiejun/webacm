export type DiffActionType = 'apply' | 'undo' | 'redo'
import { createJsonExportArtifact } from './exportArtifacts'
import {
  TRACE_NONE_VALUE,
  TRACE_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION_KEY,
  TRACE_SOURCE_FINGERPRINT_KEY,
  TRACE_SOURCE_LABEL_KEY,
} from '@/core/traceKeys'

export interface DiffActionLog {
  time: string
  action: DiffActionType
  field: string
}

export const DEFAULT_MAX_DIFF_LOGS = 30

export function appendDiffActionLog(
  logs: DiffActionLog[],
  action: DiffActionType,
  field: string,
  now = new Date(),
  maxLogs = DEFAULT_MAX_DIFF_LOGS,
): DiffActionLog[] {
  const next = [{ time: now.toLocaleTimeString(), action, field }, ...logs]
  return next.slice(0, maxLogs)
}

export function createDiffLogExportArtifact(
  targetRunName: string | null,
  targetRunId: string | null,
  logs: DiffActionLog[],
  trace?: {
    sourceLabel?: string | null
    sourceFingerprint?: string | null
  },
  now = new Date(),
): { filename: string; json: string } {
  const payload = {
    exportedAt: now.toISOString(),
    targetRunName,
    targetRunId,
    trace: {
      [TRACE_SCHEMA_VERSION_KEY]: TRACE_SCHEMA_VERSION,
      [TRACE_SOURCE_LABEL_KEY]: trace?.sourceLabel ?? TRACE_NONE_VALUE,
      [TRACE_SOURCE_FINGERPRINT_KEY]: trace?.sourceFingerprint ?? TRACE_NONE_VALUE,
    },
    logs,
  }
  return createJsonExportArtifact('cam-diff-logs', payload, now)
}
