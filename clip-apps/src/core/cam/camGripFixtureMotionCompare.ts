import { getGripCamFixturePreviewGcode } from '@/core/cam/camGripFixturePreview'
import {
  formatCamGcodeMotionLine,
  summarizeCamGcodeMotion,
  type CamGcodeMotionStats,
} from '@/core/cam/camGcodeStats'

export type CamMotionCompareResult = {
  match: boolean
  actual: CamGcodeMotionStats
  expected: CamGcodeMotionStats
  detail: string
}

function motionStatsEqual(a: CamGcodeMotionStats, b: CamGcodeMotionStats): boolean {
  return (
    a.nonCommentLines === b.nonCommentLines &&
    a.g0 === b.g0 &&
    a.g1 === b.g1 &&
    a.g2 === b.g2 &&
    a.g3 === b.g3 &&
    a.otherMotion === b.otherMotion
  )
}

export function compareCamMotionToGripFixture(gcodeText: string): CamMotionCompareResult {
  const actual = summarizeCamGcodeMotion(gcodeText)
  const expected = summarizeCamGcodeMotion(getGripCamFixturePreviewGcode())
  const match = motionStatsEqual(actual, expected)
  const detail = match
    ? `与 grip 金样 motion 一致：${formatCamGcodeMotionLine(actual)}`
    : `与 grip 金样不一致\n  实际 ${formatCamGcodeMotionLine(actual)}\n  金样 ${formatCamGcodeMotionLine(expected)}`
  return { match, actual, expected, detail }
}
