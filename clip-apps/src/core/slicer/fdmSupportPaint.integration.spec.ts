import { describe, expect, it } from 'vitest'
import { runLegacyFdmSliceBridge } from './kiriLegacyBridge'
import type { FdmProcess } from '@/types/process'
import { buildKiriSettingsPayload } from './kiriSettingsAdapter'

function minimalManualProcess(): FdmProcess {
  return {
    processName: 'paint',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 210,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: true,
    sliceSupportType: 'manual',
    sliceSupportDensity: 0.25,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 4,
    sliceSupportAngle: 55,
    outputRetractDist: 0.5,
    outputRetractSpeed: 30,
    outputFanSpeed: 0,
    outputFanLayer: 0,
    outputMinLayerTime: 0,
    zHopDistance: 0,
    enableBrim: false,
    brimCount: 0,
    brimOffset: 0,
    enableRaft: false,
    raftSpacing: 0,
    ranges: [],
  }
}

function cubeVertices(): Float32Array {
  return new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 10, 10, 10, 0, 10, 0, 0,
    10, 0, 10, 10, 10, 10, 10, 0, 0, 0, 0, 10, 10, 0, 10, 0, 0, 0, 0, 0, 0, 10, 0, 10, 10, 10, 0, 0, 10,
    10, 0, 10, 10, 10, 10, 0, 0, 10, 10, 10, 10, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0, 0, 0, 0, 0, 0, 10,
    10, 0, 10, 0, 10, 0, 0, 10, 10, 10, 10, 10, 0, 10, 0, 10, 10, 10, 10, 10, 0,
  ])
}

describe('fdmSupportPaint.integration', () => {
  it(
    'manual paint points produce support slices',
    async () => {
      const { newPoint } = await import('./kiriLegacyGeo')
      const { fdm_slice } = await import('./kiriLegacyFdmBootstrap')
      const { pointsFromVertices, computeVertexBounds3D } = await import('./geometry')

      const vertices = cubeVertices()
      const vb = computeVertexBounds3D(vertices)!
      const pts = pointsFromVertices(vertices, newPoint)
      const settings = buildKiriSettingsPayload({
        process: minimalManualProcess(),
        modelCount: 1,
        deviceProfile: null,
        controllerProfile: null,
      })

      const out = await runLegacyFdmSliceBridge({
        settings,
        vb,
        points: pts,
        fdmSliceImpl: fdm_slice,
        workerScope: globalThis as any,
        timeoutMs: 90_000,
        paint: [
          { point: { x: 5, y: 5, z: 8 }, radius: 3 },
          { point: { x: 5, y: 5, z: 5 }, radius: 3 },
        ],
      })

      expect(out.widget.anno.paint.length).toBe(2)
      const withSupports = (out.widget.slices || []).filter(
        (s: any) => Array.isArray(s.supports) && s.supports.length > 0,
      )
      expect(withSupports.length).toBeGreaterThan(0)
      // Preview should include support paths when paint generated supports
      const supportPaths = out.layers.flatMap((l) => l.paths.filter((p) => p.type === 'support'))
      expect(supportPaths.length).toBeGreaterThan(0)
    },
    120_000,
  )
})
