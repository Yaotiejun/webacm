/**
 * Canonical inputs for `npm run capture:cam-fixture` (deterministic re-capture policy).
 */
import { canonicalizeCamProcessConfig } from '@/core/cam/camJobSummaryBridge'
import { clonePlain } from '@/core/clonePlain'
import type { CamJobInputGeometry, CamProfile } from '@/types/camJob'
import defaultDeviceJson from '@/core/cam/defaults/kiri-cam-device.json'
import defaultToolsJson from '@/core/cam/defaults/kiri-cam-tools.json'
import defaultProcessJson from '@/core/cam/defaults/kiri-cam-process.json'

export const CAM_CAPTURE_GEOMETRY_ID = 'stock-box'
export const CAM_CAPTURE_BBOX = Object.freeze({
  minX: -50,
  minY: -50,
  minZ: 0,
  maxX: 50,
  maxY: 50,
  maxZ: 10,
})

export function buildCamCaptureProfile(): CamProfile {
  return {
    device: clonePlain(defaultDeviceJson) as CamProfile['device'],
    tools: clonePlain(defaultToolsJson) as CamProfile['tools'],
    process: canonicalizeCamProcessConfig(clonePlain(defaultProcessJson) as CamProfile['process']),
  }
}

export function buildCamCaptureGeometry(): CamJobInputGeometry {
  return {
    id: CAM_CAPTURE_GEOMETRY_ID,
    bbox: { ...CAM_CAPTURE_BBOX },
    complexityHint: 1,
  }
}
