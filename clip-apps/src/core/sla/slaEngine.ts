import { buildCtbFile } from '@/core/sla/slaExportCtb'
import { buildCtbEncryptedFileSync } from '@/core/sla/slaExportCtbEncrypted'
import { buildGooFile } from '@/core/sla/slaExportGoo'
import { buildPhotonFile } from '@/core/sla/slaExportPhoton'
import {
  addPillarSupports,
  rasterizeLayer,
  sliceMeshToLayers,
  type SlaLayer,
} from '@/core/sla/slaLayers'
import { getStockSlaDevice } from '@/core/sla/stock/stockSlaDevices'

export type SlaExportFormat = 'photon' | 'ctb' | 'ctb-encrypted' | 'goo'

export type SlaBackendKind = 'sla-ts-mvp' | 'sla-worker'

/** Kiri-like: slice builds contours for 3D stack; export rasterizes device files. */
export type SlaEngineMode = 'preview' | 'export'

export type SlaEngineResult = {
  layers: SlaLayer[]
  layerCount: number
  zMin: number
  zMax: number
  bitmaps: Uint8Array[]
  blob: ArrayBuffer
  filenameExt: string
  backend: SlaBackendKind
  width: number
  height: number
  mode: SlaEngineMode
}

export type SlaEngineOpts = {
  layerHeight: number
  exportFormat: SlaExportFormat
  /**
   * preview (default for UI): contours only — fast, enables animate.
   * export: full rasterize + device file (Kiri export step).
   */
  mode?: SlaEngineMode
  /** When exportFormat is 'ctb', AES-wrap settings/header as encrypted v5. */
  encryptHeader?: boolean
  resolution?: { w: number; h: number }
  bed?: { x: number; y: number; z: number }
  deviceId?: string
  layerOn?: number
  layerOff?: number
  baseOn?: number
  baseOff?: number
  baseLayers?: number
  peelDist?: number
  peelLiftRate?: number
  peelDropRate?: number
  basePeelDist?: number
  basePeelLiftRate?: number
  fillDensity?: number
  fillLine?: number
  /** Hollow shell thickness (mm); 0 = solid. */
  shellMm?: number
  shellOpenTop?: boolean
  shellOpenBase?: boolean
  antiAlias?: number
  zOffset?: number
  /** Simple pillar supports under overhangs. */
  supportEnable?: boolean
  supportSpacingMm?: number
  supportRadiusMm?: number
  supportLayers?: number
  supportGap?: number
  supportPoints?: number
  supportAngle?: number
  supportSize?: number
  supportDensity?: number
}

function meshZRange(vertices: Float32Array): { zMin: number; zMax: number } {
  let zMin = Infinity
  let zMax = -Infinity
  for (let i = 2; i < vertices.length; i += 3) {
    const z = vertices[i]!
    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }
  if (!Number.isFinite(zMin)) return { zMin: 0, zMax: 0 }
  return { zMin, zMax }
}

function resolveBed(opts: SlaEngineOpts) {
  const stock = opts.deviceId ? getStockSlaDevice(opts.deviceId) : null
  return {
    stock,
    bedX: opts.bed?.x ?? stock?.bedWidth ?? 120,
    bedY: opts.bed?.y ?? stock?.bedDepth ?? 68,
    bedZ: opts.bed?.z ?? stock?.maxHeight ?? 150,
    width: Math.max(8, Math.floor(opts.resolution?.w ?? stock?.resolutionX ?? 1440)),
    height: Math.max(8, Math.floor(opts.resolution?.h ?? stock?.resolutionY ?? 2560)),
  }
}

function filenameExtFor(opts: SlaEngineOpts): string {
  if (opts.exportFormat === 'goo') return 'goo'
  if (opts.exportFormat === 'ctb' || opts.exportFormat === 'ctb-encrypted') return 'ctb'
  return 'photon'
}

