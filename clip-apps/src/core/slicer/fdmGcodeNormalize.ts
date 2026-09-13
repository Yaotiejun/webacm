/**
 * Normalize FDM G-code for golden / soak fingerprints (LF, strip volatile comments).
 */
export function normalizeFdmGcodeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

/** Drop timestamps / progress chatter that vary between runs. */
export function normalizeFdmGcodeForMigrationFingerprint(text: string): string {
  const lines = normalizeFdmGcodeText(text).split('\n')
  const kept: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (/^;\s*(generated|time|date|slicer|shapex|kiri|grip)/i.test(t)) continue
    if (/^M117\b/i.test(t)) continue
    if (/^;\s*LAYER:/i.test(t)) {
      kept.push(t)
      continue
    }
    kept.push(t)
  }
  return kept.join('\n')
}

/**
 * Dual-extruder golden digest: tool/layer structure, not full path geometry.
 * Full G-code SHA can vary run-to-run (legacy polygon ordering); this stays stable.
 */
export function dualExtruderStructuralDigest(gcode: string): string {
  const lines = normalizeFdmGcodeText(gcode).split('\n')
  let t0 = 0
  let t1 = 0
  let g0 = 0
  let g1 = 0
  let layers = 0
  const toolSeq: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^;\s*LAYER[:\s]/i.test(line) || /^;\s*layer\b/i.test(line)) layers += 1
    if (/\bT0\b/.test(line)) {
      t0 += 1
      if (toolSeq[toolSeq.length - 1] !== 'T0') toolSeq.push('T0')
    }
    if (/\bT1\b/.test(line)) {
      t1 += 1
      if (toolSeq[toolSeq.length - 1] !== 'T1') toolSeq.push('T1')
    }
    if (/^G0\b/i.test(line)) g0 += 1
    if (/^G1\b/i.test(line)) g1 += 1
  }
  // Bucket motion counts so tiny path jitter does not break the pin
  const bucket = (n: number) => Math.round(n / 10) * 10
  return [
    `t0=${t0}`,
    `t1=${t1}`,
    `g0~=${bucket(g0)}`,
    `g1~=${bucket(g1)}`,
    `layers=${layers}`,
    `seq=${toolSeq.join('>')}`,
  ].join(';')
}

export async function sha256HexUtf8(text: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text, 'utf8').digest('hex')
}
