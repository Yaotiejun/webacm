import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import { canonicalizeCamProcessConfig, stripLegacyCamProcessKeys } from '@/core/cam/camJobSummaryBridge'
import { clonePlain } from '@/core/clonePlain'

export type SessionApplyField = 'device' | 'process' | 'ops'

export interface SessionApplyTargetProfile {
  device?: Record<string, unknown>
  process?: Record<string, unknown> & { ops?: CamOperationInstance[] }
}

export interface SessionApplyMutableState {
  device: Record<string, unknown>
  process: Record<string, unknown>
  localOps: CamOperationInstance[] | null
}

export function applySessionFieldToState(
  field: SessionApplyField,
  profile: SessionApplyTargetProfile,
  state: SessionApplyMutableState,
): { applied: boolean } {
  if (field === 'device' && profile.device) {
    Object.assign(state.device, clonePlain(profile.device))
    return { applied: true }
  }
  if (field === 'process' && profile.process) {
    const snapshotOps = profile.process.ops
    const normalized = canonicalizeCamProcessConfig(profile.process as CamProcessConfig)
    const clonedProcess = clonePlain(normalized) as Record<string, unknown>
    delete clonedProcess.ops
    const merged = { ...(state.process as Record<string, unknown>), ...clonedProcess }
    const cleaned = stripLegacyCamProcessKeys(merged as CamProcessConfig) as Record<string, unknown>
    for (const k of Object.keys(state.process)) {
      delete (state.process as Record<string, unknown>)[k]
    }
    Object.assign(state.process, cleaned)
    // Snapshot process without an `ops` property ⇒ process-only apply; drop staged local ops.
    if (!snapshotOps) state.localOps = null
    return { applied: true }
  }
  if (field === 'ops') {
    state.localOps = clonePlain(profile.process?.ops ?? [])
    return { applied: true }
  }
  return { applied: false }
}
