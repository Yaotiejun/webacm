import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetRasterWorkerStateForTests, runRaster } from './raster'
import type { RasterRequest } from '@/types/raster'

vi.mock('@/api/rasterGrip', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/api/rasterGrip')>()
  return {
    ...mod,
    runRasterGripBridge: vi.fn(() =>
      Promise.resolve({
        paths: [{ points: [[0, 0, 0]] }],
        summary: { pathCount: 1, pointCount: 1, gripBridge: true },
      }),
    ),
  }
})

beforeEach(() => {
  resetRasterWorkerStateForTests()
})

afterEach(() => {
  resetRasterWorkerStateForTests()
  vi.unstubAllGlobals()
})

function minimalRequest(): RasterRequest {
  return {
    terrainTriangles: new Float32Array(9),
    toolTriangles: new Float32Array(9),
    config: {
      mode: 'planar',
      resolution: 1,
      rotationStep: 1,
      xStep: 1,
      yStep: 1,
      zFloor: 0,
      tracingStep: 1,
    },
  }
}

class MockRasterWorker {
  private listeners = new Map<string, Set<(e: Event) => void>>()

  addEventListener(type: string, fn: (e: Event) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(fn)
  }

  removeEventListener(type: string, fn: (e: Event) => void) {
    this.listeners.get(type)?.delete(fn)
  }

  protected fire(type: string, ev: Event) {
    this.listeners.get(type)?.forEach((fn) => fn(ev))
  }

  postMessage(_data: unknown) {
    queueMicrotask(() => {
      this.fire(
        'message',
        { data: { kind: 'progress', phase: 'start', percent: 0 } } as MessageEvent as unknown as Event,
      )
      queueMicrotask(() =>
        this.fire(
          'message',
          {
            data: {
              kind: 'result',
              result: { paths: [], summary: { pathCount: 0, pointCount: 0 } },
            },
          } as MessageEvent as unknown as Event,
        ),
      )
    })
  }

  terminate() {}
}

describe('api.raster.runRaster', () => {
  it('resolves worker message payload', async () => {
    vi.stubGlobal('Worker', MockRasterWorker as any)
    const out = await runRaster(minimalRequest())
    expect(out.summary.pathCount).toBe(0)
    expect(out.paths).toEqual([])
  })

  it('rejects on worker error event', async () => {
    class ErrWorker extends MockRasterWorker {
      postMessage(_data: unknown) {
        queueMicrotask(() => this.fire('error', new Event('error')))
      }
    }
    vi.stubGlobal('Worker', ErrWorker as any)
    await expect(runRaster(minimalRequest())).rejects.toEqual(expect.any(Event))
  })

  it('rejects on worker messageerror', async () => {
    class MsgErrWorker extends MockRasterWorker {
      postMessage(_data: unknown) {
        queueMicrotask(() => this.fire('messageerror', {} as MessageEvent as unknown as Event))
      }
    }
    vi.stubGlobal('Worker', MsgErrWorker as any)
    await expect(runRaster(minimalRequest())).rejects.toThrow('raster worker message error')
  })

  it('rejects when a run is still in flight', async () => {
    class SlowWorker extends MockRasterWorker {
      postMessage(_data: unknown) {
        /* no automatic message — caller will flush */
      }

      flush() {
        this.fire(
          'message',
          { data: { paths: [], summary: { pathCount: 0, pointCount: 0 } } } as MessageEvent as unknown as Event,
        )
      }
    }

    let instance: SlowWorker
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          instance = new SlowWorker()
          return instance
        }
      } as any,
    )

    const req = minimalRequest()
    const p1 = runRaster(req)
    await expect(runRaster(req)).rejects.toThrow('Raster worker is busy')
    instance!.flush()
    await expect(p1).resolves.toMatchObject({ summary: { pathCount: 0 } })
  })

  it('routes planar jobs through grip bridge when VITE_RASTER_GRIP_BRIDGE=1', async () => {
    vi.stubEnv('VITE_RASTER_GRIP_BRIDGE', '1')
    const grip = await import('@/api/rasterGrip')
    const out = await runRaster(minimalRequest())
    expect(grip.runRasterGripBridge).toHaveBeenCalled()
    expect(out.summary.gripBridge).toBe(true)
    expect(out.paths.length).toBe(1)
  })
})
