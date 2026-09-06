export type DeviceLineKind = 'ok' | 'alarm' | 'status' | 'position' | 'bridge' | 'other'

export function classifyDeviceIncomingLine(line: string): DeviceLineKind {
  const trimmed = line.trim()
  if (!trimmed) return 'other'
  if (trimmed.startsWith('[bridge]')) return 'bridge'
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('alarm:') || lower.startsWith('error:') || trimmed.startsWith('!!')) return 'alarm'
  if (lower === 'ok' || lower.startsWith('ok ')) return 'ok'
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return 'status'
  if (/\bX-?\d/.test(trimmed) && /\bY-?\d/.test(trimmed) && /\bZ-?\d/.test(trimmed)) return 'position'
  if (/X:.*Y:.*Z:/i.test(trimmed)) return 'position'
  return 'other'
}
