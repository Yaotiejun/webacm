/**
 * Capture dual-extruder fingerprint stability (debug / pin helper).
 * Run: npx vitest run src/core/slicer/fdmDualExtruderFingerprint.stability.spec.ts
 */
import { describe, expect, it } from 'vitest'
import { buildKiriSettingsPayload } from './kiriSettingsAdapter'
import { runLegacyFdmSliceBridgeMulti } from './kiriLegacyBridge'
import {
  assertDualExtruderPurgeGcode,
  buildDualExtruderCubes,
  dualExtruderDeviceProfile,
  dualExtruderPurgeProcess,
} from './fdmDualExtruderPurgeProfile'
import {
  dualExtruderStructuralDigest,
  normalizeFdmGcodeForMigrationFingerprint,
  sha256HexUtf8,
} from './fdmGcodeNormalize'

async function runOnce(): Promise<{ hash: string; digest: string; g1: number }> {
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
    timeoutMs: 120_000,
  })
  const prepared = await runLegacyFdmPrepare(
    sliced.widgets,
    sliced.settings,
    undefined,
    globalThis as any,
  )
  const collected = collectFdmExportGcode(fdm_export, prepared.print)
  assertDualExtruderPurgeGcode(collected.gcodeText)
  const fp = normalizeFdmGcodeForMigrationFingerprint(collected.gcodeText)
  const digest = dualExtruderStructuralDigest(collected.gcodeText)
  return {
    hash: await sha256HexUtf8(digest),
    digest,
    g1: collected.gcodeText.split('\n').filter((l) => /^G1\b/i.test(l.trim())).length,
  }
}

describe('fdmDualExtruderFingerprint.stability', () => {
  it(
    'structural digest is stable across 3 runs (full gcode hash may vary)',
    async () => {
      const runs = [await runOnce(), await runOnce(), await runOnce()]
      // eslint-disable-next-line no-console
      console.info(
        '[dual-extruder-stability]',
        runs.map((r) => ({ hash: r.hash.slice(0, 12), digest: r.digest, g1: r.g1 })),
      )
      expect(runs[0]!.digest).toBe(runs[1]!.digest)
      expect(runs[1]!.digest).toBe(runs[2]!.digest)
    },
    300_000,
  )
})
