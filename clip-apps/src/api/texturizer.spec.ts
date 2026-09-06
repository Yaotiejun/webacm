import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTexturizerWorkerStateForTests, runTexturizer } from './texturizer'
import type { TexturizeRequest } from '@/types/texturizer'

beforeEach(() => {
  resetTexturizerWorkerStateForTests()
})

afterEach(() => {
  resetTexturizerWorkerStateForTests()
  vi.unstubAllGlobals()
})

function minimalRequest(): TexturizeRequest {
  return {
    vertices: new Float32Array(9),
    amplitude: 0.1,
    frequency: 1,
  }
}

class MockTexturizerWorker {
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
        new MessageEvent('message', {
          data: {
            vertices: new Float32Array(9),
            summary: { vertexCount: 3, minDeltaZ: 0, maxDeltaZ: 0 },
          },
        }),
      )
    })
  }

  terminate() {}
}

describe('api.texturizer.runTexturizer', () => {
  it('resolves worker result payload', async () => {
    vi.stubGlobal('Worker', MockTexturizerWorker as any)
    const out = await runTexturizer(minimalRequest())
    expect(out.summary.vertexCount).toBe(3)
    expect(out.vertices.length).toBe(9)
  })

  it('invokes onProgress before final result', async () => {
    class ProgressWorker extends MockTexturizerWorker {
      postMessage(_data: unknown) {
        queueMicrotask(() => {
          this.fire(
            'message',
            new MessageEvent('message', {
              data: { kind: 'progress', stage: 'displacement', progress: 0.5 },
            }),
          )
          queueMicrotask(() => {
            this.fire(
              'message',
              new MessageEvent('message', {
                data: {
                  vertices: new Float32Array(9),
                  summary: { vertexCount: 3, minDeltaZ: 0, maxDeltaZ: 0 },
                },
              }),
            )
          })
        })
      }
    }
    vi.stubGlobal('Worker', ProgressWorker as any)
    const progress: number[] = []
    await runTexturizer(minimalRequest(), {
      onProgress: (ev) => progress.push(ev.progress),
    })
    expect(progress).toEqual([0.5])
  })

  it('rejects on worker error event', async () => {
    class ErrWorker extends MockTexturizerWorker {
      postMessage(_data: unknown) {
        queueMicrotask(() => this.fire('error', new Event('error')))
      }
    }
    vi.stubGlobal('Worker', ErrWorker as any)
    await expect(runTexturizer(minimalRequest())).rejects.toEqual(expect.any(Event))
  })

  it('rejects on worker messageerror', async () => {
    class MsgErrWorker extends MockTexturizerWorker {
      postMessage(_data: unknown) {
        queueMicrotask(() =>
          this.fire('messageerror', new MessageEvent('messageerror', { data: null })),
        )
      }
    }
    vi.stubGlobal('Worker', MsgErrWorker as any)
    await expect(runTexturizer(minimalRequest())).rejects.toThrow('texturizer worker message error')
  })

  it('rejects when a run is still in flight', async () => {
    class SlowWorker extends MockTexturizerWorker {
      postMessage(_data: unknown) {
        /* caller flushes */
      }

      flush() {
        this.fire(
          'message',
          new MessageEvent('message', {
            data: {
              vertices: new Float32Array(9),
              summary: { vertexCount: 3, minDeltaZ: 0, maxDeltaZ: 0 },
            },
          }),
        )
      }
    }

    let instance: SlowWorker
    vi.stubGlobal(
      'Worker',
      function TexturizerWorkerStub() {
        instance = new SlowWorker()
        return instance
      } as any,
    )

    const req = minimalRequest()
    const p1 = runTexturizer(req)
    await expect(runTexturizer(req)).rejects.toThrow('Texturizer worker is busy')
    instance!.flush()
    await expect(p1).resolves.toMatchObject({ summary: { vertexCount: 3 } })
  })
})
