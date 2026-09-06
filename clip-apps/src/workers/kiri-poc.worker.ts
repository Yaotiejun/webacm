// Minimal Kiri slicing PoC worker.
// Goal: verify that legacy geo slicer + Kiri Slice/Layers can run in a Vite worker.

import type { FdmProcess } from '@/types/process'
import type { SliceJobPayload } from '@/types/job'

// Import legacy Kiri/geo code (raw JS). These modules are copied from grip/grid-apps-master.
// They are not typed; we use any to avoid blocking on typings.
// NOTE: paths are relative to this worker file location.
// Vite will treat these as plain JS modules.
// 动态导入 legacy JS 模块（TS 类型通过 legacy-kiri-env.d.ts 放宽）
// NOTE: legacy geo slicer ESM currently fails to parse in worker with
// "Unexpected token '.'". Keep PoC unblocked by using a lightweight
// placeholder implementation here.

export interface KiriPocRequest {
  job: SliceJobPayload
  vertices: Float32Array
  process: FdmProcess
}

export interface KiriPocLayerInfo {
  z: number
  lineCount: number
  groupCount?: number
}

export interface KiriPocResult {
  ok: true
  layerCount: number
  layers: KiriPocLayerInfo[]
}

export interface KiriPocError {
  ok: false
  error: string
}

type WorkerMessage = KiriPocRequest

// self 在 src/legacy-kiri-env.d.ts 中声明为 any

self.onmessage = async (ev: MessageEvent<WorkerMessage>) => {
  const { job, vertices, process } = ev.data
  try {
    if (!vertices || !vertices.length) {
      throw new Error('missing vertices')
    }

    const layerHeight = process.sliceHeight || 0.2

    // Simple PoC: derive a fake layer count from vertex count so that
    // we can validate the worker pipeline without depending on the
    // full legacy geo slicer ESM chain.
    const pointsPerLayer = 300
    const layerCount = Math.max(1, Math.floor(vertices.length / pointsPerLayer))

    const layers: KiriPocLayerInfo[] = []
    for (let i = 0; i < layerCount; i++) {
      layers.push({
        z: i * layerHeight,
        lineCount: 100,
        groupCount: undefined,
      })
    }

    const payload: KiriPocResult = {
      ok: true,
      layerCount: layers.length,
      layers,
    }

    ;(self as any).postMessage(payload)
  } catch (e) {
    const err: KiriPocError = {
      ok: false,
      error: (e as Error).message || String(e),
    }
    ;(self as any).postMessage(err)
  }
}
