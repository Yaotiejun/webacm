/**
 * ChiTu-like CTB v3 writer: header + RLE layers with per-layer XOR crypt.
 * Skips full preview / AES header crypto; enough structure for magic + layer round-trip.
 */
import {
  CTB_MVP_SEED,
  CTB_V3_MAGIC,
  ctbLayerCrypt,
} from '@/core/sla/slaExportCtbCrypto'
import { decodeCtbRle, encodeCtbRle } from '@/core/sla/slaExportCtbRle'

export { CTB_V3_MAGIC, CTB_MVP_SEED } from '@/core/sla/slaExportCtbCrypto'

export type CtbBuildOpts = {
  layers: Uint8Array[]
  width: number
  height: number
  layerHeight: number
  bedX: number
  bedY: number
  bedZ: number
  layerOn?: number
  baseOn?: number
  baseLayers?: number
  /** Override encryption seed (default CTB_MVP_SEED). */
  seed?: number
}

const HEADER_SIZE = 0x70
const LAYER_TABLE_RECORD_SIZE = 36
const LAYER_FULL_RECORD_SIZE = 84

export type CtbLayerPayload = {
  index: number
  z: number
  exposure: number
  lightOffDelay: number
  data: Uint8Array
  imageOffset: number
  imageLength: number
  fullOffset: number
  blockLength: number
}

/** Build CTB v3-ish file (magic 0x12fd0086). */
export function buildCtbFile(opts: CtbBuildOpts): ArrayBuffer {
  const width = Math.max(1, Math.floor(opts.width))
  const height = Math.max(1, Math.floor(opts.height))
  const layerCount = opts.layers.length
  const seed = (opts.seed ?? CTB_MVP_SEED) >>> 0
  const layerOn = opts.layerOn ?? 2.5
  const baseOn = opts.baseOn ?? 25
  const baseLayers = opts.baseLayers ?? 8
  const layerOff = 0
  const layerHeight = opts.layerHeight

  const payloads: CtbLayerPayload[] = opts.layers.map((plane, index) => {
    const rle = encodeCtbRle(plane)
    const data = ctbLayerCrypt(seed, index, rle)
    const z = (index + 1) * layerHeight
    const exposure = index < baseLayers ? baseOn : layerOn
    return {
      index,
      z,
      exposure,
      lightOffDelay: layerOff,
      data,
      imageOffset: 0,
      imageLength: data.length,
      fullOffset: 0,
      blockLength: 0,
    }
  })

  const layerTableOffset = HEADER_SIZE
  let imageOffset = layerTableOffset + layerCount * LAYER_TABLE_RECORD_SIZE

  for (const layer of payloads) {
    layer.fullOffset = imageOffset
    layer.imageOffset = imageOffset + LAYER_FULL_RECORD_SIZE
    layer.imageLength = layer.data.length
    layer.blockLength = LAYER_FULL_RECORD_SIZE + layer.imageLength
    imageOffset = layer.imageOffset + layer.imageLength
  }

  const buffer = new ArrayBuffer(imageOffset)
  const dv = new DataView(buffer)
  const u8 = new Uint8Array(buffer)

  // Header (ChiTu-like v3 layout; preview/print/machine offsets = 0)
  dv.setUint32(0, CTB_V3_MAGIC, true)
  dv.setUint32(4, 3, true)
  dv.setFloat32(8, opts.bedX, true)
  dv.setFloat32(12, opts.bedY, true)
  dv.setFloat32(16, opts.bedZ, true)
  // 12 bytes reserved
  dv.setFloat32(32, layerHeight, true)
  dv.setFloat32(36, layerOn, true)
  dv.setFloat32(40, baseOn, true)
  dv.setFloat32(44, layerOff, true)
  dv.setUint32(48, baseLayers, true)
  dv.setUint32(52, width, true)
  dv.setUint32(56, height, true)
  dv.setUint32(60, 0, true) // previewLargeOffset
  dv.setUint32(64, layerTableOffset, true)
  dv.setUint32(68, layerCount, true)
  dv.setUint32(72, 0, true) // previewSmallOffset
  dv.setUint32(76, 0, true) // printTime
  dv.setUint32(80, 1, true)
  dv.setUint32(84, 0, true) // printParamsOffset
  dv.setUint32(88, 0, true) // printParamsSize
  dv.setUint32(92, 1, true) // antiAlias
  dv.setUint16(96, 0x00ff, true)
  dv.setUint16(98, 0x00ff, true)
  dv.setUint32(100, seed, true)
  dv.setUint32(104, 0, true) // machineInfoOffset
  dv.setUint32(108, 0, true) // machineInfoSize

  // Layer table
  let o = layerTableOffset
  for (const layer of payloads) {
    dv.setFloat32(o + 0, layer.z, true)
    dv.setFloat32(o + 4, layer.exposure, true)
    dv.setFloat32(o + 8, layer.lightOffDelay, true)
    dv.setUint32(o + 12, layer.imageOffset, true)
    dv.setUint32(o + 16, layer.imageLength, true)
    dv.setUint32(o + 20, 0, true)
    dv.setUint32(o + 24, LAYER_FULL_RECORD_SIZE, true)
    dv.setUint32(o + 28, 0, true)
    dv.setUint32(o + 32, 0, true)
    o += LAYER_TABLE_RECORD_SIZE
  }

  // Full layer records + encrypted RLE payloads
  for (const layer of payloads) {
    const fo = layer.fullOffset
    dv.setFloat32(fo + 0, layer.z, true)
    dv.setFloat32(fo + 4, layer.exposure, true)
    dv.setFloat32(fo + 8, layer.lightOffDelay, true)
    dv.setUint32(fo + 12, layer.imageOffset, true)
    dv.setUint32(fo + 16, layer.imageLength, true)
    dv.setUint32(fo + 20, 0, true)
    dv.setUint32(fo + 24, LAYER_FULL_RECORD_SIZE, true)
    dv.setUint32(fo + 28, 0, true)
    dv.setUint32(fo + 32, 0, true)
    dv.setUint32(fo + 36, layer.blockLength, true)
    dv.setFloat32(fo + 40, 5, true) // liftDistance stub
    dv.setFloat32(fo + 44, 60, true) // liftSpeed stub
    // remaining padded zeros
    u8.set(layer.data, layer.imageOffset)
  }

  return buffer
}

/** Read header fields used by tests / round-trip. */
export function readCtbHeader(buf: ArrayBuffer): {
  magic: number
  version: number
  width: number
  height: number
  layerCount: number
  seed: number
  layerTableOffset: number
} {
  const dv = new DataView(buf)
  return {
    magic: dv.getUint32(0, true),
    version: dv.getUint32(4, true),
    width: dv.getUint32(52, true),
    height: dv.getUint32(56, true),
    layerCount: dv.getUint32(68, true),
    seed: dv.getUint32(100, true),
    layerTableOffset: dv.getUint32(64, true),
  }
}

/** Decrypt + decode layer N pixels (for round-trip tests). */
export function decodeCtbLayerPixels(buf: ArrayBuffer, layerIndex: number): Uint8Array {
  const hdr = readCtbHeader(buf)
  const dv = new DataView(buf)
  const tableOff = hdr.layerTableOffset + layerIndex * LAYER_TABLE_RECORD_SIZE
  const imageOffset = dv.getUint32(tableOff + 12, true)
  const imageLength = dv.getUint32(tableOff + 16, true)
  const enc = new Uint8Array(buf, imageOffset, imageLength)
  const rle = ctbLayerCrypt(hdr.seed, layerIndex, enc)
  return decodeCtbRle(rle, hdr.width * hdr.height)
}
