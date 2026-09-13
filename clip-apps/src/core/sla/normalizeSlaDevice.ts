/**
 * Normalize bundled Kiri SLA device JSON into a typed config.
 */
export type SlaDeviceConfig = {
  id: string
  bedWidth: number
  bedDepth: number
  bedHeight: number
  maxHeight: number
  resolutionX: number
  resolutionY: number
  format: 'photon' | 'ctb' | 'goo' | 'prz' | 'unknown'
  fileExt: string
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function inferFormat(raw: Record<string, unknown>, settings: Record<string, unknown>, id: string): SlaDeviceConfig['format'] {
  const explicit = String(settings.sla_format ?? raw.sla_format ?? '').toLowerCase()
  if (explicit === 'photon' || explicit === 'ctb' || explicit === 'goo' || explicit === 'prz') return explicit
  const ext = String(settings.sla_file_ext ?? raw['file-ext'] ?? '').toLowerCase()
  if (ext.includes('photon')) return 'photon'
  if (ext === 'ctb') return 'ctb'
  if (ext === 'goo') return 'goo'
  if (ext === 'prz') return 'prz'
  const lower = id.toLowerCase()
  if (lower.includes('photon')) return 'photon'
  if (lower.includes('ctb')) return 'ctb'
  if (lower.includes('goo')) return 'goo'
  if (lower.includes('prz')) return 'prz'
  return 'unknown'
}

export function normalizeSlaDeviceJson(raw: Record<string, unknown>, id: string): SlaDeviceConfig {
  const settings = (raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) as Record<
    string,
    unknown
  >
  const format = inferFormat(raw, settings, id)
  const fileExt =
    String(settings.sla_file_ext ?? raw['file-ext'] ?? '') ||
    (format === 'photon' ? 'photon' : format === 'ctb' ? 'ctb' : format === 'goo' ? 'goo' : 'bin')
  return {
    id,
    bedWidth: num(settings.bed_width, 120),
    bedDepth: num(settings.bed_depth, 68),
    bedHeight: num(settings.bed_height, 1),
    maxHeight: num(settings.max_height, 150),
    resolutionX: num(settings.resolution_x, 1440),
    resolutionY: num(settings.resolution_y, 2560),
    format,
    fileExt,
  }
}
