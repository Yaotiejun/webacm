import type { CamJobInputGeometry } from '@/types/camJob'
import { buildSyntheticPreviewGcode } from '@/core/gcode/syntheticPreviewGcode'

/**
 * Diagnostic G-code when legacy `cam_export` is unavailable (slice-only / placeholder backend).
 */
export function buildCamPlaceholderGcode(geometry: CamJobInputGeometry, headerComment: string): string {
  const { bbox } = geometry
  const z = bbox.maxZ
  return buildSyntheticPreviewGcode({
    headerComment,
    firstMove: 'xyz',
    groups: [
      {
        comment: 'bbox top outline',
        points: [
          { x: bbox.minX, y: bbox.minY, z },
          { x: bbox.maxX, y: bbox.minY, z },
          { x: bbox.maxX, y: bbox.maxY, z },
          { x: bbox.minX, y: bbox.maxY, z },
          { x: bbox.minX, y: bbox.minY, z },
        ],
      },
    ],
  })
}
