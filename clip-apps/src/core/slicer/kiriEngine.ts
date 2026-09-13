// Kiri FDM slice engine — `fdm_slice` → `fdm_prepare` → `fdm_export` (preview-path fallback).

import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import type { SliceLayerPreview, SlicePath2D, SliceResult } from '@/api/slice'
import { polyToPath } from '@/core/slicer/previewConvert'
import { computeVertexBounds3D, pointsFromVertices } from '@/core/slicer/geometry'
import { estimateLayerCount, resolvePreviewLayers } from '@/core/slicer/previewPipeline'
import { buildKiriSettingsPayload } from '@/core/slicer/kiriSettingsAdapter'
import { runLegacyFdmSliceBridgeMulti, type LegacyFdmSliceBridgeResult } from '@/core/slicer/kiriLegacyBridge'
import { bindLegacyImpl, clearLegacyImplBindings, getKiriRuntimeState, runWithLegacySliceGuard } from '@/core/slicer/kiriRuntimeState'
import { loadLegacyFdmRuntime } from '@/core/slicer/kiriRuntimeLoader'
import { estimateSummaryFromPreview, syncSliceSummaryTimeFromEstimateMeta } from '@/core/slicer/previewEstimate'
import { buildSliceInputMeta, resolvePlanarBoundsFromVertices } from '@/core/slicer/mockSlicer'
import { buildSliceFallbackTelemetryEvent } from '@/core/slicer/sliceTelemetry'
import {
  resolveLegacyFdmMode,
  resolveLegacySliceTimeoutMs,
  type LegacyFdmMode,
} from '@/core/slicer/kiriRuntimePolicy'
import { buildLegacyGateSnapshot, resolveLegacyFailureTelemetry, resolveLegacyFallbackBeforeRun } from '@/core/slicer/kiriFallbackDecision'
import { buildFdmGcodeFromPreview } from '@/core/slicer/fdmExportGcodeFromPreview'
import { getStockFdmDevice, resolveStockFdmDeviceId } from '@/core/slicer/stock/fdm/stockFdmDevices'
import { fdmDeviceToLegacyProfile } from '@/core/slicer/normalizeFdmDevice'
import { collectFdmExportGcode } from '@/core/slicer/fdmExportCollect'
import { runLegacyFdmPrepare } from '@/core/slicer/fdmLegacyPrepare'
import {
  mergeSliceModelMeshes,
  normalizeSliceModelMeshes,
  type SliceGeometryInput,
  type SliceModelMesh,
} from '@/core/slicer/sliceModelMeshes'

interface KiriFdmRuntime {
  init(): Promise<void>
  isReady(): boolean
  getError(): Error | null
}

function getLegacyFdmMode(): LegacyFdmMode {
  return resolveLegacyFdmMode(import.meta.env.VITE_KIRI_LEGACY_FDM ?? 'auto')
}

function getLegacySliceTimeoutMs(): number {
  return resolveLegacySliceTimeoutMs(import.meta.env.VITE_KIRI_LEGACY_SLICE_TIMEOUT_MS)
}

const kiriRuntime: KiriFdmRuntime = {
  async init() {
    const state = getKiriRuntimeState()
    if (state.ready || state.initError) return
    if (state.initPromise) return state.initPromise

    state.initPromise = (async () => {
      try {
        const legacyFdmMode = getLegacyFdmMode()
        await loadLegacyFdmRuntime(legacyFdmMode, import.meta.url, {
          onBind: bindLegacyImpl,
          onClear: clearLegacyImplBindings,
          onWarn: (msg) => console.warn(msg),
        })

        // Even if legacy import fails or is disabled, mark runtime as ready
        state.ready = true
        state.initError = null
      } catch (e) {
        state.initError = e as Error
        // eslint-disable-next-line no-console
        console.error('[kiriEngine] runtime init failed', e)
      }
    })()

    return state.initPromise
  },
  isReady() {
    return getKiriRuntimeState().ready
  },
  getError() {
    return getKiriRuntimeState().initError
  },
}

/** App-boot preload (same as first `sliceWithKiri` init, without slicing). */
export async function preloadKiriFdmRuntime(): Promise<void> {
  await kiriRuntime.init()
}

