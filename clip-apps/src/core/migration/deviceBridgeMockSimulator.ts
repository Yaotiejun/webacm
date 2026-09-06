import { DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM } from '@/core/migration/deviceBridgeCarveraHandshake'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from '@/core/migration/deviceBridgeCarveraMockStatus'
import {
  formatGridbotAdvancedOk,
  parseGridbotLineNo,
} from '@/core/migration/deviceBridgeGridbotProtocol'

export interface CarveraMockState {
  alarmed: boolean
}

export interface GridbotMockState {
  nozzleTarget: number
  bedTarget: number
  bufFree: number
  plnFree: number
}

/** Pure mock of device-bridge `createCarveraMockBackend` ack path (no timers). */
export function simulateCarveraMockCommand(
  cmd: string,
  state: CarveraMockState,
): { lines: string[]; state: CarveraMockState } {
  const lines: string[] = []
  const trimmed = cmd.trim()
  const next = { ...state }

  if (/^(\$|\?)\S+/i.test(trimmed)) {
    lines.push('error:2')
  } else if (!next.alarmed && /\$H\b/i.test(trimmed)) {
    next.alarmed = true
    lines.push(DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM)
  } else if (trimmed === '?' || trimmed.toLowerCase() === 'status') {
    lines.push(DEVICE_BRIDGE_CARVERA_MOCK_STATUS)
    lines.push('ok')
  } else if (trimmed === '$$') {
    lines.push('$0=10', '$1=25', 'ok')
  } else {
    lines.push('ok')
  }

  return { lines, state: next }
}

/** Pure mock of device-bridge `createGridbotMockBackend` command handler. */
export function simulateGridbotMockCommand(
  line: string,
  state: GridbotMockState,
): { lines: string[]; state: GridbotMockState } {
  const lines: string[] = []
  const next = { ...state }

  const m104 = line.match(/M104\s+S(\d+(?:\.\d+)?)/i)
  if (m104) next.nozzleTarget = Number(m104[1])
  const m140 = line.match(/M140\s+S(\d+(?:\.\d+)?)/i)
  if (m140) next.bedTarget = Number(m140[1])

  const body = line.replace(/^N\d+\s+/, '')

  if (/^M114\b/i.test(body)) {
    lines.push('X:0.00 Y:0.00 Z:0.00 E:0.00', 'ok')
    return { lines, state: next }
  }

  if (/^M105\b/i.test(body)) {
    lines.push(
      `ok T:${next.nozzleTarget.toFixed(1)} /${next.nozzleTarget.toFixed(1)} B:${next.bedTarget.toFixed(1)} /${next.bedTarget.toFixed(1)}`,
    )
    return { lines, state: next }
  }

  if (/^G\d|^M\d/i.test(body)) {
    const lineNo = parseGridbotLineNo(line)
    next.bufFree = Math.max(1, next.bufFree - 1)
    next.plnFree = Math.max(1, next.plnFree - 1)
    lines.push(formatGridbotAdvancedOk(lineNo, next.bufFree, next.plnFree))
    return { lines, state: next }
  }

  lines.push('ok')
  return { lines, state: next }
}
