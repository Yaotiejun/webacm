import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitSliceJob, sanitizeJobForWorker, type SliceTelemetryEvent } from './slice'
import type { SliceJobPayload } from '@/types/job'

afterEach(() => {
  vi.unstubAllGlobals()
})

function minimalSliceJob(over: Partial<SliceJobPayload> = {}): SliceJobPayload {
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
    ...over,
  }
}

describe('api.slice.sanitizeJobForWorker', () => {
  it('drops unknown top-level keys so worker postMessage stays DataClone-safe', () => {
    const job = { ...minimalSliceJob(), extraneous: 'drop-me', reactiveLike: { __v_isRef: true } } as SliceJobPayload &
      Record<string, unknown>
    const out = sanitizeJobForWorker(job)
    expect((out as Record<string, unknown>).extraneous).toBeUndefined()
    expect((out as Record<string, unknown>).reactiveLike).toBeUndefined()
    expect(out.id).toBe('j')
  })

  it('deep-clones jobBounds so caller mutations do not affect sanitized output', () => {
    const bounds = {
      size: { x: 10, y: 10, z: 10 },
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 10, z: 10 },
    }
    const job = minimalSliceJob({ jobBounds: bounds })
    const out = sanitizeJobForWorker(job)
    bounds.max.x = 99
    expect(out.jobBounds?.max.x).toBe(10)
  })

  it('deep-clones per-model transform', () => {
    const job = minimalSliceJob()
    const out = sanitizeJobForWorker(job)
    job.models[0].transform.position.x = 42
    expect(out.models[0].transform.position.x).toBe(0)
  })

  it('preserves per-model extruder for multi-material jobs', () => {
    const job = minimalSliceJob({
      models: [
        {
          ...minimalSliceJob().models[0]!,
          id: 'a',
          extruder: 1,
        },
        {
          ...minimalSliceJob().models[0]!,
          id: 'b',
          extruder: 2,
        },
      ],
    })
    const out = sanitizeJobForWorker(job)
    expect(out.models.map((m) => m.extruder)).toEqual([1, 2])
  })
})

describe('api.slice.submitSliceJob', () => {
  it('forwards telemetry events before final result', async () => {
    const createdWorkers: any[] = []
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      constructor(_url: URL, _opts: any) {
        createdWorkers.push(this)
      }
      postMessage(_payload?: unknown, _transfer?: Transferable[]) {
        this.onmessage?.({
          data: {
            kind: 'telemetry',
            event: {
              kind: 'slicer_fallback',
              code: 'slicer_legacy_slice_timeout',
              reasonCode: 'legacy_slice_timeout',
              message: 'legacy slice timeout after 500ms',
            } satisfies SliceTelemetryEvent,
          },
        } as MessageEvent)
        this.onmessage?.({
          data: {
            ok: true,
            backend: 'mock',
            result: {
              summary: { layers: 1, timeMinutes: 0.1, filamentMm: 10 },
              preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
              backend: 'mock',
              fallback: null,
            },
          },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const telemetry: SliceTelemetryEvent[] = []
    const out = await submitSliceJob(
      {
        id: 'j1',
        name: 'job',
        createdAt: 1,
        updatedAt: 1,
        mode: 'FDM',
        device: 'd',
        process: 'p',
        material: 'm',
        models: [],
      } as any,
      new Float32Array([0, 0, 0]),
      {} as any,
      'kiri',
      { onTelemetry: (event) => telemetry.push(event) },
    )

    expect(createdWorkers.length).toBe(1)
    expect(telemetry.length).toBe(1)
    expect(telemetry[0]?.code).toBe('slicer_legacy_slice_timeout')
    expect(out.backend).toBe('mock')
  })

  it('clones process/job payload before posting to worker', async () => {
    let posted: any = null
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage(payload: any, _transfer?: Transferable[]) {
        posted = payload
        this.onmessage?.({
          data: {
            ok: true,
            backend: 'mock',
            result: {
              summary: { layers: 1, timeMinutes: 0.1, filamentMm: 10 },
              preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
              backend: 'mock',
              fallback: null,
            },
          },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const job = {
      id: 'j1',
      name: 'job',
      createdAt: 1,
      updatedAt: 1,
      mode: 'FDM',
      device: 'd',
      process: 'p',
      material: 'm',
      models: [
        {
          id: 'm1',
          name: 'cube.stl',
          ext: 'stl',
          transform: { tx: 1, nested: { a: 1 } },
          bbox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        },
      ],
      jobBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    } as any
    const process = { speed: { wall: 100 } } as any
    await submitSliceJob(job, new Float32Array([0, 0, 0]), process, 'kiri')

    process.speed.wall = 999
    job.models[0].transform.nested.a = 9

    expect(posted.process.speed.wall).toBe(100)
    expect(posted.job.models[0].transform.nested.a).toBe(1)
  })

  it('rejects when worker returns ok false with error message', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        this.onmessage?.({ data: { ok: false, error: 'slice worker boom' } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(
      submitSliceJob(minimalSliceJob(), new Float32Array([0, 0, 0]), {} as any, 'mock'),
    ).rejects.toThrow('slice worker boom')
  })

  it('rejects with generic message when worker returns ok false without error field', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        this.onmessage?.({ data: { ok: false } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(
      submitSliceJob(minimalSliceJob(), new Float32Array([0, 0, 0]), {} as any, 'mock'),
    ).rejects.toThrow('slice worker error')
  })

  it('rejects when worker fires onerror', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage() {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    await expect(
      submitSliceJob(minimalSliceJob(), new Float32Array([0, 0, 0]), {} as any, 'mock'),
    ).rejects.toEqual(expect.any(Event))
  })

  it('posts vertices buffer in transfer list for zero-copy handoff', async () => {
    let transfer: Transferable[] | undefined
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onmessageerror: ((ev: MessageEvent) => void) | null = null
      constructor(_url: URL, _opts: any) {}
      postMessage(_payload: unknown, transferList?: Transferable[]) {
        transfer = transferList
        this.onmessage?.({
          data: {
            ok: true,
            backend: 'mock',
            result: {
              summary: { layers: 1, timeMinutes: 0.1, filamentMm: 10 },
              preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
              backend: 'mock',
              fallback: null,
            },
          },
        } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker as any)

    const verts = new Float32Array([0, 0, 0, 1, 0, 0])
    await submitSliceJob(minimalSliceJob(), verts, {} as any, 'mock')

    expect(transfer?.length).toBe(1)
    expect(transfer?.[0]).toBe(verts.buffer)
  })

  it('rejects when worker fires onmessageerror', async () => {
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

    await expect(
      submitSliceJob(minimalSliceJob(), new Float32Array([0, 0, 0]), {} as any, 'mock'),
    ).rejects.toThrow('slice worker message error')
  })
})
