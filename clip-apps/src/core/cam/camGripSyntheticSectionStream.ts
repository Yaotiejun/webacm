import { collectCamExportSectionDepthStats } from '@/core/cam/camGcodeDepthStats'
import {
  collectCamExportSectionMotionStats,
  motionStatsMatch,
} from '@/core/cam/camGcodeSectionMotionStats'
import type { CamGcodeMotionStats } from '@/core/cam/camGcodeStats'
import {
  emitGripCamFixtureSyntheticExport,
  runGripCamFixtureSyntheticExport,
} from '@/core/cam/camGripFixtureSynthetic'

/** Pinned `cam_export` section order from synthetic fixture export. */
export const GRIP_CAM_SYNTHETIC_EXPORT_SECTIONS = Object.freeze([
  'header',
  'op-0-rough',
  'op-1-finish',
  'footer',
] as const)

/** Pinned Z spans per synthetic export section (migration gate). */
export const GRIP_CAM_SYNTHETIC_SECTION_Z = Object.freeze({
  rough: Object.freeze({ minZ: 0, maxZ: 0, explicitZLines: 1 }),
  finish: Object.freeze({ minZ: -0.5, maxZ: 2, explicitZLines: 2 }),
} as const)

/** Pinned motion counts per synthetic `cam_export` section (migration gate). */
export const GRIP_CAM_SYNTHETIC_SECTION_MOTION = Object.freeze({
  header: Object.freeze({
    nonCommentLines: 3,
    g0: 1,
    g1: 0,
    g2: 0,
    g3: 0,
    otherMotion: 2,
  } satisfies CamGcodeMotionStats),
  rough: Object.freeze({
    nonCommentLines: 6,
    g0: 1,
    g1: 5,
    g2: 0,
    g3: 0,
    otherMotion: 0,
  } satisfies CamGcodeMotionStats),
  finish: Object.freeze({
    nonCommentLines: 3,
    g0: 1,
    g1: 1,
    g2: 1,
    g3: 0,
    otherMotion: 0,
  } satisfies CamGcodeMotionStats),
  footer: Object.freeze({
    nonCommentLines: 2,
    g0: 1,
    g1: 0,
    g2: 0,
    g3: 0,
    otherMotion: 0,
  } satisfies CamGcodeMotionStats),
} as const)

export function collectGripCamSyntheticSectionStream() {
  const { sections, gcodeText } = runGripCamFixtureSyntheticExport()
  const impl = (_print: unknown, online: (chunk: unknown) => void) =>
    emitGripCamFixtureSyntheticExport(online)
  const { sections: depthSections, depths } = collectCamExportSectionDepthStats(impl, {})
  const { motions } = collectCamExportSectionMotionStats(impl, {})
  return { sections, gcodeText, depthSections, depths, motions }
}

export function compareGripCamSyntheticSectionStream(): {
  match: boolean
  detail: string
} {
  const { sections, depths, motions } = collectGripCamSyntheticSectionStream()
  const sectionsOk =
    sections.length === GRIP_CAM_SYNTHETIC_EXPORT_SECTIONS.length &&
    sections.every((s, i) => s === GRIP_CAM_SYNTHETIC_EXPORT_SECTIONS[i])

  const rough = depths.find((d) => d.section === 'op-0-rough')
  const finish = depths.find((d) => d.section === 'op-1-finish')
  const pinR = GRIP_CAM_SYNTHETIC_SECTION_Z.rough
  const pinF = GRIP_CAM_SYNTHETIC_SECTION_Z.finish
  const roughOk =
    rough != null &&
    rough.minZ === pinR.minZ &&
    rough.maxZ === pinR.maxZ &&
    rough.explicitZLines === pinR.explicitZLines
  const finishOk =
    finish != null &&
    finish.minZ === pinF.minZ &&
    finish.maxZ === pinF.maxZ &&
    finish.explicitZLines === pinF.explicitZLines

  const motionRough = motions.find((m) => m.section === 'op-0-rough')
  const motionFinish = motions.find((m) => m.section === 'op-1-finish')
  const motionHeader = motions.find((m) => m.section === 'header')
  const motionFooter = motions.find((m) => m.section === 'footer')
  const pinM = GRIP_CAM_SYNTHETIC_SECTION_MOTION
  const motionOk =
    motionHeader != null &&
    motionRough != null &&
    motionFinish != null &&
    motionFooter != null &&
    motionStatsMatch(motionHeader, pinM.header) &&
    motionStatsMatch(motionRough, pinM.rough) &&
    motionStatsMatch(motionFinish, pinM.finish) &&
    motionStatsMatch(motionFooter, pinM.footer)

  const match = sectionsOk && roughOk && finishOk && motionOk
  const detail = match
    ? `sections=${sections.join(',')}; rough Z[${rough!.minZ},${rough!.maxZ}]; finish Z[${finish!.minZ},${finish!.maxZ}]`
    : [
        `sections ${sectionsOk ? 'ok' : 'fail'}`,
        `rough ${roughOk ? 'ok' : 'fail'}`,
        `finish ${finishOk ? 'ok' : 'fail'}`,
        `motion ${motionOk ? 'ok' : 'fail'}`,
      ].join('; ')
  return { match, detail }
}
