declare module '@grip-raster-core/raster-path.js' {
  export class RasterPath {
    constructor(config?: Record<string, unknown>)
    init(): Promise<void>
    loadTool(params: { triangles: Float32Array }): Promise<unknown>
    loadTerrain(params: { triangles: Float32Array; zFloor?: number }): Promise<{
      bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
    } | null>
    generateToolpaths(params: Record<string, unknown>): Promise<{
      pathData?: Float32Array
      numScanlines?: number
      pointsPerLine?: number
      strips?: Array<{ pathData: Float32Array; numScanlines?: number; pointsPerLine?: number }>
    }>
    terminate(): Promise<void>
  }
}
