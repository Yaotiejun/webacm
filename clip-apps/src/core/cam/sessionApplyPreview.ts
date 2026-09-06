import { countChangedFields, listChangedFieldKeys } from './sessionDiffDetector'
import { buildApplyConfirmMessage, buildChangedKeyDiffLines, buildOpsApplyDiffPreviewLine } from './sessionDiffPreview'
import { canonicalizeCamProcessConfig } from '@/core/cam/camJobSummaryBridge'
import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import { clonePlain } from '@/core/clonePlain'
import { stableJsonEqual } from '@/core/stableJson'

export type SessionApplyField = 'device' | 'process' | 'ops'

export interface SessionApplyPreview {
  changeCount: number
  changedKeys: string[]
  diffLines: string[]
  confirmMessage: string
}

export interface SessionApplyPreviewInput {
  field: SessionApplyField
  profile: {
    device?: Record<string, unknown>
    process?: Record<string, unknown> & { ops?: CamOperationInstance[] }
  }
  currentDevice?: Record<string, unknown>
  currentProcess?: Record<string, unknown>
  currentOps?: CamOperationInstance[]
  previewLimit: number
}

/** Strip `ops` then **`canonicalizeCamProcessConfig`** (same pipeline as apply / store / `runCamJob` / **`sessionSnapshotDiff`**). */
function normalizedProcessRecordForPreview(rec: Record<string, unknown>): Record<string, unknown> {
  const base = clonePlain(rec) as CamProcessConfig & Record<string, unknown>
  const { ops: _o, ...rest } = base
  return canonicalizeCamProcessConfig(rest as CamProcessConfig) as Record<string, unknown>
}

export function canBuildSessionApplyPreview(field: SessionApplyField, profile: SessionApplyPreviewInput['profile']): boolean {
  if (field === 'device') return !!profile.device
  if (field === 'process') return !!profile.process
  if (field === 'ops') return !!profile.process?.ops
  return false
}

export function buildSessionApplyPreview(input: SessionApplyPreviewInput): SessionApplyPreview {
  const { field, profile, currentDevice, currentProcess, currentOps, previewLimit } = input
  if (field === 'device') {
    return buildRecordApplyPreview('device', currentDevice ?? {}, profile.device ?? {}, previewLimit)
  }
  if (field === 'process') {
    const cur = normalizedProcessRecordForPreview((currentProcess ?? {}) as Record<string, unknown>)
    const inc = normalizedProcessRecordForPreview((profile.process ?? {}) as Record<string, unknown>)
    return buildRecordApplyPreview('process', cur, inc, previewLimit, ['ops'])
  }
  const nextOps = profile.process?.ops ?? []
  const curOps = currentOps ?? []
  const changed = !stableJsonEqual(curOps, nextOps)
  return buildOpsApplyPreview(curOps.length, nextOps.length, changed)
}

export function buildRecordApplyPreview(
  field: 'device' | 'process',
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  previewLimit: number,
  ignoreKeys: string[] = [],
): SessionApplyPreview {
  const changeCount = countChangedFields(current, incoming, ignoreKeys)
  const changedKeys = listChangedFieldKeys(current, incoming, ignoreKeys)
  const diffLines = buildChangedKeyDiffLines(current, incoming, changedKeys, previewLimit)
  const confirmMessage = buildApplyConfirmMessage(field, changeCount, changedKeys, diffLines)
  return { changeCount, changedKeys, diffLines, confirmMessage }
}

export function buildOpsApplyPreview(
  currentOpsLength: number,
  nextOpsLength: number,
  changed: boolean,
): SessionApplyPreview {
  const changeCount = changed ? 1 : 0
  const changedKeys = changeCount ? ['ops'] : []
  const diffLines = changeCount ? [buildOpsApplyDiffPreviewLine(currentOpsLength, nextOpsLength)] : []
  const confirmMessage = buildApplyConfirmMessage('ops', changeCount, changedKeys, diffLines)
  return { changeCount, changedKeys, diffLines, confirmMessage }
}

const SESSION_APPLY_ALL_FIELDS: SessionApplyField[] = ['device', 'process', 'ops']

/** Combined preview for one-shot session bundle apply (device + process + ops). */
export function buildSessionApplyAllPreview(
  input: Omit<SessionApplyPreviewInput, 'field'>,
): SessionApplyPreview {
  const parts = SESSION_APPLY_ALL_FIELDS.filter((field) => canBuildSessionApplyPreview(field, input.profile)).map((field) =>
    buildSessionApplyPreview({ ...input, field }),
  )
  const changeCount = parts.reduce((sum, p) => sum + p.changeCount, 0)
  const changedKeys = parts.flatMap((p) => p.changedKeys)
  const diffLines = parts.flatMap((p) => p.diffLines)
  const confirmMessage =
    parts.length === 0
      ? '会话包中无可应用的 device / process / ops 字段。'
      : ['将应用会话包字段：device、process、ops', ...diffLines, `共 ${changeCount} 处变更。确认？`].join('\n')
  return { changeCount, changedKeys, diffLines, confirmMessage }
}
