/**
 * Normalize bundled Kiri laser device JSON into a typed config.
 */
export type LaserDeviceConfig = {
  id: string
  fileExt: string
  pre: string[]
  post: string[]
  laserOn: string[]
  laserOff: string[]
  bedWidth: number
  bedDepth: number
  tokenSpace: string
  laserMaxPower: number
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x ?? '')).filter(Boolean)
}

export function normalizeLaserDeviceJson(raw: Record<string, unknown>, id: string): LaserDeviceConfig {
  const settings = (raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) as Record<
    string,
    unknown
  >
  const maxP = Number(raw['laser-max-power'] ?? settings.laser_max_power ?? 255)
  return {
    id,
    fileExt: String(raw['file-ext'] ?? 'gcode'),
    pre: asStringArray(raw.pre),
    post: asStringArray(raw.post),
    laserOn: asStringArray(raw['laser-on']),
    laserOff: asStringArray(raw['laser-off']),
    bedWidth: Number(settings.bed_width) || 300,
    bedDepth: Number(settings.bed_depth) || 300,
    tokenSpace: String(raw['token-space'] ?? ' '),
    laserMaxPower: Number.isFinite(maxP) && maxP > 0 ? maxP : 255,
  }
}