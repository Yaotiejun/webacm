import { sanitizeJobForWorker } from '@/api/slice'
import { computeVertexBounds3D } from '@/core/slicer/geometry'
import {
  buildFdmLegacyComparisonBundleText,
  FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION,
  resolveFdmLegacyComparisonSourceFingerprint,
} from '@/core/slicer/legacyFdmCompareText'
import { buildMockSliceResult, buildSliceInputMeta } from '@/core/slicer/mockSlicer'
import {
  resolveLegacyFdmMode,
  resolveLegacyPreviewSkipFallback,
  resolveLegacySliceTimeoutMs,
  shouldTryLegacyFdm,
} from '@/core/slicer/kiriRuntimePolicy'
import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'

export interface FdmMigrationCompleteResult {
  ok: boolean
  checks: {
    runtimePolicy: boolean
    sliceMeta: boolean
    mockSlice: boolean
    workerSanitize: boolean
    legacyCompareBundle: boolean
  }
  errors: string[]
}

export const GATE_VERTICES = new Float32Array([
  0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 1, 5, 0, 1, 0, 5, 1,
])

function sampleJob(): SliceJobPayload {
  return {
    id: 'fdm-gate',
    name: 'gate',
    createdAt: 1,
    updatedAt: 1,
    mode: 'FDM',
    device: 'default',
    process: 'default',
    material: 'pla',
    models: [
      {
        id: 'm1',
        name: 'cube.stl',
        ext: 'stl',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        bbox: {
          size: { x: 10, y: 10, z: 10 },
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 10, z: 10 },
        },
      },
    ],
    jobBounds: {
      size: { x: 10, y: 10, z: 10 },
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 10, z: 10 },
    },
  }
}

function sampleProcess(): FdmProcess {
  return {
    processName: 'default',
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceShells: 2,
    sliceTopLayers: 3,
    sliceBottomLayers: 3,
    sliceLineWidth: 0.4,
    sliceFillType: 'linear',
    sliceFillSparse: 0.2,
    sliceFillOverlap: 0.2,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    outputFeedrate: 60,
    outputSeekrate: 120,
    firstLayerRate: 20,
  } as FdmProcess
}

/**
 * clip-apps FDM shell migration gate (not a grip scoreboard row).
 * Live legacy slice: `VITE_KIRI_LEGACY_FDM=1` + worker slice path.
 */
export function evaluateFdmMigrationComplete(): FdmMigrationCompleteResult {
  const errors: string[] = []

  const mode = resolveLegacyFdmMode('auto')
  const runtimePolicy =
    shouldTryLegacyFdm(mode) &&
    resolveLegacySliceTimeoutMs('30000') === 30000 &&
    resolveLegacyPreviewSkipFallback({
      mode: '0',
      runtimeReady: false,
      runtimeError: null,
      hasSliceImpl: false,
      hasVertices: true,
    })?.reasonCode === 'legacy_disabled'
  if (!runtimePolicy) errors.push('kiriRuntimePolicy contract failed')

  const meta = buildSliceInputMeta(GATE_VERTICES)
  const b3 = computeVertexBounds3D(GATE_VERTICES)
  const sliceMeta =
    meta.vertexCount === 18 &&
    meta.triangleCount === 2 &&
    b3 != null &&
    meta.zSpanMm === 1 &&
    meta.planarBounds.maxX === 10
  if (!sliceMeta) errors.push('buildSliceInputMeta / bounds failed')

  const mock = buildMockSliceResult(sampleJob(), sampleProcess(), GATE_VERTICES)
  const mockSlice =
    mock.summary.layers > 0 &&
    mock.preview.layers.length > 0 &&
    mock.inputMeta?.triangleCount === 2
  if (!mockSlice) errors.push('buildMockSliceResult failed')

  const sanitized = sanitizeJobForWorker(sampleJob())
  const workerSanitize = sanitized.models.length === 1 && sanitized.id === 'fdm-gate'
  if (!workerSanitize) errors.push('sanitizeJobForWorker failed')

  const digest = [{ phase: 'slice', at: 1, message: 'gate' }]
  const fingerprint = resolveFdmLegacyComparisonSourceFingerprint({
    telemetryDigest: digest,
    jobSliceInputMeta: meta,
    jobLegacyDebug: null,
  })
  const bundle = buildFdmLegacyComparisonBundleText({
    liveLegacyDebug: { ready: true, hasSliceImpl: true, initErrorMessage: null, legacyImportErrorMessage: null },
    jobLegacyDebug: { ready: false, hasSliceImpl: false, initErrorMessage: null, legacyImportErrorMessage: null },
    fallbackReasonCode: null,
    telemetryDigest: digest,
    jobSliceInputMeta: meta,
    generatedAtIso: '2026-05-19T00:00:00.000Z',
    sourceFingerprint: fingerprint,
  })
  const legacyCompareBundle =
    bundle.includes(`schemaVersion=${FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`) &&
    bundle.includes('bundleKind=fdmLegacyComparison')
  if (!legacyCompareBundle) errors.push('legacyFdmCompareText bundle failed')

  return {
    ok: errors.length === 0,
    checks: {
      runtimePolicy,
      sliceMeta,
      mockSlice,
      workerSanitize,
      legacyCompareBundle,
    },
    errors,
  }
}