// 开发调试辅助：在 worker 控制台查看 Kiri runtime 状态。
// 不参与任何业务分支判断，仅用于人工观察。
export function getKiriFdmLegacyHealth(): {
  ready: boolean
  initErrorMessage: string | null
  hasSliceImpl: boolean
  hasPrepareImpl: boolean
  hasExportImpl: boolean
  legacyImportErrorMessage: string | null
} {
  const state = getKiriRuntimeState()
  return {
    ready: state.ready,
    initErrorMessage: state.initError?.message ?? null,
    hasSliceImpl: typeof state.fdmSliceImpl === 'function',
    hasPrepareImpl: typeof state.fdmPrepareImpl === 'function',
    hasExportImpl: typeof state.fdmExportImpl === 'function',
    legacyImportErrorMessage: state.lastLegacyFdmImportError,
  }
}

function enrichFallbackWithLegacyImportHint(fallback: SliceResult['fallback']): SliceResult['fallback'] {
  if (!fallback) return null
  const hint = getKiriRuntimeState().lastLegacyFdmImportError
  if (!hint) return fallback
  return { ...fallback, message: `${fallback.message} — import: ${hint}` }
}

export function __debugKiriRuntimeStatus() {
  const state = getKiriRuntimeState()
  // eslint-disable-next-line no-console
  console.debug('[kiriEngine] runtime', {
    ready: state.ready,
    initError: state.initError?.message,
    hasImpl: !!state.fdmSliceImpl,
    hasPrepare: !!state.fdmPrepareImpl,
    hasExport: !!state.fdmExportImpl,
    legacyImportError: state.lastLegacyFdmImportError,
  })
}

function buildKiriSettings(job: SliceJobPayload, process: FdmProcess): any {
  const state = getKiriRuntimeState()
  const stock = getStockFdmDevice(resolveStockFdmDeviceId(job.device || ''))
  const deviceProfile = stock
    ? fdmDeviceToLegacyProfile(stock)
    : state.fakeDeviceProfile
  const primaryExtruder = job.models.find((m) => Number.isFinite(m.extruder))?.extruder ?? 0
  const payload = buildKiriSettingsPayload({
    process,
    modelCount: job.models.length,
    deviceProfile,
    controllerProfile: state.fakeControllerProfile,
  })
  const jb = job.jobBounds
  const bounds = jb
    ? {
        min: { x: jb.min.x, y: jb.min.y, z: jb.min.z },
        max: { x: jb.max.x, y: jb.max.y, z: jb.max.z },
      }
    : undefined
  return {
    ...payload,
    bounds,
    jobMeta: {
      ...(payload.jobMeta as Record<string, unknown>),
      primaryExtruder: Math.max(0, Math.floor(Number(primaryExtruder) || 0)),
    },
  }
}

function buildKiriVertices(vertices: Float32Array): Float32Array {
  // Skeleton passthrough.
  return vertices
}

function clonePreviewLayers(layers: SliceLayerPreview[]): SliceLayerPreview[] {
  return layers.map((l) => ({
    z: l.z,
    paths: l.paths.map((p) => ({ type: p.type, points: p.points.map((pt) => [pt[0], pt[1]]) })),
  }))
}

async function tryInjectKiriPerimeters(
  vertices: Float32Array,
  layers: SliceLayerPreview[],
): Promise<SliceLayerPreview[]> {
  // Use legacy geo slicer directly (no widget / self.kiri_worker required).
  const { geoSlice, newPoint } = await import('@/core/slicer/kiriLegacyGeo')

  const pts = pointsFromVertices(vertices, newPoint)
  if (!pts.length) return layers

  const vb = computeVertexBounds3D(vertices)
  if (!vb || vb.maxZ <= vb.minZ) {
    return layers
  }

  const zIndexes = layers.map((l) => Number(l.z.toFixed(3)))

  const out = await geoSlice(pts, {
    zMin: vb.minZ,
    zMax: vb.maxZ,
    indices: zIndexes,
    // legacy slicer expects Point[]; do not re-round here.
    // Avoid union/heal for now: we only want a perimeter-shaped hint.
    union: false,
    flat: false,
    // groups from sliceConnect will be polygons
    groupr: undefined,
  })

  const byZ = new Map<number, any>()
  for (const s of out?.slices || []) {
    const z = typeof s?.z === 'number' ? Number(s.z.toFixed(3)) : undefined
    if (z === undefined) continue
    byZ.set(z, s)
  }

  const nextLayers = clonePreviewLayers(layers)

  for (const layer of nextLayers) {
    const zKey = Number(layer.z.toFixed(3))
    const s = byZ.get(zKey)
    const groups = s?.groups
    if (!Array.isArray(groups) || groups.length === 0) continue

    const newPaths: SlicePath2D[] = []
    for (const g of groups) {
      const path = polyToPath(g, 'perimeter')
      if (path) newPaths.push(path)
    }

    if (newPaths.length) {
      // Replace perimeter paths only; keep other types if present.
      layer.paths = [...layer.paths.filter((p) => p.type !== 'perimeter'), ...newPaths]
    }
  }

  return nextLayers
}

