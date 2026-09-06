export interface CamGcodeMotionStats {
  nonCommentLines: number
  g0: number
  g1: number
  g2: number
  g3: number
  otherMotion: number
}

export function summarizeCamGcodeMotion(gcodeText: string): CamGcodeMotionStats {
  const stats: CamGcodeMotionStats = {
    nonCommentLines: 0,
    g0: 0,
    g1: 0,
    g2: 0,
    g3: 0,
    otherMotion: 0,
  }
  for (const raw of gcodeText.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith(';')) continue
    stats.nonCommentLines += 1
    const code = line.split(/\s+/)[0]?.toUpperCase() ?? ''
    if (code === 'G0' || code === 'G00') stats.g0 += 1
    else if (code === 'G1' || code === 'G01') stats.g1 += 1
    else if (code === 'G2' || code === 'G02') stats.g2 += 1
    else if (code === 'G3' || code === 'G03') stats.g3 += 1
    else if (/^G\d+/.test(code)) stats.otherMotion += 1
  }
  return stats
}

export function formatCamGcodeMotionLine(stats: CamGcodeMotionStats): string {
  return `gcode.motion lines=${stats.nonCommentLines} G0=${stats.g0} G1=${stats.g1} G2=${stats.g2} G3=${stats.g3}`
}
