import { describe, expect, it } from 'vitest'
import { isRasterWorkerProgressMessage, isRasterWorkerResultMessage, unwrapRasterWorkerPayload } from './rasterWorkerProtocol'

describe('rasterWorkerProtocol', () => {
  it('unwraps progress messages', () => {
    const msg = { kind: 'progress', phase: 'rasterize', percent: 0.15 }
    expect(isRasterWorkerProgressMessage(msg)).toBe(true)
    const out = unwrapRasterWorkerPayload(msg)
    expect(out.progress?.phase).toBe('rasterize')
    expect(out.result).toBeNull()
  })

  it('unwraps wrapped result messages', () => {
    const msg = { kind: 'result', result: { paths: [], summary: { pathCount: 0, pointCount: 0 } } }
    expect(isRasterWorkerResultMessage(msg)).toBe(true)
    const out = unwrapRasterWorkerPayload(msg)
    expect(out.result?.paths).toEqual([])
  })

  it('unwraps legacy bare RasterResult payloads', () => {
    const bare = { paths: [{ points: [[0, 0, 0]] }], summary: { pathCount: 1, pointCount: 1 } }
    const out = unwrapRasterWorkerPayload(bare)
    expect(out.result?.summary.pathCount).toBe(1)
  })
})
