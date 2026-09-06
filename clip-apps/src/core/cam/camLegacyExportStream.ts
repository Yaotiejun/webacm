import type { CamJobResult } from '@/types/camJob'
import { extractCamExportSectionsLine } from '@/core/cam/camResultSerialize'
import { compareCamMotionToGripFixture } from '@/core/cam/camGripFixtureMotionCompare'
import { compareCamPerOpDepthToGripCapture } from '@/core/cam/camGripFixtureDepthCompare'
import { compareBundledGripCamSectionMotion } from '@/core/cam/camGripFixtureBundledSections'
import { compareGripFixturePerOpDepth } from '@/core/cam/camGripFixturePerOpDepth'
import { compareCamSectionsToGripFixture } from '@/core/cam/camGripFixtureSectionCompare'
import { GRIP_CAM_FIXTURE_MIGRATION_SHA256 } from '@/core/cam/camGripFixtureMeta'
import {
  normalizeCamGcodeForMigrationFingerprint,
  sha256HexUtf8,
} from '@/core/cam/camGcodeFingerprint'
import capturedMeta from '@/core/cam/fixtures/camGripFixtureCaptured.json'

/** Section order from last `capture:cam-fixture` (`camGripFixtureCaptured.json`). */
export const GRIP_CAM_LEGACY_CAPTURE_SECTIONS = Object.freeze(
  (capturedMeta as { sections: string[] }).sections,
)

export type LegacyCamExportGripCompare = {
  ok: boolean
  sections: string[]
  sectionsMatch: boolean
  fingerprintSha256: string
  fingerprintMatch: boolean
  zDepthMatch: boolean
  perOpZDepthMatch: boolean
  motionMatch: boolean
  bundledSectionMotionMatch: boolean
  detail: string
}

export function parseLegacyCamExportSections(notes: readonly string[]): string[] {
  const line = extractCamExportSectionsLine([...notes])
  if (!line) return []
  return line.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Compare live `runCamJob` output to bundled grip capture pins (sections + SHA-256 + Z/motion). */
export async function compareLegacyCamExportToGripCapture(
  result: CamJobResult,
): Promise<LegacyCamExportGripCompare> {
  const sections = parseLegacyCamExportSections(result.notes ?? [])
  const gcodeText = result.gcodeText?.trim() ?? ''

  const sectionCompare = compareCamSectionsToGripFixture(sections)
  const sectionsMatch =
    sections.length === GRIP_CAM_LEGACY_CAPTURE_SECTIONS.length &&
    sections.every((s, i) => s === GRIP_CAM_LEGACY_CAPTURE_SECTIONS[i])

  const fingerprintSha256 = gcodeText
    ? await sha256HexUtf8(normalizeCamGcodeForMigrationFingerprint(gcodeText))
    : ''
  const fingerprintMatch =
    fingerprintSha256.length > 0 && fingerprintSha256 === GRIP_CAM_FIXTURE_MIGRATION_SHA256

  const zDepth = compareCamPerOpDepthToGripCapture(gcodeText)
  const perOpZ = compareGripFixturePerOpDepth(gcodeText)
  const motion = compareCamMotionToGripFixture(gcodeText)
  const bundledMotion = compareBundledGripCamSectionMotion(gcodeText)

  const ok =
    result.backend === 'kiri-cam' &&
    gcodeText.length > 50 &&
    sectionsMatch &&
    fingerprintMatch &&
    zDepth.match &&
    perOpZ.match &&
    motion.match &&
    bundledMotion.match

  const detail = ok
    ? `sections=${sections.join(',')}; sha=${fingerprintSha256.slice(0, 12)}…`
    : [
        `backend=${result.backend}`,
        `sections ${sectionsMatch ? 'ok' : sectionCompare.detail}`,
        `fingerprint ${fingerprintMatch ? 'ok' : `want ${GRIP_CAM_FIXTURE_MIGRATION_SHA256.slice(0, 12)}… got ${fingerprintSha256.slice(0, 12)}…`}`,
        `zDepth ${zDepth.match ? 'ok' : 'fail'}`,
        `perOpZ ${perOpZ.match ? 'ok' : perOpZ.detail}`,
        `motion ${motion.match ? 'ok' : 'fail'}`,
      ].join('; ')

  return {
    ok,
    sections,
    sectionsMatch,
    fingerprintSha256,
    fingerprintMatch,
    zDepthMatch: zDepth.match,
    perOpZDepthMatch: perOpZ.match,
    motionMatch: motion.match,
    bundledSectionMotionMatch: bundledMotion.match,
    detail,
  }
}
