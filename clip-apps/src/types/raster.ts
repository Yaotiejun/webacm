export type RasterMode = 'planar' | 'radial' | 'tracing'

export interface RasterTracingPath {
  points: Array<[number, number]>
}

export interface RasterConfig {
  mode: RasterMode
  resolution: number
  rotationStep: number
  xStep: number
  yStep: number
  zFloor: number
  tracingStep: number
}

export interface RasterRequest {
  terrainTriangles: Float32Array
  toolTriangles: Float32Array
  config: RasterConfig
  tracingPaths?: RasterTracingPath[]
  preferredEngine?: 'auto' | 'cpu' | 'webgpu'
  resetGpuBufferPool?: boolean
}

export interface RasterPath {
  // points as [x,y,z] in pixel coords + depth
  points: Array<[number, number, number]>
}

export interface RasterResultSummary {
  pathCount: number
  pointCount: number
  engine?: 'webgpu' | 'cpu'
  elapsedMs?: number
  tracingBudget?: {
    maxPoints: number
    normalizedPoints: number
    sampledPoints: number
    finalPoints: number
    fallbackScale: number
    budgetApplied: boolean
  }
  gpuBufferPool?: {
    hits: number
    misses: number
    reuses: number
    newAllocs: number
  }
  gpuStagesMs?: {
    rasterize: number
    toolpath: number
    tracing: number
    totalGpu: number
  }
  /** Set when `VITE_RASTER_GRIP_BRIDGE` routed through grip `raster-path-main`. */
  gripBridge?: boolean
}

export interface RasterResult {
  paths: RasterPath[]
  summary: RasterResultSummary
}
