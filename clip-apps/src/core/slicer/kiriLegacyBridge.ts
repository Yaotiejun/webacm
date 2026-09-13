import type { SliceLayerPreview } from '@/api/slice'
import type { VertexBounds3D } from '@/core/slicer/geometry'
import {
  buildLegacyFdmControllerProfile,
  buildLegacyFdmDeviceProfile,
  buildLegacyWidgetBoundingBox,
} from '@/core/slicer/kiriLegacyFdmDefaults'
import { applyBeltPointRotation, buildBeltMeta } from '@/core/slicer/fdmBeltPrep'
import type { FdmProcess } from '@/types/process'
import {
  convertWidgetSlicesToLayers,
  computePreviewBoundsFromLayers,
  mergeWidgetSlicesToLayers,
} from '@/core/slicer/previewConvert'

export interface LegacyPreviewData {
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  layers: SliceLayerPreview[]
}

export interface LegacyFdmSliceBridgeResult extends LegacyPreviewData {
  widget: any
  /** All widgets when multi-part; prepare/export should use this list. */
  widgets: any[]
  settings: Record<string, unknown>
}

export type LegacyFdmSliceBridgeOptions = {
  /** Multi-extruder tool index (Kiri widget.anno.extruder). */
  extruder?: number
  /** Widget / mesh id (Kiri mesh.uuid). */
  id?: string
  /** Shared print group (all widgets in one job). */
  group?: any[]
  /** Manual support paint spheres (Kiri widget.anno.paint). */
  paint?: Array<{ point: { x: number; y: number; z: number }; radius: number }>
}

export type LegacyWidgetSpec = {
  id: string
  vb: VertexBounds3D
  points: any[]
  extruder?: number
  paint?: Array<{ point: { x: number; y: number; z: number }; radius: number }>
}

function createFakeWidget(vb: VertexBounds3D, pts: any[], opts?: LegacyFdmSliceBridgeOptions) {
  const bbox = buildLegacyWidgetBoundingBox(vb)
  const THREE = (globalThis as any).THREE
  const bounds =
    THREE?.Box3 != null
      ? new THREE.Box3(
          new THREE.Vector3(vb.minX, vb.minY, vb.minZ),
          new THREE.Vector3(vb.maxX, vb.maxY, vb.maxZ),
        )
      : {
          min: { x: vb.minX, y: vb.minY, z: vb.minZ },
          max: { x: vb.maxX, y: vb.maxY, z: vb.maxZ },
          clone() {
            return {
              min: { ...this.min },
              max: { ...this.max },
              clone: this.clone,
            }
          },
        }

  const extruder = Number.isFinite(opts?.extruder) ? Math.max(0, Math.floor(Number(opts!.extruder))) : 0
  const sharedGroup = opts?.group ?? []

  const fakeWidget = {
    id: opts?.id ?? 'legacy-fdm-mesh',
    track: {
      synth: false,
      support: false,
      ignore: false,
      zcut: 0,
      box: { w: vb.maxX - vb.minX, h: vb.maxY - vb.minY },
      pos: { x: 0, y: 0, z: 0 },
      grid_id: 1,
    },
    meta: { disabled: false },
    anno: { extruder, paint: Array.isArray(opts?.paint) ? opts!.paint! : [] },
    /** truthy so prepare clears slice.prep on real widgets */
    mesh: { uuid: opts?.id ?? 'legacy-fdm-mesh' },
    bounds,
    getBoundingBox() {
      return bbox
    },
    getPoints() {
      return pts
    },
    clearSlices() {},
    setTopZ() {},
    belt: undefined as ReturnType<typeof buildBeltMeta>,
    group: sharedGroup,
    slices: [] as any[],
    shadow: undefined,
  }
  if (!sharedGroup.includes(fakeWidget)) sharedGroup.push(fakeWidget)
  return fakeWidget
}

/** Apply Kiri-style belt pre-pass when device.bedBelt is set. */
export function attachBeltPrepToWidget(input: {
  widget: { belt?: unknown; track: { pos: { y: number } }; getPoints: () => any[] }
  settings: Record<string, unknown>
  vb: VertexBounds3D
}): void {
  const device = (input.settings.device ?? {}) as { bedBelt?: boolean; bedDepth?: number }
  const process = (input.settings.process ?? {}) as FdmProcess
  if (!device.bedBelt) return

  const angle = Number(process.sliceAngle) > 0 ? Number(process.sliceAngle) : 45
  const pts = input.widget.getPoints()
  // Match Kiri rotate(): shift by minY then rotate about X.
  const minY = input.vb.minY
  for (const p of pts) {
    if (typeof p.set === 'function') p.set(p.x, p.y - minY, p.z)
    else p.y = p.y - minY
  }
  applyBeltPointRotation(pts, angle)

  input.widget.belt = buildBeltMeta({
    process,
    device,
    minY: input.vb.minY,
    maxY: input.vb.maxY,
    trackPosY: input.widget.track.pos.y,
  })
}

function ensureLegacyFdmSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const process = settings.process as FdmProcess | undefined
  if (!process) return settings
  return {
    ...settings,
    render: false,
    mode: settings.mode ?? 'FDM',
    filter: {
      FDM: 'Any.Generic.Marlin',
      ...(settings.filter as Record<string, unknown> | undefined),
    },
    device: buildLegacyFdmDeviceProfile(
      process,
      settings.device as Record<string, unknown> | null | undefined,
    ),
    controller: buildLegacyFdmControllerProfile(
      settings.controller as Record<string, unknown> | null | undefined,
    ),
  }
}

