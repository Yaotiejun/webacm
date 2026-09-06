/**
 * @vitest-environment jsdom
 * Live legacy `cam_slice` → `cam_prepare` → `cam_export` stream vs bundled grip capture.
 * Not in migration gate (`*.live.spec.ts`). Requires VITE_KIRI_LEGACY_CAM=1 and working legacy bundle.
 *
 *   npx vitest run src/core/cam/camEngine.legacy.exportStream.live.spec.ts
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getKiriCamLegacyHealth } from './kiriCamRuntime'
import { buildCamCaptureGeometry, buildCamCaptureProfile } from './camCaptureProfile'
import {
  compareLegacyCamExportToGripCapture,
  GRIP_CAM_LEGACY_CAPTURE_SECTIONS,
} from './camLegacyExportStream'
import { isCamLegacyExportAvailable, runCamLiveExportGripParity } from './camLiveExportRun'
import { collectCamExportSectionDepthStats } from './camGcodeDepthStats'
import { collectCamExportGcode } from './camExportCollect'
import { buildKiriCamWidget } from './kiriCamWidget'
import { runLegacyCamPrepare } from './camLegacyPrepare'

const legacyExportAvailable = () => isCamLegacyExportAvailable()

function buildKiriCamSettings(
  profile: ReturnType<typeof buildCamCaptureProfile>,
  geometry: ReturnType<typeof buildCamCaptureGeometry>,
) {
  const { device, process, tools } = profile
  const stock = {
    x: process.camStockX ?? 0,
    y: process.camStockY ?? 0,
    z: process.camStockZ ?? 0,
    center: { x: 0, y: 0, z: 0 },
  }
  const deviceLabel = String(device.deviceName ?? 'shape_cam_cam')
  return {
    device,
    tools,
    process,
    mode: String(device.mode ?? 'CAM'),
    filter: { CAM: deviceLabel, FDM: deviceLabel },
    controller: { units: 'mm', dark: false, alignTop: false, devel: false },
    stock,
    origin: { x: 0, y: 0, z: 0 },
    bounds: {
      min: { x: geometry.bbox.minX, y: geometry.bbox.minY, z: geometry.bbox.minZ },
      max: { x: geometry.bbox.maxX, y: geometry.bbox.maxY, z: geometry.bbox.maxZ },
    },
  }
}

describe('camEngine legacy cam_export stream.live', () => {
  it.skipIf(!legacyExportAvailable())(
    'runCamJob emits section markers matching grip capture fixture',
    async () => {
      const { compare } = await runCamLiveExportGripParity()
      const cmp = compare!
      if (!cmp.ok) {
        // eslint-disable-next-line no-console
        console.error('[legacy cam_export]', cmp.detail)
      }
      expect(cmp.sectionsMatch).toBe(true)
      expect(cmp.sections).toEqual([...GRIP_CAM_LEGACY_CAPTURE_SECTIONS])
      expect(cmp.fingerprintMatch).toBe(true)
      expect(cmp.zDepthMatch).toBe(true)
      expect(cmp.perOpZDepthMatch).toBe(true)
      expect(cmp.motionMatch).toBe(true)
      expect(cmp.ok).toBe(true)
    },
    180_000,
  )

  it.skipIf(!legacyExportAvailable())(
    'collectCamExportGcode on live print.output yields same sections as runCamJob',
    async () => {
      const { kiriCamRuntime, getKiriCamImpls } = await import('./kiriCamRuntime')
      await kiriCamRuntime.init()
      const profile = buildCamCaptureProfile()
      const geometry = buildCamCaptureGeometry()
      const settings = buildKiriCamSettings(profile, geometry)
      const { buildKiriCamWidget } = await import('./kiriCamWidget')
      const widget = buildKiriCamWidget(geometry)
      const { camSliceImpl, camExportImpl } = getKiriCamImpls()
      await camSliceImpl!(settings, widget, () => {}, () => {})
      const prepared = await runLegacyCamPrepare([widget], settings)
      const print = {
        settings,
        widgets: [widget],
        output: prepared.output,
        constReplace(line: string) {
          return line
        },
      }
      const collected = collectCamExportGcode(camExportImpl!, print)
      expect(collected.sections).toEqual([...GRIP_CAM_LEGACY_CAPTURE_SECTIONS])
      expect(collected.gcodeText.length).toBeGreaterThan(100)
      expect(collected.gcodeText).toMatch(/G0|G1/)

      const { depths } = collectCamExportSectionDepthStats(camExportImpl!, print)
      const rough = depths.find((d) => d.section === 'op-0-rough')
      expect(rough).toBeDefined()
      expect(rough!.explicitZLines).toBeGreaterThan(0)
    },
    180_000,
  )

  it('reports legacy health snapshot', () => {
    const h = getKiriCamLegacyHealth()
    expect(typeof h.hasExport).toBe('boolean')
    expect(typeof h.hasSlice).toBe('boolean')
  })
})
