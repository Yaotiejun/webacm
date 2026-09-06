import gripFixtureGcode from '@/core/cam/fixtures/grip-cam-export-sample.gcode.txt?raw'
import {
  motionStatsMatch,
  type CamSectionMotionStats,
} from '@/core/cam/camGcodeSectionMotionStats'
import { summarizeCamGcodeMotion, type CamGcodeMotionStats } from '@/core/cam/camGcodeStats'

const START_ROUGH = /starting\s+rough\s+op/i
const END_ROUGH = /ending\s+rough\s+op/i

export type GripCamBundledCaptureSection = 'header' | 'op-0-rough' | 'footer'

export interface GripCamBundledSectionSlice {
  section: GripCamBundledCaptureSection
  gcodeText: string
}

/** Split bundled grip capture G-code into `camGripFixtureCaptured.json` section ids. */
export function splitBundledGripCamGcodeByCaptureSections(
  gcodeText: string = gripFixtureGcode,
): GripCamBundledSectionSlice[] {
  const lines = gcodeText.split(/\r?\n/)
  const headerLines: string[] = []
  const roughLines: string[] = []
  const footerLines: string[] = []
  let phase: 'header' | 'rough' | 'footer' = 'header'

  for (const raw of lines) {
    if (phase === 'header' && START_ROUGH.test(raw)) {
      phase = 'rough'
      roughLines.push(raw)
      continue
    }
    if (phase === 'rough' && END_ROUGH.test(raw)) {
      phase = 'footer'
      footerLines.push(raw)
      continue
    }
    if (phase === 'header') headerLines.push(raw)
    else if (phase === 'rough') roughLines.push(raw)
    else footerLines.push(raw)
  }

  return [
    { section: 'header', gcodeText: headerLines.join('\n') },
    { section: 'op-0-rough', gcodeText: roughLines.join('\n') },
    { section: 'footer', gcodeText: footerLines.join('\n') },
  ]
}

export function summarizeBundledGripCamSectionMotions(
  gcodeText: string = gripFixtureGcode,
): CamSectionMotionStats[] {
  return splitBundledGripCamGcodeByCaptureSections(gcodeText).map((s) => ({
    section: s.section,
    ...summarizeCamGcodeMotion(s.gcodeText),
  }))
}

/** Pinned per-section motion on bundled `grip-cam-export-sample.gcode.txt`. */
export const GRIP_CAM_FIXTURE_BUNDLED_SECTION_MOTION = Object.freeze({
  header: Object.freeze({
    nonCommentLines: 3,
    g0: 1,
    g1: 0,
    g2: 0,
    g3: 0,
    otherMotion: 2,
  } satisfies CamGcodeMotionStats),
  rough: Object.freeze({
    nonCommentLines: 166,
    g0: 4,
    g1: 161,
    g2: 0,
    g3: 0,
    otherMotion: 0,
  } satisfies CamGcodeMotionStats),
  footer: Object.freeze({
    nonCommentLines: 0,
    g0: 0,
    g1: 0,
    g2: 0,
    g3: 0,
    otherMotion: 0,
  } satisfies CamGcodeMotionStats),
} as const)

export function compareBundledGripCamSectionMotion(
  gcodeText: string = gripFixtureGcode,
): { match: boolean; motions: CamSectionMotionStats[]; detail: string } {
  const motions = summarizeBundledGripCamSectionMotions(gcodeText)
  const pin = GRIP_CAM_FIXTURE_BUNDLED_SECTION_MOTION
  const header = motions.find((m) => m.section === 'header')
  const rough = motions.find((m) => m.section === 'op-0-rough')
  const footer = motions.find((m) => m.section === 'footer')
  const match =
    header != null &&
    rough != null &&
    footer != null &&
    motionStatsMatch(header, pin.header) &&
    motionStatsMatch(rough, pin.rough) &&
    motionStatsMatch(footer, pin.footer)
  const detail = match
    ? `header G1=${header.g1} rough G1=${rough.g1} footer lines=${footer.nonCommentLines}`
    : [
        header ? `header ${motionStatsMatch(header, pin.header) ? 'ok' : 'fail'}` : 'header missing',
        rough ? `rough ${motionStatsMatch(rough, pin.rough) ? 'ok' : 'fail'}` : 'rough missing',
        footer ? `footer ${motionStatsMatch(footer, pin.footer) ? 'ok' : 'fail'}` : 'footer missing',
      ].join('; ')
  return { match, motions, detail }
}
