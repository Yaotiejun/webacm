import type { CamJobResult } from '@/types/camJob'
import type { CamProcessConfig } from '@/types/cam'
import type { DiffItem } from './sessionSnapshotDiff'
import type { DiffActionLog } from './sessionDiffLog'
import { createJsonExportArtifact } from './exportArtifacts'
import { toCamJobResultDisplayJson } from '@/core/cam/camResultSerialize'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from '@/core/cam/camGcodeFingerprint'
import { canonicalizeCamProcessConfig } from '@/core/cam/camJobSummaryBridge'
import { serializeCamJobGeometry } from '@/core/cam/camGeometryPersist'
import { clonePlain } from '@/core/clonePlain'
import {
  TRACE_NONE_VALUE,
  TRACE_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION_KEY,
  TRACE_SOURCE_FINGERPRINT_KEY,
  TRACE_SOURCE_LABEL_KEY,
} from '@/core/traceKeys'

/** Bump when `migrationMeta` shape changes (e.g. new engineHints). */
export const CAM_SESSION_BUNDLE_SCHEMA_VERSION = 4

/** Inline full `gcodeText` in session bundle when under this size (migration round-trip). */
export const CAM_SESSION_BUNDLE_INLINE_GCODE_MAX_CHARS = 65_536

/** Canonical `profile.process` for session bundles (export JSON + import preview / apply). */
export function normalizeTargetRunProfileForSessionExport(profile: unknown): unknown {
  if (!profile || typeof profile !== 'object') return profile
  const raw = profile as Record<string, unknown>
  const proc = raw.process
  if (!proc || typeof proc !== 'object') return clonePlain(raw)
  const out = clonePlain(raw) as Record<string, unknown>
  out.process = canonicalizeCamProcessConfig(proc as CamProcessConfig)
  return out
}

export interface SessionBundleExportInput {
  targetRun: {
    id: string
    name: string
    createdAt: number
    geometry: unknown
    result: CamJobResult
    profile: unknown
  }
  selectedProfileName: string | null
  currentDevice: unknown
  currentProcessName: string | null
  currentOpsCount: number
  hasCurrentResult: boolean
  currentBackend: CamJobResult['backend'] | null
  diffTargetRunName: string | null
  diffItems: DiffItem[]
  diffLogs: DiffActionLog[]
  traceSourceLabel?: string | null
  traceSourceFingerprint?: string | null
}

export async function createCamSessionBundleExportArtifact(
  input: SessionBundleExportInput,
  now = new Date(),
): Promise<{ filename: string; json: string }> {
  const rawGcode = input.targetRun.result.gcodeText
  const legacyDebug = input.targetRun.result.legacyDebug
  let targetGcodeSha256: string | null = null
  if (rawGcode && rawGcode.length > 0) {
    targetGcodeSha256 = await sha256HexUtf8(normalizeCamGcodeForMigrationFingerprint(rawGcode))
  }

  const inlineGcode =
    rawGcode && rawGcode.length > 0 && rawGcode.length <= CAM_SESSION_BUNDLE_INLINE_GCODE_MAX_CHARS
      ? rawGcode
      : null
  const targetRunForExport = {
    ...input.targetRun,
    geometry: serializeCamJobGeometry(input.targetRun.geometry as import('@/types/camJob').CamJobInputGeometry),
    profile: normalizeTargetRunProfileForSessionExport(input.targetRun.profile),
    result: inlineGcode
      ? { ...input.targetRun.result, gcodeText: inlineGcode }
      : toCamJobResultDisplayJson(input.targetRun.result),
  }
  const payload = {
    exportedAt: now.toISOString(),
    trace: {
      [TRACE_SCHEMA_VERSION_KEY]: TRACE_SCHEMA_VERSION,
      [TRACE_SOURCE_LABEL_KEY]: input.traceSourceLabel ?? TRACE_NONE_VALUE,
      [TRACE_SOURCE_FINGERPRINT_KEY]: input.traceSourceFingerprint ?? TRACE_NONE_VALUE,
    },
    migrationMeta: {
      schemaVersion: CAM_SESSION_BUNDLE_SCHEMA_VERSION,
      source: 'shape_cam.clip-apps.cam-workspace',
      activeProfile: input.selectedProfileName ?? null,
      targetBackend: input.targetRun.result.backend,
      currentBackend: input.currentBackend,
      engineHints: {
        hasTargetGcode: !!input.targetRun.result.gcodeText,
        hasCurrentGcode: input.hasCurrentResult,
        diffItemCount: input.diffItems.length,
        targetGcodeByteLength: rawGcode?.length ?? 0,
        targetGcodeSha256,
        targetLegacyReady: legacyDebug?.ready ?? null,
        targetLegacyHasSlice: legacyDebug?.hasSlice ?? null,
        targetLegacyHasExport: legacyDebug?.hasExport ?? null,
        targetLegacyImportError: legacyDebug?.legacyImportErrorMessage ?? null,
      },
    },
    targetRun: targetRunForExport,
    currentContext: {
      selectedProfileName: input.selectedProfileName,
      device: input.currentDevice,
      processName: input.currentProcessName ?? null,
      opsCount: input.currentOpsCount,
      hasCurrentResult: input.hasCurrentResult,
    },
    diff: {
      targetRunName: input.diffTargetRunName ?? null,
      items: input.diffItems,
      logs: input.diffLogs,
    },
  }
  return createJsonExportArtifact('cam-session-bundle', payload, now)
}
