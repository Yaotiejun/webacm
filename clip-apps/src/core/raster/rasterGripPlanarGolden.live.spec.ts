/**
 * @vitest-environment jsdom
 * Live grip-bridge planar checksum vs grip `planar-baseline.json`.
 * Not in default migration gate (slow, needs STLs + grip worker).
 *
 * PowerShell:
 *   npm run sync:grip-fixtures
 *   $env:RASTER_GRIP_GOLDEN=1; npm run golden:raster
 */
import { describe, expect, it } from 'vitest'
import { runRasterGripBridgeCore } from '@/core/raster/rasterGripBridgeRunner'
import { GRIP_PLANAR_BASELINE_EXPECTATIONS } from '@/core/raster/rasterGripBaselineExpectations'
import { buildGripPlanarBaselineRasterRequest } from '@/core/raster/rasterGripPresets'
import { gripPlanarPathsChecksum } from '@/core/raster/rasterGripPathChecksum'
import {
  gripBaselineFixturesPresent,
  loadGripBaselineStlPairFromDisk,
} from '@/core/raster/rasterGripBaselineLoader.node'

const golden = process.env.RASTER_GRIP_GOLDEN === '1'
const fixturesOk = golden && gripBaselineFixturesPresent()
/** grip `RasterPath` needs nested Workers (browser / Vite dev only). */
const workerRuntime = typeof Worker !== 'undefined'
const canRun = fixturesOk && workerRuntime

describe.skipIf(!canRun)('rasterGripPlanarGolden.live', () => {
  it('grip bridge planar run matches baseline checksum and path shape', async () => {
    const pair = loadGripBaselineStlPairFromDisk()
    expect(pair.meshMatch).toBe(true)

    const req = buildGripPlanarBaselineRasterRequest(pair.terrainTriangles, pair.toolTriangles)
    const result = await runRasterGripBridgeCore(req)

    expect(result.summary.gripBridge).toBe(true)
    expect(result.summary.pathCount).toBe(GRIP_PLANAR_BASELINE_EXPECTATIONS.numScanlines)
    expect(result.summary.pointCount).toBe(GRIP_PLANAR_BASELINE_EXPECTATIONS.toolpathSize)

    const checksum = gripPlanarPathsChecksum(result.paths)
    expect(checksum).toBe(GRIP_PLANAR_BASELINE_EXPECTATIONS.checksum)
  }, 300_000)
})
