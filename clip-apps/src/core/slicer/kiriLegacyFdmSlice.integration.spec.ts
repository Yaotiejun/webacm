import { describe, expect, it } from 'vitest'
import type { FdmProcess } from '@/types/process'
import { buildKiriSettingsPayload } from './kiriSettingsAdapter'
import { runLegacyFdmSliceBridge } from './kiriLegacyBridge'

function minimalProcess(): FdmProcess {
  return {
    processName: 'test',
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
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
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
    sliceAdaptive: false,
  }
}

/** Unit cube as 12 triangles (36 vertices). */
function cubeVertices(): Float32Array {
  const v = new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 10, 0,
    0, 0, 0, 10, 10, 0, 0, 10, 0,
    0, 0, 10, 10, 10, 10, 10, 0, 10,
    0, 0, 10, 0, 10, 10, 10, 10, 10,
    0, 0, 0, 0, 10, 10, 0, 10, 0,
    0, 0, 0, 0, 0, 10, 0, 10, 10,
    10, 0, 0, 10, 10, 0, 10, 10, 10,
    10, 0, 0, 10, 10, 10, 10, 0, 10,
    0, 0, 0, 10, 0, 10, 10, 0, 0,
    0, 0, 0, 0, 0, 10, 10, 0, 10,
    0, 10, 0, 0, 10, 10, 10, 10, 10,
    0, 10, 0, 10, 10, 10, 10, 10, 0,
  ])
  return v
}

describe('kiriLegacyFdmSlice.integration', () => {
  it(
    'runs real fdm_slice on a cube without throwing',
    async () => {
      const { newPoint } = await import('./kiriLegacyGeo')
      const { fdm_slice } = await import('./kiriLegacyFdmBootstrap')
      const { pointsFromVertices, computeVertexBounds3D } = await import('./geometry')

      const vertices = cubeVertices()
      const vb = computeVertexBounds3D(vertices)!
      const pts = pointsFromVertices(vertices, newPoint)
      const settings = buildKiriSettingsPayload({
        process: minimalProcess(),
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
        timeoutMs: 60_000,
      })

      expect(out.layers.length).toBeGreaterThan(0)
    },
    90_000,
  )
})
