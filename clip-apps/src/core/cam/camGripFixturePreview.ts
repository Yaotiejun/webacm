import { normalizeCamGcodeText } from '@/core/cam/camGcodeNormalize'
import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'

/** Normalized grip CAM export placeholder for viewport / migration preview. */
export function getGripCamFixturePreviewGcode(): string {
  return normalizeCamGcodeText(gripFixtureGcode)
}
