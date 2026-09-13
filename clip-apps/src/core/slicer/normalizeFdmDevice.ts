import type { FdmDevice } from '@/types/device'

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v.trim()) return [v]
  return []
}

function valueOf<T>(v: unknown, fallback: T): T {
  return v == null ? fallback : (v as T)
}

/**
 * Normalize Kiri `dev/fdm` JSON (both legacy `pre`/`settings` and modern field names)
 * into clip-apps `FdmDevice`.
 */
export function normalizeFdmDeviceJson(raw: Record<string, unknown>, fallbackName: string): FdmDevice {
  const settings = (raw.settings as Record<string, unknown> | undefined) ?? {}
  const cmd = (raw.cmd as Record<string, unknown> | undefined) ?? {}
  const extrudersRaw = Array.isArray(raw.extruders) ? raw.extruders : []

  const extruders = extrudersRaw.map((e: any) => ({
    extFilament: Number(e?.extFilament ?? e?.filament ?? 1.75) || 1.75,
    extNozzle: Number(e?.extNozzle ?? e?.nozzle ?? 0.4) || 0.4,
    extOffsetX: Number(e?.extOffsetX ?? e?.offset_x ?? 0) || 0,
    extOffsetY: Number(e?.extOffsetY ?? e?.offset_y ?? 0) || 0,
  }))

  if (!extruders.length) {
    extruders.push({ extFilament: 1.75, extNozzle: 0.4, extOffsetX: 0, extOffsetY: 0 })
  }

  const bedWidth = Number(
    raw.bedWidth ?? settings.bed_width ?? settings.bedWidth ?? 220,
  )
  const bedDepth = Number(
    raw.bedDepth ?? settings.bed_depth ?? settings.bedDepth ?? 220,
  )
  const maxHeight = Number(
    raw.maxHeight ?? settings.build_height ?? settings.max_height ?? settings.maxHeight ?? 220,
  )

  return {
    deviceName: String(raw.deviceName ?? fallbackName),
    mode: 'FDM',
    bedWidth: Number.isFinite(bedWidth) ? bedWidth : 220,
    bedDepth: Number.isFinite(bedDepth) ? bedDepth : 220,
    bedHeight: Number(raw.bedHeight ?? settings.bed_height ?? 2.5) || 2.5,
    bedRound: Boolean(raw.bedRound ?? settings.bed_circle ?? false),
    bedBelt: Boolean(raw.bedBelt ?? settings.bed_belt ?? false),
    originCenter: Boolean(raw.originCenter ?? settings.origin_center ?? false),
    maxHeight: Number.isFinite(maxHeight) ? maxHeight : 220,
    gcodeTime: Number(raw.gcodeTime ?? settings.time_factor ?? 1) || 1,
    gcodeChange: asStringArray(raw.gcodeChange ?? raw['tool-change']),
    gcodePre: asStringArray(raw.gcodePre ?? raw.pre),
    gcodePost: asStringArray(raw.gcodePost ?? raw.post),
    gcodeProc: String(raw.gcodeProc ?? raw.proc ?? ''),
    gcodeFan: asStringArray(raw.gcodeFan ?? cmd.fan_power ?? raw.fan_power),
    gcodeFeature: asStringArray(raw.gcodeFeature ?? cmd.feature),
    gcodeTrack: asStringArray(raw.gcodeTrack ?? cmd.progress),
    gcodeLayer: asStringArray(raw.gcodeLayer ?? cmd.layer),
    gcodeFExt: String(raw.gcodeFExt ?? raw['file-ext'] ?? 'gcode'),
    extruders,
  }
}

export function fdmDeviceToLegacyProfile(device: FdmDevice): Record<string, unknown> {
  return {
    bedWidth: device.bedWidth,
    bedDepth: device.bedDepth,
    bedHeight: device.bedHeight,
    maxHeight: device.maxHeight,
    originCenter: device.originCenter,
    bedBelt: device.bedBelt,
    bedRound: device.bedRound,
    extruders: device.extruders,
    gcodePre: device.gcodePre,
    gcodePost: device.gcodePost,
    gcodeFan: device.gcodeFan,
    gcodeLayer: device.gcodeLayer,
    gcodeTrack: device.gcodeTrack,
    gcodeFeature: device.gcodeFeature,
    gcodeChange: device.gcodeChange,
    gcodeFExt: device.gcodeFExt,
    gcodeTime: device.gcodeTime,
    extrudeAbs: true,
  }
}

export function valueOfDeviceField<T>(v: unknown, fallback: T): T {
  return valueOf(v, fallback)
}
