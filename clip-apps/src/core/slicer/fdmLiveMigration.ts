import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import { GATE_VERTICES } from '@/core/slicer/fdmMigrationComplete'
import { getKiriFdmLegacyHealth, preloadKiriFdmRuntime, sliceWithKiri } from '@/core/slicer/kiriEngine'
import { shouldTryLegacyFdm, resolveLegacyFdmMode } from '@/core/slicer/kiriRuntimePolicy'

export type FdmLiveMigrationPhase = 'skipped' | 'probe-failed' | 'live-passed' | 'live-failed'

export interface FdmLiveMigrationResult {
  ok: boolean
  phase: FdmLiveMigrationPhase
  legacyReady: boolean
  hasSliceImpl: boolean
  layerCount: number
  fallbackReason: string | null
  detail: string
  errors: string[]
}

function sampleFdmSliceJob(): SliceJobPayload {
  return {
    id: 'fdm-live-gate',
    name: 'cube',
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

function sampleFdmProcess(): FdmProcess {
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
 * Phase 3 live — legacy FDM slice path (`sliceWithKiri`).
 * Requires jsdom + `VITE_KIRI_LEGACY_FDM=1` for real legacy; otherwise validates placeholder path.
 */
export async function evaluateFdmLiveMigration(): Promise<FdmLiveMigrationResult> {
  const requireLive = process.env.FDM_LIVE_MIGRATION === '1'
  if (!requireLive) {
    return {
      ok: true,
      phase: 'skipped',
      legacyReady: false,
      hasSliceImpl: false,
      layerCount: 0,
      fallbackReason: null,
      detail: 'set FDM_LIVE_MIGRATION=1 then npm run soak:fdm:live',
      errors: [],
    }
  }

  const legacyMode = resolveLegacyFdmMode(
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_KIRI_LEGACY_FDM != null
      ? import.meta.env.VITE_KIRI_LEGACY_FDM
      : process.env.VITE_KIRI_LEGACY_FDM ?? 'auto',
  )
  if (!shouldTryLegacyFdm(legacyMode)) {
    return {
      ok: false,
      phase: 'probe-failed',
      legacyReady: false,
      hasSliceImpl: false,
      layerCount: 0,
      fallbackReason: 'legacy_disabled',
      detail: 'VITE_KIRI_LEGACY_FDM=0',
      errors: ['FDM legacy disabled by VITE_KIRI_LEGACY_FDM'],
    }
  }

  await preloadKiriFdmRuntime()
  const health = getKiriFdmLegacyHealth()
  const result = await sliceWithKiri(sampleFdmSliceJob(), GATE_VERTICES, sampleFdmProcess())
  const layerCount = result.preview.layers.length
  const fallbackReason = result.fallback?.reasonCode ?? null
  const errors: string[] = []

  if (!health.ready) errors.push(health.initErrorMessage ?? 'runtime not ready')
  if (!health.hasSliceImpl) errors.push('legacy fdm_slice impl missing')
  if (layerCount < 1) errors.push('no preview layers')
  if (fallbackReason === 'legacy_disabled') errors.push('legacy slice disabled')

  const legacyRan = health.hasSliceImpl && fallbackReason == null
  if (!legacyRan && health.hasSliceImpl === false) {
    errors.push('legacy fdm_slice not loaded — placeholder preview only')
  }
  if (legacyRan && (!result.gcodeText || !/G[01]\b/i.test(result.gcodeText))) {
    errors.push('legacy G-code missing motion moves')
  }
  if (
    legacyRan &&
    health.hasPrepareImpl &&
    health.hasExportImpl &&
    result.gcodeSource !== 'legacy-fdm-export' &&
    result.gcodeSource !== 'legacy-preview-path'
  ) {
    errors.push(`unexpected gcodeSource=${result.gcodeSource ?? 'none'}`)
  }

  const ok = layerCount >= 1 && errors.every((e) => !e.includes('runtime not ready'))

  return {
    ok,
    phase: ok ? 'live-passed' : 'live-failed',
    legacyReady: health.ready,
    hasSliceImpl: health.hasSliceImpl,
    layerCount,
    fallbackReason,
    detail: legacyRan
      ? `legacy slice ok (${layerCount} layers, gcode=${result.gcodeSource ?? 'none'})`
      : `placeholder/fallback path (${fallbackReason ?? 'none'}, ${layerCount} layers)`,
    errors,
  }
}
