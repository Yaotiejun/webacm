export interface CamGcodeZDepthStats {
  minZ: number
  maxZ: number
  explicitZLines: number
}

export interface CamSectionZDepthStats {
  section: string
  minZ: number
  maxZ: number
  explicitZLines: number
}

const Z_TOKEN = /\bZ(-?\d+(?:\.\d+)?)/gi

export function parseZTokensFromMotionLine(line: string): number[] {
  const out: number[] = []
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(';')) return out
  const code = trimmed.split(/\s+/)[0]?.toUpperCase() ?? ''
  if (!/^G(?:0|1|2|3|00|01|02|03)\b/.test(code)) return out
  for (const m of trimmed.matchAll(Z_TOKEN)) {
    const z = Number(m[1])
    if (Number.isFinite(z)) out.push(z)
  }
  return out
}

export function summarizeCamGcodeZDepth(gcodeText: string): CamGcodeZDepthStats {
  let minZ = Infinity
  let maxZ = -Infinity
  let explicitZLines = 0
  for (const raw of gcodeText.split(/\r?\n/)) {
    const zs = parseZTokensFromMotionLine(raw)
    if (!zs.length) continue
    explicitZLines += 1
    for (const z of zs) {
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
  }
  if (!Number.isFinite(minZ)) minZ = 0
  if (!Number.isFinite(maxZ)) maxZ = 0
  return { minZ, maxZ, explicitZLines }
}

type CamExportImpl = (print: unknown, online: (chunk: unknown) => void) => void

/**
 * Walk the same `online` stream as `collectCamExportGcode` and summarize Z per export section.
 */
export function collectCamExportSectionDepthStats(
  impl: CamExportImpl,
  print: unknown = {},
): { sections: string[]; depths: CamSectionZDepthStats[] } {
  const sections: string[] = []
  const depths: CamSectionZDepthStats[] = []
  let current = ''
  let minZ = Infinity
  let maxZ = -Infinity
  let explicitZLines = 0

  const flush = () => {
    if (!current) return
    if (!Number.isFinite(minZ)) minZ = 0
    if (!Number.isFinite(maxZ)) maxZ = 0
    depths.push({ section: current, minZ, maxZ, explicitZLines })
    minZ = Infinity
    maxZ = -Infinity
    explicitZLines = 0
  }

  impl(print, (chunk) => {
    if (chunk && typeof chunk === 'object' && 'section' in chunk) {
      flush()
      current = String((chunk as { section: string }).section)
      sections.push(current)
      return
    }
    const text = typeof chunk === 'string' ? chunk : ''
    for (const raw of text.split(/\r?\n/)) {
      const zs = parseZTokensFromMotionLine(raw)
      if (!zs.length) continue
      explicitZLines += 1
      for (const z of zs) {
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
      }
    }
  })
  flush()
  return { sections, depths }
}
