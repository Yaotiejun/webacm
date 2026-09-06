import {
  summarizeCamGcodeMotion,
  type CamGcodeMotionStats,
} from '@/core/cam/camGcodeStats'

export interface CamSectionMotionStats extends CamGcodeMotionStats {
  section: string
}

type CamExportImpl = (print: unknown, online: (chunk: unknown) => void) => void

/** Walk `cam_export` stream and summarize G0/G1/G2/G3 counts per section marker. */
export function collectCamExportSectionMotionStats(
  impl: CamExportImpl,
  print: unknown = {},
): { sections: string[]; motions: CamSectionMotionStats[] } {
  const sections: string[] = []
  const motions: CamSectionMotionStats[] = []
  let current = ''
  let buffer = ''

  const flush = () => {
    if (!current) return
    const stats = summarizeCamGcodeMotion(buffer)
    motions.push({ section: current, ...stats })
    buffer = ''
  }

  impl(print, (chunk) => {
    if (chunk && typeof chunk === 'object' && 'section' in chunk) {
      flush()
      current = String((chunk as { section: string }).section)
      sections.push(current)
      return
    }
    buffer += typeof chunk === 'string' ? chunk : ''
  })
  flush()
  return { sections, motions }
}

export function motionStatsMatch(
  actual: CamGcodeMotionStats,
  expected: CamGcodeMotionStats,
): boolean {
  return (
    actual.nonCommentLines === expected.nonCommentLines &&
    actual.g0 === expected.g0 &&
    actual.g1 === expected.g1 &&
    actual.g2 === expected.g2 &&
    actual.g3 === expected.g3 &&
    actual.otherMotion === expected.otherMotion
  )
}
