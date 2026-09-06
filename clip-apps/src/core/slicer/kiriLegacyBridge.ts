import type { SliceLayerPreview } from '@/api/slice'
import type { VertexBounds3D } from '@/core/slicer/geometry'
import {
  buildLegacyFdmControllerProfile,
  buildLegacyFdmDeviceProfile,
  buildLegacyWidgetBoundingBox,
} from '@/core/slicer/kiriLegacyFdmDefaults'
import type { FdmProcess } from '@/types/process'
import { convertWidgetSlicesToLayers } from '@/core/slicer/previewConvert'

export interface LegacyPreviewData {
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  layers: SliceLayerPreview[]
}

function createFakeWidget(vb: VertexBounds3D, pts: any[]) {
  const bbox = buildLegacyWidgetBoundingBox(vb)
  const fakeWidget = {
    track: {
      synth: false,
      support: false,
      zcut: 0,
      box: { w: vb.maxX - vb.minX, h: vb.maxY - vb.minY },
      pos: { x: 0, y: 0 },
    },
    anno: { extruder: 0 },
    getBoundingBox() {
      return bbox
    },
    getPoints() {
      return pts
    },
    clearSlices() {},
    setTopZ() {},
    belt: undefined,
    group: [] as any[],
    slices: [] as any[],
    shadow: undefined,
  }
  fakeWidget.group[0] = fakeWidget
  return fakeWidget
}

function ensureLegacyFdmSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const process = settings.process as FdmProcess | undefined
  if (!process) return settings
  return {
    ...settings,
    device: buildLegacyFdmDeviceProfile(
      process,
      settings.device as Record<string, unknown> | null | undefined,
    ),
    controller: buildLegacyFdmControllerProfile(
      settings.controller as Record<string, unknown> | null | undefined,
    ),
  }
}

export async function runLegacyFdmSliceBridge(input: {
  settings: any
  vb: VertexBounds3D
  points: any[]
  fdmSliceImpl: (settings: any, widget: any, onupdate: Function, ondone: Function) => any
  workerScope: any
  timeoutMs?: number
}): Promise<LegacyPreviewData> {
  const { vb, points, fdmSliceImpl, workerScope } = input
  const settings = ensureLegacyFdmSettings(input.settings ?? {})
  const timeoutMs = Number.isFinite(input.timeoutMs) ? Math.max(50, Number(input.timeoutMs)) : 30_000
  const fakeWidget = createFakeWidget(vb, points)
  const prevKW = workerScope.kiri_worker
  workerScope.kiri_worker = { cache: {}, minions: { concurrent: false } }
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error(`legacy slice timeout after ${timeoutMs}ms`))
      }, timeoutMs)
      const finishResolve = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve()
      }
      const finishReject = (err: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      }
      const ondone = (doneErr: unknown) => {
        if (doneErr) {
          finishReject(doneErr instanceof Error ? doneErr : new Error(String(doneErr)))
          return
        }
        finishResolve()
      }
      try {
        const ret = fdmSliceImpl(settings, fakeWidget, (_u: any, _m?: any) => {}, ondone)
        if (ret != null && typeof (ret as Promise<unknown>).catch === 'function') {
          ;(ret as Promise<unknown>).catch((err) => finishReject(err))
        }
      } catch (err) {
        finishReject(err)
      }
    })
  } finally {
    workerScope.kiri_worker = prevKW
  }

  const bb = fakeWidget.getBoundingBox()
  const layers = convertWidgetSlicesToLayers(fakeWidget.slices)
  return {
    bounds: {
      minX: bb.minx ?? vb.minX,
      minY: bb.miny ?? vb.minY,
      maxX: bb.maxx ?? vb.maxX,
      maxY: bb.maxy ?? vb.maxY,
    },
    layers,
  }
}
