import type { DeviceLineKind } from '@/core/devices/deviceLineKind'
import { classifyDeviceIncomingLine } from '@/core/devices/deviceLineKind'

export type GrblLogKind = 'status' | 'alarm' | 'other'

export function classifyGrblIncomingLogLine(
  text: string,
  direction: 'in' | 'out' | 'info',
): GrblLogKind {
  if (direction === 'out') return 'status'
  const kind: DeviceLineKind = classifyDeviceIncomingLine(text)
  if (kind === 'alarm') return 'alarm'
  if (kind === 'ok' || kind === 'status') return 'status'
  const line = text.trim()
  const hasXYZ = /\bX-?\d/.test(line) || /\bY-?\d/.test(line) || /\bZ-?\d/.test(line)
  if (hasXYZ && !/^X-?\d.*Y-?\d.*Z-?\d\s*$/i.test(line)) return 'status'
  return 'other'
}
