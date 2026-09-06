import type { CamJobResult } from '@/types/camJob'
import { getCamFallbackReasonLabel } from './camFallbackUi'
import {
  CAM_RESULT_INLINE_GCODE_MAX_CHARS,
  extractCamExportSectionsLine,
  toCamJobResultDisplayJson,
} from '@/core/cam/camResultSerialize'
import { compareCamMotionToGripFixture } from '@/core/cam/camGripFixtureMotionCompare'
import { compareCamSectionsToGripFixture } from '@/core/cam/camGripFixtureSectionCompare'
import { extractCamOpMarkersFromGcode } from '@/core/cam/camGripFixtureOpMarkers'
import { buildGripCamFixtureSyntheticSections } from '@/core/cam/camGripFixtureSynthetic'
import { formatCamExportSectionsList } from '@/core/cam/camGcodeSectionStats'
import { compareCamPerOpDepthToGripCapture } from '@/core/cam/camGripFixtureDepthCompare'
import { compareGripFixturePerOpDepth } from '@/core/cam/camGripFixturePerOpDepth'
import { compareGripCamSyntheticSectionStream } from '@/core/cam/camGripSyntheticSectionStream'
import { parseLegacyCamExportSections } from '@/core/cam/camLegacyExportStream'
import { compareCamPlaceholderDepthTighten } from '@/core/cam/camPlaceholderDepthTighten'
import { formatCamGcodeMotionLine, summarizeCamGcodeMotion } from '@/core/cam/camGcodeStats'
import { summarizeCamGcodeZDepth } from '@/core/cam/camGcodeDepthStats'

export function formatCamResultText(result: CamJobResult | null): string {
  if (!result) return '尚未运行 CAM 模拟（占位）。'
  const lines = [`backend=${result.backend}`]
  if (result.fallback) {
    lines.push(`fallback.reasonCode=${result.fallback.reasonCode}`)
    lines.push(`fallback.reasonLabel=${getCamFallbackReasonLabel(result.fallback.reasonCode)}`)
    lines.push(`fallback.message=${result.fallback.message}`)
  }
  if (result.legacyDebug) {
    lines.push(`legacy.ready=${result.legacyDebug.ready ? '1' : '0'}`)
    lines.push(`legacy.camSlice=${result.legacyDebug.hasSlice ? '1' : '0'}`)
    lines.push(`legacy.camExport=${result.legacyDebug.hasExport ? '1' : '0'}`)
    if (result.legacyDebug.initErrorMessage) {
      lines.push(`legacy.initError=${result.legacyDebug.initErrorMessage.replace(/\r?\n/g, ' ')}`)
    }
    if (result.legacyDebug.legacyImportErrorMessage) {
      lines.push(`legacy.importError=${result.legacyDebug.legacyImportErrorMessage.replace(/\r?\n/g, ' ')}`)
    }
  }
  const sectionsNote = extractCamExportSectionsLine(result.notes)
  if (sectionsNote) lines.push(`camExport.sections=${sectionsNote}`)
  if (result.gcodeText?.trim()) {
    lines.push(formatCamGcodeMotionLine(summarizeCamGcodeMotion(result.gcodeText)))
    const zDepth = summarizeCamGcodeZDepth(result.gcodeText)
    lines.push(`gcode.zDepth min=${zDepth.minZ} max=${zDepth.maxZ} lines=${zDepth.explicitZLines}`)
    const depthPin = compareCamPerOpDepthToGripCapture(result.gcodeText)
    lines.push(`gripFixture.zDepthMatch=${depthPin.match ? '1' : '0'}`)
    const perOpDepth = compareGripFixturePerOpDepth(result.gcodeText)
    lines.push(`gripFixture.perOpZDepthMatch=${perOpDepth.match ? '1' : '0'}`)
    const sectionStream = compareGripCamSyntheticSectionStream()
    lines.push(`gripFixture.syntheticSectionStream=${sectionStream.match ? '1' : '0'}`)
    const tighten = compareCamPlaceholderDepthTighten(result.gcodeText)
    lines.push(`gripFixture.placeholderPassesTighten=${tighten.match ? '1' : '0'}`)
    const motion = compareCamMotionToGripFixture(result.gcodeText)
    lines.push(`gripFixture.motionMatch=${motion.match ? '1' : '0'}`)
    const opMarkers = extractCamOpMarkersFromGcode(result.gcodeText)
    if (opMarkers.length) lines.push(`gripFixture.ops=${opMarkers.join(',')}`)
    const legacySections = parseLegacyCamExportSections(result.notes ?? [])
    if (legacySections.length) {
      lines.push(`camExport.sections=${legacySections.join(', ')}`)
      if (result.backend === 'kiri-cam' && result.gcodeText?.trim()) {
        const sectionPin =
          legacySections.length === 3 &&
          legacySections[0] === 'header' &&
          legacySections[1] === 'op-0-rough' &&
          legacySections[2] === 'footer'
        lines.push(`gripFixture.legacyExportSectionsPin=${sectionPin ? '1' : '0'}`)
      }
    }
    const sectionsNote = result.notes?.find((n) => n.startsWith('legacy cam_export sections:'))
    if (sectionsNote && !legacySections.length) {
      lines.push(sectionsNote.replace('legacy cam_export sections:', 'camExport.sections='))
    } else if (motion.match) {
      lines.push(formatCamExportSectionsList(buildGripCamFixtureSyntheticSections()))
    }
    if (sectionsNote) {
      const sections = sectionsNote.replace('legacy cam_export sections: ', '').split(', ').filter(Boolean)
      const sec = compareCamSectionsToGripFixture(sections)
      lines.push(`gripFixture.sectionsMatch=${sec.match ? '1' : '0'}`)
    }
  }
  if (result.gcodeText && result.gcodeText.length > CAM_RESULT_INLINE_GCODE_MAX_CHARS) {
    lines.push(`gcodeText.omitted=true (length=${result.gcodeText.length}, use「下载 G-code」获取全文)`)
  }
  const body = toCamJobResultDisplayJson(result)
  return `${lines.join('\n')}\n\n${JSON.stringify(body, null, 2)}`
}
