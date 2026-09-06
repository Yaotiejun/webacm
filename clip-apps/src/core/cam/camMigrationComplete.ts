import { compareBundledGripCamSectionMotion } from '@/core/cam/camGripFixtureBundledSections'
import {
  compareLegacyCamExportToGripCapture,
  GRIP_CAM_LEGACY_CAPTURE_SECTIONS,
} from '@/core/cam/camLegacyExportStream'
import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'
import type { CamJobResult } from '@/types/camJob'

export interface CamMigrationCompleteResult {
  ok: boolean
  checks: {
    bundledSectionMotion: boolean
    bundledCapturePins: boolean
    captureSectionsDeclared: boolean
  }
  errors: string[]
}

function bundledFixtureResult(): CamJobResult {
  return {
    backend: 'kiri-cam',
    profileName: 'default',
    deviceName: 'shape_cam_cam',
    processName: 'default',
    stockSize: { x: 30, y: 30, z: 1 },
    zSettings: { anchor: null, bottom: null, clearance: null },
    summary: {
      opCount: 1,
      toolCountUsed: 1,
      estimatedTotalPasses: 1,
      estimatedTotalPathSegments: 100,
      estimatedMachiningTimeMinutes: 1,
    },
    perOp: [],
    notes: [
      'legacy cam_export enabled',
      `legacy cam_export sections: ${GRIP_CAM_LEGACY_CAPTURE_SECTIONS.join(', ')}`,
    ],
    gcodeText: gripFixtureGcode,
  }
}

/** Migration gate: bundled grip capture G-code pins (no live legacy bundle required). */
export async function evaluateCamMigrationComplete(): Promise<CamMigrationCompleteResult> {
  const errors: string[] = []

  const motion = compareBundledGripCamSectionMotion()
  const bundledSectionMotion = motion.match
  if (!bundledSectionMotion) errors.push(`section motion: ${motion.detail}`)

  const cmp = await compareLegacyCamExportToGripCapture(bundledFixtureResult())
  const bundledCapturePins = cmp.ok
  if (!bundledCapturePins) errors.push(`capture pins: ${cmp.detail}`)

  const captureSectionsDeclared = GRIP_CAM_LEGACY_CAPTURE_SECTIONS.length >= 3
  if (!captureSectionsDeclared) errors.push('capture sections manifest empty')

  return {
    ok: errors.length === 0,
    checks: {
      bundledSectionMotion,
      bundledCapturePins,
      captureSectionsDeclared,
    },
    errors,
  }
}
