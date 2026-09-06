import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FdmProcess } from '@/types/process'
import type { SliceJobPayload } from '@/types/job'

vi.mock('@/api/slice', () => ({
  submitSliceJob: vi.fn(() =>
    Promise.resolve({
      summary: { layers: 0, timeMinutes: 0, filamentMm: 0 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
      fallback: null,
    }),
  ),
}))

import { submitSliceJob } from '@/api/slice'
import { getSliceBackend, KiriSliceBackend, MockSliceBackend } from './slice-backend'

function minimalJob(): SliceJobPayload {
  return {
    id: 'j',
    name: 'n',
    createdAt: 1,
    updatedAt: 1,
    mode: 'FDM',
    device: 'd',
    process: 'p',
    material: 'm',
    models: [
      {
        id: 'm1',
        name: 'a.stl',
        ext: 'stl',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        bbox: {
          size: { x: 1, y: 1, z: 1 },
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 1, z: 1 },
        },
      },
    ],
  }
}

const minimalProcess = { processName: 'p' } as FdmProcess

describe('api.slice-backend', () => {
  beforeEach(() => {
    vi.mocked(submitSliceJob).mockClear()
  })

  it('getSliceBackend returns Kiri delegate for kiri', () => {
    expect(getSliceBackend('kiri')).toBe(KiriSliceBackend)
    expect(getSliceBackend('kiri').kind).toBe('kiri')
  })

  it('getSliceBackend returns mock delegate for mock', () => {
    expect(getSliceBackend('mock')).toBe(MockSliceBackend)
    expect(getSliceBackend('mock').kind).toBe('mock')
  })

  it('KiriSliceBackend.slice forwards kiri backend kind to submitSliceJob', async () => {
    const job = minimalJob()
    const verts = new Float32Array(9)
    const opts = { onTelemetry: vi.fn() }
    await KiriSliceBackend.slice(job, verts, minimalProcess, opts)
    expect(submitSliceJob).toHaveBeenCalledWith(job, verts, minimalProcess, 'kiri', opts)
  })

  it('MockSliceBackend.slice forwards mock backend kind to submitSliceJob', async () => {
    const job = minimalJob()
    const verts = new Float32Array(9)
    await MockSliceBackend.slice(job, verts, minimalProcess)
    expect(submitSliceJob).toHaveBeenCalledWith(job, verts, minimalProcess, 'mock', undefined)
  })

  it('MockSliceBackend.slice forwards optional SliceSubmitOptions', async () => {
    const job = minimalJob()
    const verts = new Float32Array(9)
    const opts = { onTelemetry: vi.fn() }
    await MockSliceBackend.slice(job, verts, minimalProcess, opts)
    expect(submitSliceJob).toHaveBeenCalledWith(job, verts, minimalProcess, 'mock', opts)
  })
})
