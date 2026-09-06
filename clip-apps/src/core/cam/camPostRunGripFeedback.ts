import { compareCamMotionToGripFixture } from '@/core/cam/camGripFixtureMotionCompare'

export type CamPostRunGripFeedback = {
  level: 'success' | 'warning' | 'info'
  message: string
}

/** After legacy cam_export, surface grip fixture motion parity in one line. */
export function buildCamPostRunGripFeedback(gcodeText: string | undefined | null): CamPostRunGripFeedback | null {
  const text = gcodeText?.trim()
  if (!text) return null
  const cmp = compareCamMotionToGripFixture(text)
  if (cmp.match) {
    return { level: 'success', message: 'CAM 导出与 grip 金样 motion 统计一致' }
  }
  return {
    level: 'warning',
    message: `CAM 导出与 grip 金样 motion 不一致（可用「对比金样 motion」查看详情）`,
  }
}
