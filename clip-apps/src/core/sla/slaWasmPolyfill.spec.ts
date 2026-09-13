import { describe, expect, it } from 'vitest'
import { createSlaWasmPolyfill } from './slaWasmPolyfill'
import { runSlaPrepare, slaRleEncodeRaster } from './slaPrepareBridge'
import { loadSlaWasmRuntime, resetSlaWasmRuntimeCache } from './slaWasmRuntime'

describe('slaWasmPolyfill', () => {
  it('rle_encode compresses alternating runs (photon type 0)', () => {
    const api = createSlaWasmPolyfill(4096)
    // 10 white then 10 black
    for (let i = 0; i < 10; i++) api.heap[i] = 255
    for (let i = 10; i < 20; i++) api.heap[i] = 0
    const n = api.rle_encode(0, 0, 20, 0xff, 64, 0)
    expect(n).toBeGreaterThanOrEqual(2)
    expect(n).toBeLessThan(20)
  })

  it('slaRleEncodeRaster returns bytes', () => {
    const api = createSlaWasmPolyfill()
    const raster = new Uint8Array(64).fill(255)
    const out = slaRleEncodeRaster(api, raster)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(64)
  })
})

describe('slaPrepareBridge', () => {
  it('runSlaPrepare loads polyfill or wasm and smokes rle', async () => {
    resetSlaWasmRuntimeCache()
    const r = await runSlaPrepare({ forcePolyfill: true })
    expect(r.ok).toBe(true)
    expect(r.prepared).toBe(true)
    expect(r.runtime.source).toBe('polyfill')
    expect(r.runtime.exports).toContain('render')
  })

  it('loadSlaWasmRuntime prefers disk wasm when exports present else polyfill', async () => {
    resetSlaWasmRuntimeCache()
    const r = await loadSlaWasmRuntime()
    expect(['wasm', 'polyfill']).toContain(r.source)
    expect(typeof r.api.rle_encode).toBe('function')
    expect(typeof r.api.render).toBe('function')
  })
})
