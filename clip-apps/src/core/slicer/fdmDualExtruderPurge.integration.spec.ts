import { describe, expect, it } from 'vitest'
import { buildKiriSettingsPayload } from './kiriSettingsAdapter'
import { runLegacyFdmSliceBridgeMulti } from './kiriLegacyBridge'
import {
  assertDualExtruderPurgeGcode,
  buildDualExtruderCubes,
  dualExtruderDeviceProfile,
  dualExtruderPurgeProcess,
  FDM_DUAL_EXTRUDER_GOLDEN_SHA256,
} from './fdmDualExtruderPurgeProfile'
import {
  dualExtruderStructuralDigest,
  sha256HexUtf8,
} from './fdmGcodeNormalize'

describe('fdmDualExtruderPurge.integration', () => {
  it(
    'multi-widget dual extruder + purge tower emits T0/T1 G-code',
    async () => {
      const { newPoint } = await import('./kiriLegacyGeo')
      const { fdm_slice, fdm_export, sliceAll } = await import('./kiriLegacyFdmBootstrap')
      const { pointsFromVertices, computeVertexBounds3D } = await import('./geometry')
      const { runLegacyFdmPrepare } = await import('./fdmLegacyPrepare')
      const { collectFdmExportGcode } = await import('./fdmExportCollect')

      const process = dualExtruderPurgeProcess()
      const { specs } = buildDualExtruderCubes()
      const settings = buildKiriSettingsPayload({
        process,
        modelCount: 2,
        deviceProfile: dualExtruderDeviceProfile(),
        controllerProfile: null,
      })
      // job bounds for sliceAll grid_id
      ;(settings as any).bounds = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 28, y: 10, z: 10 },
      }

      const widgets = specs.map((s) => {
        const vb = computeVertexBounds3D(s.vertices)!
        return {
          id: s.id,
          vb,
          points: pointsFromVertices(s.vertices, newPoint),
          extruder: s.extruder,
        }
      })

      const sliced = await runLegacyFdmSliceBridgeMulti({
        settings,
        widgets,
        fdmSliceImpl: fdm_slice,
        fdmSliceAllImpl: sliceAll,
        workerScope: globalThis as any,
        timeoutMs: 120_000,
      })
      expect(sliced.widgets).toHaveLength(2)
      expect(sliced.widgets[0]!.anno.extruder).toBe(0)
      expect(sliced.widgets[1]!.anno.extruder).toBe(1)
      expect(sliced.layers.length).toBeGreaterThan(0)

      const prepared = await runLegacyFdmPrepare(
        sliced.widgets,
        sliced.settings,
        undefined,
        globalThis as any,
      )
      expect(prepared.print.output.length).toBeGreaterThan(0)

      const collected = collectFdmExportGcode(fdm_export, prepared.print)
      expect(collected.gcodeText.length).toBeGreaterThan(80)
      assertDualExtruderPurgeGcode(collected.gcodeText)

      const digest = dualExtruderStructuralDigest(collected.gcodeText)
      const hash = await sha256HexUtf8(digest)
      // eslint-disable-next-line no-console
      console.info('[fdm-dual-extruder] structural digest', digest)
      // eslint-disable-next-line no-console
      console.info('[fdm-dual-extruder] fingerprint SHA-256', hash)
      if (FDM_DUAL_EXTRUDER_GOLDEN_SHA256) {
        expect(hash).toBe(FDM_DUAL_EXTRUDER_GOLDEN_SHA256)
      }
    },
    180_000,
  )
})
