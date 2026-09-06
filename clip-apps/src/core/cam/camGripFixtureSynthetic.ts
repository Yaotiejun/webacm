import { collectCamExportGcode, type CamExportCollectResult } from '@/core/cam/camExportCollect'

/** Replay grip-shaped `cam_export` stream (section markers + CRLF batches). */
export function emitGripCamFixtureSyntheticExport(online: (chunk: unknown) => void): void {
  online({ section: 'header' })
  online('; Kiri:Moto CAM export (shape_cam migration fixture)\r\n')
  online('G21\r\nG90\r\n')
  online('G0 Z5\r\n')
  online({ section: 'op-0-rough' })
  online('G0 X0 Y0\r\n')
  online('G1 Z0 F500\r\n')
  online('G1 X20 Y0 F1200\r\n')
  online('G1 X20 Y15 F1200\r\n')
  online('G1 X0 Y15 F1200\r\n')
  online('G1 X0 Y0 F1200\r\n')
  online({ section: 'op-1-finish' })
  online('G0 Z2\r\n')
  online('G1 X10 Y7.5 Z-0.5 F800\r\n')
  online('G2 X15 Y7.5 I2.5 J0 F600\r\n')
  online({ section: 'footer' })
  online('G0 Z10\r\n')
  online('M5\r\n')
}

export function runGripCamFixtureSyntheticExport(): CamExportCollectResult {
  return collectCamExportGcode((_print, online) => emitGripCamFixtureSyntheticExport(online), {})
}

/**
 * Deterministic CAM export shaped like grip `cam_export` (section markers + CRLF batches).
 * Used as the bundled migration fixture until a live `runCamJob` capture replaces the file.
 */
export function buildGripCamFixtureSyntheticGcode(): string {
  return runGripCamFixtureSyntheticExport().gcodeText
}

export function buildGripCamFixtureSyntheticSections(): string[] {
  return [...runGripCamFixtureSyntheticExport().sections]
}
