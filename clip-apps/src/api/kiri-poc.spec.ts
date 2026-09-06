import { afterEach, describe, expect, it, vi } from 'vitest'
import { runKiriPoc } from './kiri-poc'
import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'

afterEach(() => {
  vi.unstubAllGlobals()
})

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

const minimalProcess = { processName: 'p', sliceHeight: 0.2 } as FdmProcess

describe('api.kiri-poc.runKiriPoc', () => {
  it('resolves worker ok payload', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        this.onmessage?.({
          data: { ok: true, layerCount: 1, layers: [{ z: 0, lineCount: 10 }] },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const out = await runKiriPoc(minimalJob(), new Float32Array([0, 0, 0]), minimalProcess)
    expect(out.ok).toBe(true)
    expect(out.layerCount).toBe(1)
    expect(out.layers[0]?.lineCount).toBe(10)
  })

  it('rejects when worker returns ok false', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        this.onmessage?.({ data: { ok: false, error: 'poc boom' } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(runKiriPoc(minimalJob(), new Float32Array([0, 0, 0]), minimalProcess)).rejects.toThrow('poc boom')
  })

  it('rejects on worker onerror', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        queueMicrotask(() => this.onerror?.(new ErrorEvent('error', { message: 'worker script' })))
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(runKiriPoc(minimalJob(), new Float32Array([0, 0, 0]), minimalProcess)).rejects.toThrow('worker script')
  })

  it('rejects on worker onmessageerror', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        queueMicrotask(() => this.onmessageerror?.({} as MessageEvent))
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(runKiriPoc(minimalJob(), new Float32Array([0, 0, 0]), minimalProcess)).rejects.toThrow(
      'kiri poc worker message error',
    )
  })

  it('posts vertices.buffer in transfer list', async () => {
    let transfer: Transferable[] | undefined
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage(_p: unknown, t?: Transferable[]) {
        transfer = t
        this.onmessage?.({
          data: { ok: true, layerCount: 0, layers: [] },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const verts = new Float32Array([1, 2, 3])
    await runKiriPoc(minimalJob(), verts, minimalProcess)
    expect(transfer?.[0]).toBe(verts.buffer)
  })

  it('posts sanitized job and cloned process (DataClone / mutation isolation)', async () => {
    let posted: { job: SliceJobPayload; process: FdmProcess } | null = null
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage(p: { job: SliceJobPayload; process: FdmProcess }) {
        posted = p
        this.onmessage?.({
          data: { ok: true, layerCount: 0, layers: [] },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const job = { ...minimalJob(), extra: 'x' } as SliceJobPayload & { extra?: string }
    const proc = { ...minimalProcess, sliceHeight: 0.25 } as FdmProcess
    await runKiriPoc(job, new Float32Array([0, 0, 0]), proc)

    expect(posted).toBeTruthy()
    expect((posted!.job as Record<string, unknown>).extra).toBeUndefined()
    proc.sliceHeight = 99
    job.models[0].bbox.max.x = 77
    expect(posted!.process.sliceHeight).toBe(0.25)
    expect(posted!.job.models[0].bbox.max.x).toBe(1)
  })
})
