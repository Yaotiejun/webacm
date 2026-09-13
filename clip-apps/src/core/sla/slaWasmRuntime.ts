/**
 * Load kiri-sla.wasm (emcc) or fall back to TS polyfill with the same API.
 * Matches legacy sla_prepare env imports: reportf / reporti.
 */
import { createSlaWasmPolyfill, type SlaWasmApi } from '@/core/sla/slaWasmPolyfill'

export type SlaWasmLoadResult = {
  api: SlaWasmApi
  source: 'wasm' | 'polyfill'
  byteLength?: number
  exports: string[]
}

let cached: SlaWasmLoadResult | null = null

function wrapInstance(instance: WebAssembly.Instance, byteLength: number): SlaWasmApi {
  const exports = instance.exports as Record<string, unknown>
  const memory = exports.memory as WebAssembly.Memory
  const render = exports.render as (m: number, i: number, o: number) => number
  const rle_encode = exports.rle_encode as (
    m: number,
    inn: number,
    ilen: number,
    mask: number,
    out: number,
    type: number,
  ) => number
  if (typeof render !== 'function' || typeof rle_encode !== 'function') {
    throw new Error('kiri-sla.wasm missing render/rle_encode exports')
  }
  return {
    heap: new Uint8Array(memory.buffer),
    memory: {
      get buffer() {
        return memory.buffer
      },
      grow: (pages: number) => memory.grow(pages),
    },
    render: (m, i, o) => {
      const r = render(m, i, o)
      // refresh heap view after possible growth inside wasm
      return r
    },
    rle_encode: (m, inn, ilen, mask, out, type) => rle_encode(m, inn, ilen, mask, out, type),
  }
}

async function fetchWasmBytes(urls: string[]): Promise<{ bytes: ArrayBuffer; url: string } | null> {
  for (const url of urls) {
    try {
      if (typeof fetch === 'function' && (url.startsWith('/') || url.startsWith('http'))) {
        const res = await fetch(url)
        if (!res.ok) continue
        const bytes = await res.arrayBuffer()
        if (bytes.byteLength < 256) continue
        return { bytes, url }
      }
    } catch {
      /* next */
    }
  }
  // Node/vitest: read from public/
  try {
    const { readFileSync, existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const rel of ['public/wasm/kiri-sla.wasm', 'public/kiri-sla.wasm']) {
      const abs = resolve(process.cwd(), rel)
      if (!existsSync(abs)) continue
      const buf = readFileSync(abs)
      if (buf.byteLength < 256) continue
      return { bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), url: abs }
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function loadSlaWasmRuntime(opts?: {
  forcePolyfill?: boolean
  urls?: string[]
}): Promise<SlaWasmLoadResult> {
  if (cached && !opts?.forcePolyfill) return cached
  if (opts?.forcePolyfill) {
    const api = createSlaWasmPolyfill()
    cached = { api, source: 'polyfill', exports: ['render', 'rle_encode'] }
    return cached
  }

  const found = await fetchWasmBytes(opts?.urls ?? ['/wasm/kiri-sla.wasm', '/kiri-sla.wasm'])
  if (found) {
    try {
      const result = await WebAssembly.instantiate(found.bytes, {
        env: {
          reportf: (_a: number, _b: number) => {},
          reporti: (_a: number, _b: number) => {},
        },
      })
      const api = wrapInstance(result.instance, found.bytes.byteLength)
      const exportNames = Object.keys(result.instance.exports)
      if (!exportNames.includes('render') || !exportNames.includes('rle_encode')) {
        throw new Error('incomplete exports: ' + exportNames.join(','))
      }
      cached = {
        api,
        source: 'wasm',
        byteLength: found.bytes.byteLength,
        exports: exportNames,
      }
      return cached
    } catch {
      /* fall through to polyfill */
    }
  }

  const api = createSlaWasmPolyfill()
  cached = { api, source: 'polyfill', exports: ['render', 'rle_encode'] }
  return cached
}

export function getCachedSlaWasmRuntime(): SlaWasmLoadResult | null {
  return cached
}

export function resetSlaWasmRuntimeCache(): void {
  cached = null
}

/** Ensure linear memory can hold required bytes (legacy ensureSLAMemory). */
export function ensureSlaWasmMemory(api: SlaWasmApi, required: number): void {
  let available = api.memory.buffer.byteLength
  if (available >= required) {
    api.heap = new Uint8Array(api.memory.buffer)
    return
  }
  const page = 65536
  const pages = Math.ceil((required - available) / page)
  api.memory.grow(pages)
  api.heap = new Uint8Array(api.memory.buffer)
}
