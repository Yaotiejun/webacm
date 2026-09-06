/**
 * @vitest-environment jsdom
 * Live grip-bridge radial checksum vs grip `radial-baseline.json`.
 * $env:RASTER_GRIP_GOLDEN=1; npm run golden:raster
 */
import { describe, expect, it } from 'vitest'
import { runRasterGripBridgeCore } from '@/core/raster/rasterGripBridgeRunner'
import { GRIP_RADIAL_BASELINE_EXPECTATIONS } from '@/core/raster/rasterGripBaselineExpectations'
import { buildGripRadialBaselineRasterRequest } from '@/core/raster/rasterGripPresets'
import { gripRadialPathsChecksum } from '@/core/raster/rasterGripPathChecksum'
import {
  gripBaselineFixturesPresent,
  loadGripBaselineStlPairFromDisk,
} from '@/core/raster/rasterGripBaselineLoader.node'

const golden = process.env.RASTER_GRIP_GOLDEN === '1'
const fixturesOk = golden && gripBaselineFixturesPresent()
const workerRuntime = typeof Worker !== 'undefined'
const canRun = fixturesOk && workerRuntime

describe.skipIf(!canRun)('rasterGripRadialGolden.live', () => {
  it('grip bridge radial run matches baseline checksum and strip count', async () => {
    const pair = loadGripBaselineStlPairFromDisk()
    expect(pair.meshMatch).toBe(true)

    const req = buildGripRadialBaselineRasterRequest(pair.terrainTriangles, pair.toolTriangles)
    const result = await runRasterGripBridgeCore(req)

    expect(result.summary.gripBridge).toBe(true)
    expect(result.summary.pathCount).toBe(GRIP_RADIAL_BASELINE_EXPECTATIONS.numStrips)
    expect(result.summary.pointCount).toBe(GRIP_RADIAL_BASELINE_EXPECTATIONS.totalPoints)

    expect(gripRadialPathsChecksum(result.paths)).toBe(GRIP_RADIAL_BASELINE_EXPECTATIONS.checksum)
  }, 300_000)
})
