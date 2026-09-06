import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import { clonePlain } from '@/core/clonePlain'

/**
 * Diff row key: `deviceName`, synthetic `ops` summary rows, or any canonical
 * `CamProcessConfig` field name (recent-run snapshot compare / per-field apply).
 */
export type DiffKey = string

export interface DiffApplySource {
  deviceName: string
  process: CamProcessConfig
}

export interface DiffApplyMutableState {
  device: { deviceName?: string }
  process: CamProcessConfig
  localOps: CamOperationInstance[] | null
}

export function applyDiffKeyToState(
  key: DiffKey,
  source: DiffApplySource,
  state: DiffApplyMutableState,
): { applied: boolean; resetSelectedOp: boolean } {
  const sp = source.process as Record<string, unknown>
  if (key === 'deviceName') {
    state.device.deviceName = source.deviceName
    return { applied: true, resetSelectedOp: false }
  }
  if (key === 'ops') {
    const ops = sp.ops as CamOperationInstance[] | undefined
    state.localOps = (ops ?? []).map((op) => ({ ...op }))
    return { applied: true, resetSelectedOp: true }
  }
  const proc = state.process as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(sp, key)) {
    delete proc[key]
    return { applied: true, resetSelectedOp: false }
  }
  const v = sp[key]
  proc[key] = v !== null && typeof v === 'object' ? clonePlain(v as object) : v
  return { applied: true, resetSelectedOp: false }
}
