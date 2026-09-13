import type { CamDeviceConfig } from '@/types/cam'

/**
 * Normalize Kiri `dev/cam` JSON into clip-apps `CamDeviceConfig`.
 * Keeps gcode macros / bed envelope; drops process profiles (applied separately).
 */
export function normalizeCamDeviceJson(raw: Record<string, unknown>, fallbackName: string): CamDeviceConfig {
  const asStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String)
    if (typeof v === 'string' && v.trim()) return [v]
    return []
  }

  const num = (v: unknown, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  return {
    mode: 'CAM',
    deviceName: String(raw.deviceName ?? fallbackName),
    bedHeight: num(raw.bedHeight, 2.5),
    bedWidth: num(raw.bedWidth, 220),
    bedDepth: num(raw.bedDepth, 220),
    maxHeight: num(raw.maxHeight, 100),
    originCenter: Boolean(raw.originCenter),
    spindleMax: num(raw.spindleMax, 10000),
    gcodeSpace: raw.gcodeSpace !== false,
    gcodeStrip: Boolean(raw.gcodeStrip),
    gcodeFExt: String(raw.gcodeFExt ?? 'nc'),
    gcodePre: asStringArray(raw.gcodePre),
    gcodePost: asStringArray(raw.gcodePost),
    gcodeDwell: asStringArray(raw.gcodeDwell),
    gcodeSpindle: asStringArray(raw.gcodeSpindle),
    gcodeChange: asStringArray(raw.gcodeChange),
    ...(typeof raw.internal === 'number' ? { internal: raw.internal } : {}),
    ...(typeof raw.new === 'boolean' ? { new: raw.new } : {}),
  }
}