function buildExportBlob(
  bitmaps: Uint8Array[],
  opts: SlaEngineOpts,
  dims: { width: number; height: number; bedX: number; bedY: number; bedZ: number; layerHeight: number },
): ArrayBuffer {
  const layerOn = opts.layerOn ?? 2.5
  const baseOn = opts.baseOn ?? 25
  const baseLayers = opts.baseLayers ?? 8
  const wantEncryptedCtb =
    opts.exportFormat === 'ctb-encrypted' || (opts.exportFormat === 'ctb' && opts.encryptHeader === true)

  if (wantEncryptedCtb) {
    return buildCtbEncryptedFileSync({
      layers: bitmaps,
      width: dims.width,
      height: dims.height,
      layerHeight: dims.layerHeight,
      bedX: dims.bedX,
      bedY: dims.bedY,
      bedZ: dims.bedZ,
      layerOn,
      baseOn,
      baseLayers,
    })
  }
  if (opts.exportFormat === 'ctb') {
    return buildCtbFile({
      layers: bitmaps,
      width: dims.width,
      height: dims.height,
      layerHeight: dims.layerHeight,
      bedX: dims.bedX,
      bedY: dims.bedY,
      bedZ: dims.bedZ,
      layerOn,
      baseOn,
      baseLayers,
    })
  }
  if (opts.exportFormat === 'goo') {
    return buildGooFile({
      layers: bitmaps,
      width: dims.width,
      height: dims.height,
      layerHeight: dims.layerHeight,
      bedX: dims.bedX,
      bedY: dims.bedY,
      bedZ: dims.bedZ,
      layerOn,
      baseOn,
      baseLayers,
    })
  }
  return buildPhotonFile({
    layers: bitmaps,
    width: dims.width,
    height: dims.height,
    layerHeight: dims.layerHeight,
    bedX: dims.bedX,
    bedY: dims.bedY,
    bedZ: dims.bedZ,
    layerOn,
    baseOn,
    baseLayers,
  })
}

function applySupports(layers: SlaLayer[], opts: SlaEngineOpts): SlaLayer[] {
  return addPillarSupports(layers, {
    enable: Boolean(opts.supportEnable),
    spacingMm: opts.supportSpacingMm,
    radiusMm: opts.supportRadiusMm,
  })
}

/** Rasterize + pack device file from existing layer contours (Kiri export). */
export async function exportSlaFromLayers(
  layers: SlaLayer[],
  opts: SlaEngineOpts,
): Promise<SlaEngineResult> {
  if (!layers.length) throw new Error('SLA export: no layers')
  const layerHeight = Math.max(1e-4, Number(opts.layerHeight) || 0.05)
  const { bedX, bedY, bedZ, width, height } = resolveBed(opts)
  const bitmaps = layers.map((L) => rasterizeLayer(L.fills, width, height, bedX, bedY))
  const blob = buildExportBlob(bitmaps, opts, { width, height, bedX, bedY, bedZ, layerHeight })
  let zMin = Infinity
  let zMax = -Infinity
  for (const L of layers) {
    if (L.z < zMin) zMin = L.z
    if (L.z > zMax) zMax = L.z
  }
  return {
    layers,
    layerCount: layers.length,
    zMin: Number.isFinite(zMin) ? zMin : 0,
    zMax: Number.isFinite(zMax) ? zMax : 0,
    bitmaps,
    blob,
    filenameExt: filenameExtFor(opts),
    backend: 'sla-ts-mvp',
    width,
    height,
    mode: 'export',
  }
}

/**
 * Slice mesh → layer contours.
 * mode=preview (UI): skip rasterize/export — fast animate stack like Kiri after slice.
 * mode=export (tests/download): full device file.
 */
export async function runSlaFromMesh(
  vertices: Float32Array,
  opts: SlaEngineOpts,
): Promise<SlaEngineResult> {
  const mode: SlaEngineMode = opts.mode ?? 'export'
  const layerHeight = Math.max(1e-4, Number(opts.layerHeight) || 0.05)
  const { bedX, bedY, bedZ, width, height } = resolveBed(opts)
  const { zMin, zMax } = meshZRange(vertices)

  let layers = await sliceMeshToLayers(vertices, layerHeight, {
    healMesh: true,
  })
  // Supports: only when enabled (Kiri computeSupports also gated). Skip on preview if off.
  if (opts.supportEnable) {
    layers = applySupports(layers, opts)
  }
  if (!layers.length) throw new Error('SLA slice produced no layers')

  if (mode === 'preview') {
    return {
      layers,
      layerCount: layers.length,
      zMin,
      zMax,
      bitmaps: [],
      blob: new ArrayBuffer(0),
      filenameExt: filenameExtFor(opts),
      backend: 'sla-ts-mvp',
      width,
      height,
      mode: 'preview',
    }
  }

  return exportSlaFromLayers(layers, {
    ...opts,
    bed: { x: bedX, y: bedY, z: bedZ },
    resolution: { w: width, h: height },
  })
}