function runOneFdmSlice(input: {
  settings: Record<string, unknown>
  widget: any
  fdmSliceImpl: (settings: any, widget: any, onupdate: Function, ondone: Function) => any
  timeoutMs: number
}): Promise<void> {
  const { settings, widget, fdmSliceImpl, timeoutMs } = input
  return new Promise<void>((resolve, reject) => {
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
      const ret = fdmSliceImpl(settings, widget, (_u: any, _m?: any) => {}, ondone)
      if (ret != null && typeof (ret as Promise<unknown>).catch === 'function') {
        ;(ret as Promise<unknown>).catch((err) => finishReject(err))
      }
    } catch (err) {
      finishReject(err)
    }
  })
}

function previewBoundsFromWidgets(
  widgets: any[],
  layers: SliceLayerPreview[],
  fallbackVb?: VertexBounds3D,
): LegacyPreviewData['bounds'] {
  const pathBounds = computePreviewBoundsFromLayers(layers)
  if (pathBounds) return pathBounds
  const first = widgets[0]
  const bb = first?.getBoundingBox?.()
  if (bb) {
    return {
      minX: bb.minx ?? fallbackVb?.minX ?? 0,
      minY: bb.miny ?? fallbackVb?.minY ?? 0,
      maxX: bb.maxx ?? fallbackVb?.maxX ?? 0,
      maxY: bb.maxy ?? fallbackVb?.maxY ?? 0,
    }
  }
  return {
    minX: fallbackVb?.minX ?? 0,
    minY: fallbackVb?.minY ?? 0,
    maxX: fallbackVb?.maxX ?? 0,
    maxY: fallbackVb?.maxY ?? 0,
  }
}

/**
 * Slice one or more widgets sharing a print group (Kiri multi-part / multi-extruder).
 * Runs `fdm_slice` per widget, then optional `sliceAll` (anchor/grid_id cleanup).
 */
export async function runLegacyFdmSliceBridgeMulti(input: {
  settings: any
  widgets: LegacyWidgetSpec[]
  fdmSliceImpl: (settings: any, widget: any, onupdate: Function, ondone: Function) => any
  workerScope: any
  /** Kiri group post-pass (`sliceAll`). Optional. */
  fdmSliceAllImpl?: (settings: any, onupdate?: Function) => void
  timeoutMs?: number
}): Promise<LegacyFdmSliceBridgeResult> {
  const specs = (input.widgets || []).filter((w) => w?.points?.length)
  if (!specs.length) throw new Error('no widgets for legacy multi slice')

  const settings = ensureLegacyFdmSettings(input.settings ?? {})
  const timeoutMs = Number.isFinite(input.timeoutMs) ? Math.max(50, Number(input.timeoutMs)) : 30_000
  const sharedGroup: any[] = []
  const widgets: any[] = []

  for (const spec of specs) {
    const w = createFakeWidget(spec.vb, spec.points, {
      extruder: spec.extruder,
      id: spec.id,
      group: sharedGroup,
      paint: spec.paint,
    })
    attachBeltPrepToWidget({ widget: w, settings, vb: spec.vb })
    widgets.push(w)
  }

  const prevKW = input.workerScope.kiri_worker
  const cache: Record<string, any> = {}
  input.workerScope.kiri_worker = { cache, minions: { concurrent: false }, current: {} }
  try {
    for (const w of widgets) {
      cache[w.mesh.uuid] = w
      await runOneFdmSlice({
        settings,
        widget: w,
        fdmSliceImpl: input.fdmSliceImpl,
        timeoutMs,
      })
    }
    if (typeof input.fdmSliceAllImpl === 'function' && widgets.length > 1) {
      try {
        input.fdmSliceAllImpl(settings, () => {})
      } catch {
        // sliceAll is best-effort (needs settings.bounds for grid_id)
      }
    }
  } finally {
    input.workerScope.kiri_worker = prevKW
  }

  const layers =
    widgets.length > 1
      ? mergeWidgetSlicesToLayers(widgets)
      : convertWidgetSlicesToLayers(widgets[0]!.slices)
  return {
    bounds: previewBoundsFromWidgets(widgets, layers, specs[0]!.vb),
    layers,
    widget: widgets[0],
    widgets,
    settings,
  }
}

export async function runLegacyFdmSliceBridge(input: {
  settings: any
  vb: VertexBounds3D
  points: any[]
  fdmSliceImpl: (settings: any, widget: any, onupdate: Function, ondone: Function) => any
  workerScope: any
  timeoutMs?: number
  extruder?: number
  paint?: Array<{ point: { x: number; y: number; z: number }; radius: number }>
  fdmSliceAllImpl?: (settings: any, onupdate?: Function) => void
}): Promise<LegacyFdmSliceBridgeResult> {
  return runLegacyFdmSliceBridgeMulti({
    settings: input.settings,
    widgets: [
      {
        id: 'legacy-fdm-mesh',
        vb: input.vb,
        points: input.points,
        extruder: input.extruder,
        paint: input.paint,
      },
    ],
    fdmSliceImpl: input.fdmSliceImpl,
    workerScope: input.workerScope,
    timeoutMs: input.timeoutMs,
    fdmSliceAllImpl: input.fdmSliceAllImpl,
  })
}
