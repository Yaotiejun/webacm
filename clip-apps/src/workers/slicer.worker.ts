import '@/core/slicer/kiriLegacyPolyfills'
import type { SliceJobPayload } from '@/types/job'
import type { SliceResult } from '@/api/slice'
import type { FdmProcess } from '@/types/process'
import type { SliceBackendKind } from '@/api/slice-backend'
import { getKiriFdmLegacyHealth, sliceWithKiri } from '@/core/slicer/kiriEngine'
import { buildMockSliceResult, withDerivedJobBounds } from '@/core/slicer/mockSlicer'
import { resolveKiriFallbackReason } from '@/core/slicer/kiriFallbackReason'
import { buildSliceFallbackTelemetryEvent } from '@/core/slicer/sliceTelemetry'
import {
  mergeSliceModelMeshes,
  normalizeSliceModelMeshes,
  type SliceModelMesh,
} from '@/core/slicer/sliceModelMeshes'

async function doSlice(job: SliceJobPayload, proc: FdmProcess, vertices: Float32Array): Promise<SliceResult> {
  await new Promise((r) => setTimeout(r, 300))
  return buildMockSliceResult(job, proc, vertices)
}

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data as {
    job: SliceJobPayload
    vertices?: Float32Array
    modelMeshes?: SliceModelMesh[]
    process: FdmProcess
    backendKind: SliceBackendKind
  }
  const { job, process, backendKind } = data
  try {
    const meshes = normalizeSliceModelMeshes(
      data.modelMeshes?.length ? data.modelMeshes : data.vertices ?? new Float32Array(),
      job,
    )
    const vertices = mergeSliceModelMeshes(meshes)
    if (!vertices.length) {
      throw new Error('missing vertices for slicing')
    }

    if (backendKind === 'kiri') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[slicer.worker] starting Kiri slice', {
          models: job.models.length,
          meshParts: meshes.length,
          vertices: vertices.length,
        })
        const result = await sliceWithKiri(job, meshes, process)
        // eslint-disable-next-line no-console
        console.debug('[slicer.worker] finished Kiri slice', {
          layers: result.summary.layers,
        })
        result.backend = 'kiri'
        ;(self as any).postMessage({ ok: true, result, backend: 'kiri' })
        return
      } catch (e) {
        const legacyFdmMode = String(import.meta.env.VITE_KIRI_LEGACY_FDM ?? 'auto')
        const fallback = resolveKiriFallbackReason({ err: e, legacyFdmMode })
        const telemetry = buildSliceFallbackTelemetryEvent(fallback)
        if (telemetry) {
          ;(self as any).postMessage({ kind: 'telemetry', event: telemetry })
          // eslint-disable-next-line no-console
          console.warn('[slicer.worker] kiri fallback telemetry', telemetry)
        }
        if (legacyFdmMode === '1') {
          ;(self as any).postMessage({ ok: false, error: `Kiri slicing failed: ${(e as Error).message || 'unknown error'}` })
          return
        }
        // auto mode: keep job flow alive by falling back to mock backend
        const fallbackJob = withDerivedJobBounds(job, vertices)
        const result = await doSlice(fallbackJob, process, vertices)
        result.backend = 'mock'
        result.fallback = fallback
        result.legacyDebug = getKiriFdmLegacyHealth()
        ;(self as any).postMessage({ ok: true, result, backend: 'mock' })
        return
      }
    }

    const mockJob = withDerivedJobBounds(job, vertices)
    const result = await doSlice(mockJob, process, vertices)
    result.backend = 'mock'
    ;(self as any).postMessage({ ok: true, result, backend: 'mock' })
  } catch (e) {
    ;(self as any).postMessage({ ok: false, error: (e as Error).message })
  }
}
