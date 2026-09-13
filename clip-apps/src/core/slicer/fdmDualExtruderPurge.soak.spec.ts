/**
 * Live / soak gate for dual-extruder + purge (env-gated).
 * Run: FDM_DUAL_EXTRUDER_SOAK=1 npm run soak:fdm:dual-extruder
 */
import { describe, expect, it } from 'vitest'

const enabled = String(process.env.FDM_DUAL_EXTRUDER_SOAK ?? '') === '1'

describe.runIf(enabled)('fdmDualExtruderPurge.soak', () => {
  it(
    'reuses integration dual-extruder pipeline as soak gate',
    async () => {
      // Delegate to the same pipeline; fail loud if legacy FDM missing.
      const { buildKiriSettingsPayload } = await import('./kiriSettingsAdapter')
      const { runLegacyFdmSliceBridgeMulti } = await import('./kiriLegacyBridge')
      const {
        assertDualExtruderPurgeGcode,
        buildDualExtruderCubes,
        dualExtruderDeviceProfile,
        dualExtruderPurgeProcess,
      } = await import('./fdmDualExtruderPurgeProfile')
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
        timeoutMs: 180_000,
      })
      const prepared = await runLegacyFdmPrepare(
        sliced.widgets,
        sliced.settings,
        undefined,
        globalThis as any,
      )
      const collected = collectFdmExportGcode(fdm_export, prepared.print)
      assertDualExtruderPurgeGcode(collected.gcodeText)
      expect(sliced.widgets.map((w) => w.anno.extruder)).toEqual([0, 1])
    },
    240_000,
  )
})

describe.runIf(!enabled)('fdmDualExtruderPurge.soak (skipped)', () => {
  it('set FDM_DUAL_EXTRUDER_SOAK=1 to enable', () => {
    expect(enabled).toBe(false)
  })
})