async function runLegacyFdmSliceToPreview(settings: any, meshes: SliceModelMesh[]) {
  return runWithLegacySliceGuard(async () => {
    if (!kiriRuntime.isReady() || kiriRuntime.getError()) {
      throw new Error('kiri runtime not ready')
    }
    if (typeof getKiriRuntimeState().fdmSliceImpl !== 'function') {
      throw new Error('legacy fdm_slice implementation missing')
    }

    const { newPoint } = await import('@/core/slicer/kiriLegacyGeo')
    const widgetSpecs = []
    for (const mesh of meshes) {
      const vb = computeVertexBounds3D(mesh.vertices)
      if (!vb) continue
      const pts = pointsFromVertices(mesh.vertices, newPoint)
      if (!pts.length) continue
      widgetSpecs.push({
        id: mesh.modelId || `mesh-${widgetSpecs.length}`,
        vb,
        points: pts,
        extruder: Number.isFinite(mesh.extruder) ? Math.max(0, Math.floor(Number(mesh.extruder))) : 0,
        paint: Array.isArray(mesh.paint) ? mesh.paint : undefined,
      })
    }
    if (!widgetSpecs.length) {
      throw new Error('no mesh points for legacy slice')
    }

    let fdmSliceAllImpl: ((settings: any, onupdate?: Function) => void) | undefined
    try {
      const boot = await import('@/core/slicer/kiriLegacyFdmBootstrap')
      if (typeof boot.sliceAll === 'function') fdmSliceAllImpl = boot.sliceAll
    } catch {
      fdmSliceAllImpl = undefined
    }

    return runLegacyFdmSliceBridgeMulti({
      settings,
      widgets: widgetSpecs,
      fdmSliceImpl: getKiriRuntimeState().fdmSliceImpl!,
      workerScope: self as any,
      timeoutMs: getLegacySliceTimeoutMs(),
      fdmSliceAllImpl,
    })
  })
}

