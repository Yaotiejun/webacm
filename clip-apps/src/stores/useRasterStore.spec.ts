import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/raster', () => ({
  runRaster: vi.fn(() =>
    Promise.resolve({
      paths: [],
      summary: { pathCount: 0, pointCount: 0 },
    }),
  ),
}))

import { useRasterStore } from './useRasterStore'

describe('stores.useRasterStore defensive cloning', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addRecentJob stores detached copy', () => {
    const store = useRasterStore()
    const job = {
      id: 'j1',
      createdAt: 1,
      name: 'test',
      input: {
        config: { mode: 'planar', resolution: 1, rotationStep: 1, xStep: 1, yStep: 1, zFloor: 0, tracingStep: 1 },
        extra: { k: 1 },
      } as any,
      summary: { pathCount: 0, pointCount: 0 },
      paths: [],
    }
    store.addRecentJob(job)
    ;(job.input as any).extra.k = 99
    expect((store.recentJobs[0]?.input as any).extra.k).toBe(1)
  })

  it('runRaster keeps currentRequest isolated from caller mutations', async () => {
    const store = useRasterStore()
    const terrain = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    const tool = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    const request = {
      terrainTriangles: terrain,
      toolTriangles: tool,
      config: store.config,
    }
    await store.runRaster(request)
    terrain[0] = 999
    expect(store.currentRequest?.terrainTriangles[0]).toBe(1)
  })
})
