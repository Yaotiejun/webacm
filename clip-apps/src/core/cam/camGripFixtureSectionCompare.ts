import { GRIP_CAM_FIXTURE_SECTIONS } from '@/core/cam/camGcodeSectionStats'

export type CamSectionCompareResult = {
  match: boolean
  actual: readonly string[]
  expected: readonly string[]
  detail: string
}

export function compareCamSectionsToGripFixture(sections: readonly string[]): CamSectionCompareResult {
  const expected = GRIP_CAM_FIXTURE_SECTIONS
  const match =
    sections.length === expected.length && sections.every((s, i) => s === expected[i])
  const detail = match
    ? `与 grip 金样 sections 一致：${sections.join(', ')}`
    : `sections 与金样不一致\n  实际 ${sections.join(', ') || '(none)'}\n  金样 ${expected.join(', ')}`
  return { match, actual: sections, expected, detail }
}
