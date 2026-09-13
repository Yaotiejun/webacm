import type { RasterRequest, RasterResult } from '@/types/raster'
import {
  buildRasterResultFromGripPlanar,
  gripPlanarToolpathToRasterPaths,
  type GripRasterBounds,
} from '@/core/raster/rasterGripPathAdapter'
import { RasterPath } from '@grip-raster-core/raster-path.js'

function asGripBounds(b: {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}): GripRasterBounds {
  return {
    min: { x: b.minX, y: b.minY, z: b.minZ },
    max: { x: b.maxX, y: b.maxY, z: b.maxZ },
  }
}

function calcBounds(triangles: Float32Array) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < triangles.length; i += 3) {
    const x = triangles[i] ?? 0
    const y = triangles[i + 1] ?? 0
    const z = triangles[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export type RasterGripBridgeProgress = (phase: string, percent: number) => void

/**
 * Run grip `raster-path-main` in-process (same logic as `raster-grip.worker.ts`).
 * Used by live golden tests; production uses the worker wrapper in `api/rasterGrip.ts`.
 */
export async function runRasterGripBridgeCore(
  data: RasterRequest,
  onProgress: RasterGripBridgeProgress = () => {},
): Promise<RasterResult> {
  const runStart = performance.now()
  const cfg = data.config
  const mode = cfg.mode === 'radial' ? 'radial' : 'planar'
  if (cfg.mode === 'tracing') {
    return { paths: [], summary: { pathCount: 0, pointCount: 0, engine: 'webgpu', gripBridge: true } }
  }

  const resolution = Math.max(0.01, cfg.resolution || 0.5)
  const rotationStep = Math.max(0.1, cfg.rotationStep || 5)
  const xStep = Math.max(1, Math.floor(cfg.xStep || 1))
  const yStep = Math.max(1, Math.floor(cfg.yStep || 1))
  const zFloor = Number.isFinite(cfg.zFloor) ? cfg.zFloor : -100

  let gripRaster: InstanceType<typeof RasterPath> | null = null
  try {
    onProgress('grip-init', 0.05)
    gripRaster = new RasterPath({
      mode,
      resolution,
      rotationStep,
      quiet: true,
      debug: false,
      // Lathe-adjacent: grip radial V3 (V4 true-lathe not in bundled worker yet).
      ...(mode === 'radial' && cfg.radialV3 ? { radialV3: true } : {}),
    })
    await gripRaster.init()

    onProgress('grip-load-tool', 0.2)
    await gripRaster.loadTool({ triangles: data.toolTriangles })

    onProgress('grip-load-terrain', 0.35)
    const terrainData = await gripRaster.loadTerrain({
      triangles: data.terrainTriangles,
      zFloor,
    })

    onProgress('grip-toolpath', 0.55)
    const toolpath = await gripRaster.generateToolpaths({
      xStep,
      yStep,
      zFloor,
      onProgress: (p: number) => onProgress('grip-toolpath', 0.55 + p * 0.4),
    })

    let paths: ReturnType<typeof gripPlanarToolpathToRasterPaths> = []
    if (mode === 'planar' && toolpath?.pathData && terrainData?.bounds) {
      const bounds = terrainData.bounds as GripRasterBounds
      paths = gripPlanarToolpathToRasterPaths({
        pathData: toolpath.pathData,
        numScanlines: toolpath.numScanlines ?? 0,
        pointsPerLine: toolpath.pointsPerLine ?? 0,
        terrainBounds: bounds,
        gridStep: resolution,
        xStep,
        yStep,
        zFloor,
      })
    } else if (mode === 'radial' && toolpath?.strips?.length) {
      const bounds = asGripBounds(calcBounds(data.terrainTriangles))
      for (const strip of toolpath.strips as Array<{
        pathData: Float32Array
        numScanlines?: number
        pointsPerLine?: number
      }>) {
        paths = paths.concat(
          gripPlanarToolpathToRasterPaths({
            pathData: strip.pathData,
            numScanlines: strip.numScanlines ?? 1,
            pointsPerLine: strip.pointsPerLine ?? strip.pathData.length,
            terrainBounds: bounds,
            gridStep: resolution,
            xStep,
            yStep,
            zFloor,
          }),
        )
      }
    }

    const result = buildRasterResultFromGripPlanar(paths, {
      engine: 'webgpu',
      elapsedMs: performance.now() - runStart,
    })
    result.summary.gripBridge = true
    onProgress('done', 1)
    return result
  } finally {
    if (gripRaster) {
      try {
        await gripRaster.terminate()
      } catch {
        // ignore
      }
    }
  }
}
