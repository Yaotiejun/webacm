import { classifyDeviceIncomingLine } from '@/core/devices/deviceLineKind'
import {
  isGridbotOkLine,
  parseGridbotErrorLine,
  parseGridbotM105Line,
  parseGridbotM114Line,
  parseGridbotResendLine,
} from '@/core/devices/gridbotLineParse'

export type GridbotLogKind = 'ok' | 'error' | 'temp' | 'position' | 'other'

export function classifyGridbotIncomingLogLine(
  text: string,
  direction: 'in' | 'out' | 'info',
): GridbotLogKind {
  if (direction === 'out') return 'ok'
  if (parseGridbotErrorLine(text) || parseGridbotResendLine(text) != null) return 'error'
  if (parseGridbotM105Line(text)) return 'temp'
  if (parseGridbotM114Line(text)) return 'position'
  if (isGridbotOkLine(text)) return 'ok'
  const kind = classifyDeviceIncomingLine(text)
  if (kind === 'ok') return 'ok'
  if (kind === 'alarm') return 'error'
  if (kind === 'position') return 'position'
  return 'other'
}
