import { describe, expect, it } from 'vitest'
import {
  mergeSliceModelMeshes,
  normalizeSliceModelMeshes,
  type SliceModelMesh,
} from '@/core/slicer/sliceModelMeshes'
import type { SliceJobPayload } from '@/types/job'

describe('sliceModelMeshes', () => {
  it('merges vertex buffers in order', () => {
    const meshes: SliceModelMesh[] = [
      { modelId: 'a', vertices: new Float32Array([1, 2, 3]) },
      { modelId: 'b', vertices: new Float32Array([4, 5, 6]) },
    ]
    expect(Array.from(mergeSliceModelMeshes(meshes))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('normalizes Float32Array using job extruder', () => {
    const job = {
      models: [{ id: 'm1', extruder: 2 }],
    } as unknown as SliceJobPayload
    const meshes = normalizeSliceModelMeshes(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), job)
    expect(meshes).toHaveLength(1)
    expect(meshes[0]!.modelId).toBe('m1')
    expect(meshes[0]!.extruder).toBe(2)
  })

  it('filters empty mesh entries', () => {
    const meshes = normalizeSliceModelMeshes([
      { modelId: 'a', vertices: new Float32Array([0, 0, 0]) },
      { modelId: 'b', vertices: new Float32Array(0) },
    ])
    expect(meshes.map((m) => m.modelId)).toEqual(['a'])
  })
})