// After legacy `fdm_slice`, prefer `fdm_prepare`→`fdm_export`; fall back to preview-path G-code.
export async function sliceWithKiri(
  job: SliceJobPayload,
  geometry: SliceGeometryInput,
  process: FdmProcess,
): Promise<SliceResult> {
  // Load runtime skeleton (ignore failure; keep placeholder behavior).
  await kiriRuntime.init()
  __debugKiriRuntimeStatus()

  const meshes = normalizeSliceModelMeshes(geometry, job)
  const vertices = mergeSliceModelMeshes(meshes)
  const settings = buildKiriSettings(job, process)

  // Try to run legacy Kiri FDM and convert widget.slices → preview.
  // Any failure keeps placeholder behavior.
  let legacyBridge: LegacyFdmSliceBridgeResult | null = null
  let legacyPreview: { bounds: { minX: number; minY: number; maxX: number; maxY: number }; layers: SliceLayerPreview[] } | null =
    null
  let fallback: SliceResult['fallback'] = null
  const legacyMode = getLegacyFdmMode()
  const legacyGate = buildLegacyGateSnapshot({
    mode: legacyMode,
    runtimeReady: kiriRuntime.isReady(),
    runtimeError: kiriRuntime.getError(),
    hasSliceImpl: typeof getKiriRuntimeState().fdmSliceImpl === 'function',
    hasVertices: !!vertices?.length,
  })
  const decision = resolveLegacyFallbackBeforeRun(legacyGate)
  fallback = decision.fallback
  if (decision.shouldRunLegacy) {
    try {
      legacyBridge = await runLegacyFdmSliceToPreview(settings, meshes)
      legacyPreview = legacyBridge
      fallback = null
    } catch (e) {
      const telemetry = resolveLegacyFailureTelemetry(e)
      fallback = telemetry.fallback
      const fallbackEvent = buildSliceFallbackTelemetryEvent(fallback)
      // eslint-disable-next-line no-console
      console.warn('[kiriEngine] legacy FDM slice failed, keeping placeholder', {
        code: telemetry.warningCode,
        event: fallbackEvent,
        message: (e as any)?.message ?? String(e),
      })
    }
  }

  // Call adapters once so future real Kiri wiring is localized here.
  void buildKiriVertices(vertices)

  if (!vertices?.length) {
    throw new Error('missing vertices')
  }

  const defaultPlaceholderBounds = { minX: -50, minY: -50, maxX: 50, maxY: 50 }
  const fromVerts = resolvePlanarBoundsFromVertices(vertices)
  const placeholderBounds =
    fromVerts.maxX > fromVerts.minX && fromVerts.maxY > fromVerts.minY ? fromVerts : defaultPlaceholderBounds
  const layerHeight = process.sliceHeight || 0.2

  const vb = computeVertexBounds3D(vertices)
  const zSpan = vb ? Math.max(1, vb.maxZ - vb.minZ) : 20
  const layersCount = estimateLayerCount(layerHeight, job.models.map((m) => m.bbox.size.z), zSpan)

  const resolvedPreview = await resolvePreviewLayers({
    legacyPreview,
    placeholderBounds,
    layersCount,
    layerHeight,
    process,
    legacyMode,
    vertices,
    injectPerimeters: tryInjectKiriPerimeters,
  })
  const summary = syncSliceSummaryTimeFromEstimateMeta(estimateSummaryFromPreview(resolvedPreview.layers, process))

  let gcodeText: string | undefined
  let gcodeSource: SliceResult['gcodeSource']

  const state = getKiriRuntimeState()
  const prepareWidgets =
    legacyBridge?.widgets?.length
      ? legacyBridge.widgets
      : legacyBridge?.widget
        ? [legacyBridge.widget]
        : []
  if (
    prepareWidgets.length > 0 &&
    typeof state.fdmExportImpl === 'function' &&
    prepareWidgets.some((w) => Array.isArray(w?.slices) && w.slices.length > 0)
  ) {
    try {
      const prepared = await runLegacyFdmPrepare(
        prepareWidgets,
        legacyBridge!.settings,
        undefined,
        self as any,
      )
      const collected = collectFdmExportGcode(state.fdmExportImpl, prepared.print)
      if (collected.gcodeText && /G[01]\b/i.test(collected.gcodeText)) {
        gcodeText = collected.gcodeText
        gcodeSource = 'legacy-fdm-export'
        if (summary.filamentMm <= 0) {
          const m = collected.gcodeText.match(/filament used:\s*([\d.]+)/i)
          if (m) summary.filamentMm = Number(m[1]) || summary.filamentMm
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[kiriEngine] legacy fdm_prepare/export failed, using preview-path G-code', {
        message: (e as any)?.message ?? String(e),
      })
    }
  }

  if (!gcodeText) {
    const exported = buildFdmGcodeFromPreview(resolvedPreview, {
      process,
      deviceName: job.device,
      jobName: job.name,
    })
    gcodeText = exported.gcodeText
    gcodeSource = exported.source
    if (exported.source === 'legacy-preview-path' && summary.filamentMm <= 0 && exported.extrudedMm > 0) {
      summary.filamentMm = Math.round(exported.extrudedMm * 10) / 10
    }
  }

  return {
    summary,
    preview: resolvedPreview,
    backend: 'kiri',
    fallback: enrichFallbackWithLegacyImportHint(fallback),
    inputMeta: buildSliceInputMeta(vertices),
    legacyDebug: getKiriFdmLegacyHealth(),
    gcodeText,
    gcodeSource,
  }
}
