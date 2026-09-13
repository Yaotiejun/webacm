import type { SliceJobPayload } from '@/types/job'

/** One mesh part for FDM slice (Kiri widget). Transforms must already be baked into vertices. */
export type SliceModelMesh = {
  modelId: string
  vertices: Float32Array
  /** Multi-extruder tool index (Kiri widget.anno.extruder). */
  extruder?: number
  /** Manual support paint (Kiri widget.anno.paint). Platform / widget-local coords. */
  paint?: Array<{ point: { x: number; y: number; z: number }; radius: number }>
}

export type SliceGeometryInput = Float32Array | SliceModelMesh[]

export function isSliceModelMeshList(input: SliceGeometryInput): input is SliceModelMesh[] {
  return Array.isArray(input)
}

/** Concatenate per-model vertex buffers (mock / inputMeta / placeholder bounds). */
export function mergeSliceModelMeshes(meshes: ReadonlyArray<SliceModelMesh>): Float32Array {
  let total = 0
  for (const m of meshes) total += m.vertices?.length ?? 0
  const out = new Float32Array(total)
  let o = 0
  for (const m of meshes) {
    const v = m.vertices
    if (!v?.length) continue
    out.set(v, o)
    o += v.length
  }
  return out
}

export function normalizeSliceModelMeshes(
  input: SliceGeometryInput,
  job?: SliceJobPayload,
): SliceModelMesh[] {
  if (isSliceModelMeshList(input)) {
    return input.filter((m) => m?.vertices && m.vertices.length > 0)
  }
  if (!input?.length) return []
  const fromJob = job?.models?.find((m) => Number.isFinite(m.extruder))
  return [
    {
      modelId: job?.models?.[0]?.id ?? '_merged',
      vertices: input,
      extruder: fromJob && Number.isFinite(fromJob.extruder) ? Math.max(0, Math.floor(Number(fromJob.extruder))) : 0,
    },
  ]
}
