import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const runTexturizerMock = vi.fn(
  (
    _req: unknown,
    opts?: { onProgress?: (ev: { stage: 'subdivision'; progress: number; message?: string }) => void },
  ) => {
    opts?.onProgress?.({ stage: 'subdivision', progress: 0.5, message: 'half' })
    return Promise.resolve({
      vertices: new Float32Array([0, 0, 0]),
      summary: { vertexCount: 1, minDeltaZ: 0, maxDeltaZ: 0 },
    })
  },
)

vi.mock('@/api/texturizer', () => ({
  runTexturizer: (...args: unknown[]) => runTexturizerMock(...args),
}))

import { useTexturizerStore } from './useTexturizerStore'

describe('stores.useTexturizerStore defensive cloning', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addRecentJob stores detached copy', () => {
    const store = useTexturizerStore()
    const job = {
      id: 'j1',
      createdAt: 1,
      name: 't',
      input: {
        vertexCount: 3,
        amplitude: 1,
        frequency: 1,
        texture: { width: 1, height: 1 },
        extra: { k: 1 },
      } as any,
      summary: { vertexCount: 1, minDeltaZ: 0, maxDeltaZ: 0 },
      vertices: [0, 0, 0],
    }
    store.addRecentJob(job)
    ;(job.input as any).extra.k = 99
    expect((store.recentJobs[0]?.input as any).extra.k).toBe(1)
  })

  it('runTexturizer keeps currentRequest isolated from caller vertex buffer mutations', async () => {
    const store = useTexturizerStore()
    const verts = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const request = {
      vertices: verts,
      amplitude: 0.1,
      frequency: 1,
    }
    await store.runTexturizer(request)
    verts[0] = 999
    expect(store.currentRequest?.vertices[0]).toBe(1)
  })

  it('runTexturizer reports weighted overall progress from worker stages', async () => {
    const store = useTexturizerStore()
    await store.runTexturizer({
      vertices: new Float32Array([0, 0, 0]),
      amplitude: 0.1,
      frequency: 1,
    })
    expect(runTexturizerMock).toHaveBeenCalled()
    expect(store.runPercent).toBe(100)
    expect(store.result?.summary.vertexCount).toBe(1)
  })
})
