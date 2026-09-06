import type { CamProfile, CamJobInputGeometry, CamJobResult, CamFallbackReasonCode } from '@/types/camJob'
import {
  __debugKiriCamRuntimeStatus,
  getKiriCamImpls,
  getKiriCamLegacyHealth,
  kiriCamRuntime,
} from '@/core/cam/kiriCamRuntime'
import {
  enrichCamJobSummaryFromPostSliceWidget,
  estimateCamPlaceholderSummary,
  canonicalizeCamProcessConfig,
} from '@/core/cam/camJobSummaryBridge'
import { collectCamExportGcode } from '@/core/cam/camExportCollect'
import { runLegacyCamPrepare } from '@/core/cam/camLegacyPrepare'
import { buildCamPlaceholderGcode } from '@/core/cam/camPlaceholderGcode'
import { buildKiriCamWidget } from '@/core/cam/kiriCamWidget'

export interface CamEngineOptions {
  devMode?: boolean
  /** Legacy `cam_slice` progress 0–1 (when supported). */
  onSliceProgress?: (progress: number, message?: string) => void
}

function normalizeSliceError(err: unknown): string {
  return String(err)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function appendLegacyImportHint(message: string): string {
  const hint = getKiriCamLegacyHealth().legacyImportErrorMessage
  return hint ? `${message} — import: ${hint}` : message
}

function resolveLegacyFallbackReason(): {
  reasonCode: CamFallbackReasonCode
  message: string
} {
  const legacyCamMode = String(import.meta.env.VITE_KIRI_LEGACY_CAM ?? 'auto')
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  const runtimeError = kiriCamRuntime.getError()
  if (legacyCamMode === '0') return { reasonCode: 'legacy_disabled', message: 'legacy disabled by VITE_KIRI_LEGACY_CAM=0' }
  if (runtimeError) return { reasonCode: 'runtime_init_error', message: `legacy runtime init error: ${runtimeError.message}` }
  if (!kiriCamRuntime.isReady()) return { reasonCode: 'runtime_not_ready', message: 'legacy runtime not ready' }
  if (!camSliceImpl && !camExportImpl) {
    return {
      reasonCode: 'legacy_impl_missing_both',
      message: appendLegacyImportHint('legacy cam slice/export implementation unavailable'),
    }
  }
  if (!camSliceImpl) {
    return {
      reasonCode: 'legacy_impl_missing_slice',
      message: appendLegacyImportHint('legacy cam slice implementation unavailable'),
    }
  }
  if (!camExportImpl) {
    return {
      reasonCode: 'legacy_impl_missing_export',
      message: appendLegacyImportHint('legacy cam export implementation unavailable'),
    }
  }
  return { reasonCode: 'legacy_unknown', message: 'legacy unavailable for unknown reason' }
}

function buildKiriCamSettings(profile: CamProfile, geometry: CamJobInputGeometry): Record<string, unknown> {
  const { device, process, tools } = profile
  const stock = {
    x: process.camStockX ?? 0,
    y: process.camStockY ?? 0,
    z: process.camStockZ ?? 0,
    center: { x: 0, y: 0, z: 0 },
  }

  const mode = String(device.mode ?? 'CAM')
  const deviceLabel = String(device.deviceName ?? 'shape_cam_cam')

  return {
    device,
    tools,
    process,
    mode,
    filter: { CAM: deviceLabel, FDM: deviceLabel },
    controller: {
      units: 'mm',
      dark: false,
      alignTop: false,
      devel: false,
    },
    stock,
    origin: { x: 0, y: 0, z: 0 },
    bounds: {
      min: { x: geometry.bbox.minX, y: geometry.bbox.minY, z: geometry.bbox.minZ },
      max: { x: geometry.bbox.maxX, y: geometry.bbox.maxY, z: geometry.bbox.maxZ },
    },
  }
}

function buildKiriPrint(
  settings: Record<string, unknown>,
  widget: ReturnType<typeof buildKiriCamWidget>,
  output: unknown[],
) {
  return {
    settings,
    widgets: [widget],
    output,
    constReplace(line: string, consts: Record<string, unknown>) {
      return line.replace(/\{(\w+)\}/g, (_m, key) => {
        const v = (consts as Record<string, unknown>)[key]
        return v == null ? '' : String(v)
      })
    },
  }
}

function buildSliceOnlyGcodeStub(process: CamProfile['process'], geometry: CamJobInputGeometry): string {
  const lines = [
    '; Kiri CAM slice-only bridge output',
    '; cam_export unavailable, this is a diagnostic stub',
    `; process=${process.processName ?? 'unknown'}`,
    ';',
    'G21 ; mm mode',
    'G90 ; absolute mode',
    'M5',
    '; full cam_export G-code unavailable — see result.notes (VITE_KIRI_LEGACY_CAM / legacy bundle)',
  ]
  return `${lines.join('\n')}\n${buildCamPlaceholderGcode(geometry, 'slice-only bbox preview')}`
}

function assertProcessHasOps(process: CamProfile['process']) {
  const ops = process.ops?.filter((op) => !op.disabled) ?? []
  if (!ops.length) {
    throw new Error('CAM process has no enabled operations (ops)')
  }
}

export async function runCamJob(
  profile: CamProfile,
  geometry: CamJobInputGeometry,
  _options: CamEngineOptions = {},
): Promise<CamJobResult> {
  const process = canonicalizeCamProcessConfig(profile.process)
  const profileForKiri: CamProfile = { ...profile, process }

  try {
    await kiriCamRuntime.init()
    if (import.meta.env?.DEV) {
      __debugKiriCamRuntimeStatus()
    }
  } catch {
    // ignore
  }
  const legacyDebug = getKiriCamLegacyHealth()

  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  const runtimeReady = kiriCamRuntime.isReady() && !kiriCamRuntime.getError()
  const canSliceLegacy = !!camSliceImpl && runtimeReady
  const canExportLegacy = !!camExportImpl

  if (canSliceLegacy) {
    assertProcessHasOps(process)
    const settings = buildKiriCamSettings(profileForKiri, geometry)
    const widget = buildKiriCamWidget(geometry)
    await camSliceImpl!(
      settings,
      widget,
      (prog: number, msg?: string) => {
        _options.onSliceProgress?.(prog, msg)
      },
      (err?: unknown) => {
        if (err) throw new Error(normalizeSliceError(err))
      },
    )

    const baseSummary = estimateCamPlaceholderSummary(process, geometry)
    const { summary, perOp } = enrichCamJobSummaryFromPostSliceWidget(widget, process, baseSummary)

    let gcodeText = ''
    const notes: string[] = ['Kiri CAM backend via legacy cam_slice']
    if (!geometry.vertices?.length) {
      notes.push('part mesh: stock bbox box (import STL for real geometry)')
    } else {
      notes.push(`part mesh: STL vertices ${geometry.vertices.length / 3} triangles`)
    }
    if (canExportLegacy) {
      _options.onSliceProgress?.(0.82, 'cam_prepare')
      const prepared = await runLegacyCamPrepare([widget], settings, (p, msg) => {
        _options.onSliceProgress?.(0.82 + p * 0.06, msg ?? 'cam_prepare')
      })
      const print = buildKiriPrint(settings, widget, prepared.output)
      _options.onSliceProgress?.(0.88, 'cam_export')
      const collected = collectCamExportGcode(camExportImpl!, print)
      gcodeText = collected.gcodeText
      _options.onSliceProgress?.(1, 'cam_export done')
      if (collected.sections.length) {
        notes.push(`legacy cam_export sections: ${collected.sections.join(', ')}`)
      }
      notes.push('legacy cam_export enabled')
    } else {
      gcodeText = buildSliceOnlyGcodeStub(process, geometry)
      notes.push('legacy cam_export missing, emitted slice-only gcode stub')
    }

    const stockX = process.camStockX
    const stockY = process.camStockY
    const stockZ = process.camStockZ

    return {
      backend: canExportLegacy ? 'kiri-cam' : 'kiri-cam-slice-only',
      profileName: process.processName,
      deviceName: profile.device.deviceName,
      processName: process.processName,
      stockSize:
        typeof stockX === 'number' && typeof stockY === 'number' && typeof stockZ === 'number'
          ? { x: stockX, y: stockY, z: stockZ }
          : null,
      zSettings: {
        anchor: process.camZAnchor ?? null,
        bottom: process.camZBottom ?? null,
        clearance: process.camZClearance ?? null,
      },
      summary,
      perOp,
      notes,
      legacyDebug,
      fallback: null,
      gcodeText,
    }
  }

  const { summary, perOp } = estimateCamPlaceholderSummary(process, geometry)

  const stockX = process.camStockX
  const stockY = process.camStockY
  const stockZ = process.camStockZ

  const fallback = resolveLegacyFallbackReason()
  const result: CamJobResult = {
    backend: 'cam-placeholder',
    profileName: null,
    deviceName: profile.device.deviceName,
    processName: process.processName,
    stockSize:
      typeof stockX === 'number' && typeof stockY === 'number' && typeof stockZ === 'number'
        ? { x: stockX, y: stockY, z: stockZ }
        : null,
    zSettings: {
      anchor: process.camZAnchor ?? null,
      bottom: process.camZBottom ?? null,
      clearance: process.camZClearance ?? null,
    },
    summary,
    perOp,
    notes: [
      '占位 CAM：legacy cam_slice/cam_export 未就绪，以下为 bbox 示意 G-code + 统计估算。',
      `fallback reason: ${fallback.message}`,
      `bbox dx=${(geometry.bbox.maxX - geometry.bbox.minX).toFixed(3)} dy=${(geometry.bbox.maxY - geometry.bbox.minY).toFixed(3)} dz=${(geometry.bbox.maxZ - geometry.bbox.minZ).toFixed(3)}`,
    ],
    legacyDebug,
    fallback,
    gcodeText: buildCamPlaceholderGcode(geometry, 'cam-placeholder bbox preview'),
  }

  return result
}
