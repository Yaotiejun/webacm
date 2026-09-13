/**
 * ChiTu CTB encrypted v5 writer (magic 0x12fd0107).
 * Plaintext FileHeader + AES-CBC encrypted SlicerSettings + RLE layers with XOR crypt.
 * Based on UVtools/Kiri CTB encrypted layout; previews omitted (offsets 0).
 */
import { sha256BytesSync } from '@/core/crypto/sha256Sync'
import {
  CTB_ENCRYPTED_HEADER_SIZE,
  CTB_ENCRYPTED_LAYER_DEF_SIZE,
  CTB_ENCRYPTED_LAYER_POINTER_SIZE,
  CTB_ENCRYPTED_MAGIC,
  CTB_ENCRYPTED_SETTINGS_SIZE,
  CTB_ENCRYPTED_VERSION,
  CTB_LAYER_XOR_KEY,
  CTB_PER_LAYER_SETTINGS_DISALLOW,
  ctbEncrypt,
  ctbSignature,
} from '@/core/sla/slaExportCtbAes'
import { ctbLayerCrypt } from '@/core/sla/slaExportCtbCrypto'
import { encodeCtbRle } from '@/core/sla/slaExportCtbRle'

/** ChiTu page size used by layer pointer addressing (4 MiB). */
const CTB_PAGE_SIZE = 4 * 1024 * 1024

const DISCLAIMER =
  'Layout and record format for the ctb and cbddlp file types are the copyrighted programs or codes of CBD Technology (China) Inc..The Customer or User shall not in any manner reproduce, distribute, modify, decompile, disassemble, decrypt, extract, reverse engineer, lease, assign, or sublicense the said programs or codes.'

export type CtbEncryptedBuildOpts = {
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
  /** XOR seed for layer RLE (default CTB_LAYER_XOR_KEY). */
  seed?: number
  machineName?: string
  /** Fixed checksum for deterministic exports (default 0xcafebabe). */
  checksumValue?: number
}

function writeU32(dv: DataView, o: number, v: number): void {
  dv.setUint32(o, v >>> 0, true)
}

function writeF32(dv: DataView, o: number, v: number): void {
  dv.setFloat32(o, v, true)
}

function writeU16(dv: DataView, o: number, v: number): void {
  dv.setUint16(o, v & 0xffff, true)
}

function writeU8(dv: DataView, o: number, v: number): void {
  dv.setUint8(o, v & 0xff)
}

function writeU64(dv: DataView, o: number, v: number): void {
  writeU32(dv, o, v >>> 0)
  writeU32(dv, o + 4, Math.floor(v / 0x100000000))
}

function buildSettingsPlain(opts: {
  layerPointersOffset: number
  bedX: number
  bedY: number
  bedZ: number
  layerHeight: number
  layerOn: number
  baseOn: number
  baseLayers: number
  width: number
  height: number
  layerCount: number
  seed: number
  machineNameOffset: number
  machineNameSize: number
  disclaimerOffset: number
  disclaimerSize: number
  checksumValue: number
  lastLayerIndex: number
}): Uint8Array {
  const buf = new ArrayBuffer(CTB_ENCRYPTED_SETTINGS_SIZE)
  const dv = new DataView(buf)
  let o = 0
  writeU64(dv, o, opts.checksumValue); o += 8
  writeU32(dv, o, opts.layerPointersOffset); o += 4
  writeF32(dv, o, opts.bedX); o += 4
  writeF32(dv, o, opts.bedY); o += 4
  writeF32(dv, o, opts.bedZ); o += 4
  writeU32(dv, o, 0); o += 4 // Unknown1
  writeU32(dv, o, 0); o += 4 // Unknown2
  writeF32(dv, o, opts.layerCount * opts.layerHeight); o += 4
  writeF32(dv, o, opts.layerHeight); o += 4
  writeF32(dv, o, opts.layerOn); o += 4
  writeF32(dv, o, opts.baseOn); o += 4
  writeF32(dv, o, 0); o += 4 // LightOffDelay
  writeU32(dv, o, opts.baseLayers); o += 4
  writeU32(dv, o, opts.width); o += 4
  writeU32(dv, o, opts.height); o += 4
  writeU32(dv, o, opts.layerCount); o += 4
  writeU32(dv, o, 0); o += 4 // LargePreviewOffset
  writeU32(dv, o, 0); o += 4 // SmallPreviewOffset
  writeU32(dv, o, Math.round(opts.baseLayers * opts.baseOn + Math.max(0, opts.layerCount - opts.baseLayers) * opts.layerOn)); o += 4
  writeU32(dv, o, 0); o += 4 // ProjectorType
  writeF32(dv, o, 5); o += 4 // BottomLiftHeight
  writeF32(dv, o, 60); o += 4 // BottomLiftSpeed
  writeF32(dv, o, 5); o += 4 // LiftHeight
  writeF32(dv, o, 60); o += 4 // LiftSpeed
  writeF32(dv, o, 60); o += 4 // RetractSpeed
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4 // BottomLightOffDelay
  writeU32(dv, o, 1); o += 4 // Unknown3
  writeU16(dv, o, 255); o += 2 // LightPWM
  writeU16(dv, o, 255); o += 2 // BottomLightPWM
  writeU32(dv, o, opts.seed); o += 4 // LayerXorKey
  // remaining motion/padding fields through 288
  for (let i = 0; i < 7; i++) { writeF32(dv, o, 0); o += 4 } // BottomLiftHeight2..RestTimeAfterLift
  writeU32(dv, o, opts.machineNameOffset); o += 4
  writeU32(dv, o, opts.machineNameSize); o += 4
  writeU8(dv, o, 0x0f); o += 1 // AntiAliasFlag
  writeU16(dv, o, 0); o += 2 // Padding
  writeU8(dv, o, CTB_PER_LAYER_SETTINGS_DISALLOW); o += 1
  writeU32(dv, o, 0); o += 4 // ModifiedTimestampMinutes (0 = deterministic)
  writeU32(dv, o, 1); o += 4 // AntiAliasLevel
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4 // TransitionLayerCount
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeF32(dv, o, 4); o += 4 // Four1
  writeU32(dv, o, 0); o += 4
  writeF32(dv, o, 4); o += 4 // Four2
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeF32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 4); o += 4
  writeU32(dv, o, opts.lastLayerIndex); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, opts.disclaimerOffset); o += 4
  writeU32(dv, o, opts.disclaimerSize); o += 4
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4 // ResinParametersAddress
  writeU32(dv, o, 0); o += 4
  writeU32(dv, o, 0); o += 4
  if (o !== CTB_ENCRYPTED_SETTINGS_SIZE) {
    throw new Error('CTB encrypted settings size mismatch (' + o + ' !== ' + CTB_ENCRYPTED_SETTINGS_SIZE + ')')
  }
  return new Uint8Array(buf)
}

/**
 * Build encrypted CTB v5 file.
 * Sync path uses placeholder signature zeros then fills via async helper when needed;
 * for soak/tests use buildCtbEncryptedFileSync with precomputed signature or await buildCtbEncryptedFile.
 */
export async function buildCtbEncryptedFile(opts: CtbEncryptedBuildOpts): Promise<ArrayBuffer> {
  const checksumValue = opts.checksumValue ?? 0xcafebabe
  const signature = await ctbSignature(checksumValue)
  return buildCtbEncryptedFileWithSignature(opts, signature)
}

/** Sync builder — AES(SHA-256(checksum)) signature (browser-safe, no node:crypto). */
export function buildCtbEncryptedFileSync(
  opts: CtbEncryptedBuildOpts,
  signature?: Uint8Array,
): ArrayBuffer {
  if (signature) return buildCtbEncryptedFileWithSignature(opts, signature)
  const checksumValue = opts.checksumValue ?? 0xcafebabe
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, checksumValue >>> 0, true)
  view.setUint32(4, Math.floor(checksumValue / 0x100000000), true)
  const hash = sha256BytesSync(bytes)
  return buildCtbEncryptedFileWithSignature(opts, ctbEncrypt(hash))
}

function buildCtbEncryptedFileWithSignature(
  opts: CtbEncryptedBuildOpts,
  signature: Uint8Array,
): ArrayBuffer {
  const width = Math.max(1, Math.floor(opts.width))
  const height = Math.max(1, Math.floor(opts.height))
  const layerCount = opts.layers.length
  const seed = (opts.seed ?? CTB_LAYER_XOR_KEY) >>> 0
  const layerOn = opts.layerOn ?? 2.5
  const baseOn = opts.baseOn ?? 25
  const baseLayers = opts.baseLayers ?? 8
  const machineName = opts.machineName ?? 'shapexcam'
  const machineBytes = new TextEncoder().encode(machineName)
  const disclaimerBytes = new TextEncoder().encode(DISCLAIMER.slice(0, 320).padEnd(320, '\0'))
  const checksumValue = opts.checksumValue ?? 0xcafebabe

  const layerRles = opts.layers.map((plane, index) => {
    const rle = encodeCtbRle(plane)
    return ctbLayerCrypt(seed, index, rle)
  })

  let cursor = CTB_ENCRYPTED_HEADER_SIZE + CTB_ENCRYPTED_SETTINGS_SIZE
  // no previews
  const machineNameOffset = cursor
  cursor += machineBytes.length
  const disclaimerOffset = cursor
  cursor += 320
  const layerPointersOffset = cursor
  cursor += layerCount * CTB_ENCRYPTED_LAYER_POINTER_SIZE

  type LayerPlace = { defOffset: number; dataOffset: number; data: Uint8Array }
  const places: LayerPlace[] = []
  for (const data of layerRles) {
    const defOffset = cursor
    const dataOffset = cursor + CTB_ENCRYPTED_LAYER_DEF_SIZE
    places.push({ defOffset, dataOffset, data })
    cursor = dataOffset + data.length
  }

  // v5 trailer before signature
  const trailerOffset = cursor
  cursor += 8
  const signatureOffset = cursor
  const signatureSize = signature.length
  cursor += signatureSize
  cursor += 4 // trailing unknown u32

  const settingsPlain = buildSettingsPlain({
    layerPointersOffset,
    bedX: opts.bedX,
    bedY: opts.bedY,
    bedZ: opts.bedZ,
    layerHeight: opts.layerHeight,
    layerOn,
    baseOn,
    baseLayers,
    width,
    height,
    layerCount,
    seed,
    machineNameOffset,
    machineNameSize: machineBytes.length,
    disclaimerOffset,
    disclaimerSize: 320,
    checksumValue,
    lastLayerIndex: Math.max(0, layerCount - 1),
  })
  const settingsEnc = ctbEncrypt(settingsPlain)
  if (settingsEnc.length !== CTB_ENCRYPTED_SETTINGS_SIZE) {
    throw new Error('encrypted settings length mismatch')
  }

  const buffer = new ArrayBuffer(cursor)
  const dv = new DataView(buffer)
  const u8 = new Uint8Array(buffer)

  // FileHeader (plaintext)
  writeU32(dv, 0, CTB_ENCRYPTED_MAGIC)
  writeU32(dv, 4, CTB_ENCRYPTED_SETTINGS_SIZE)
  writeU32(dv, 8, CTB_ENCRYPTED_HEADER_SIZE) // SettingsOffset
  writeU32(dv, 12, 0)
  writeU32(dv, 16, CTB_ENCRYPTED_VERSION)
  writeU32(dv, 20, signatureSize)
  writeU32(dv, 24, signatureOffset)
  writeU32(dv, 28, 0)
  writeU16(dv, 32, 1)
  writeU16(dv, 34, 1)
  writeU32(dv, 36, 0)
  writeU32(dv, 40, 42)
  writeU32(dv, 44, 0)

  u8.set(settingsEnc, CTB_ENCRYPTED_HEADER_SIZE)
  u8.set(machineBytes, machineNameOffset)
  u8.set(disclaimerBytes.subarray(0, 320), disclaimerOffset)

  for (let i = 0; i < places.length; i++) {
    const p = places[i]!
    const ptrOff = layerPointersOffset + i * CTB_ENCRYPTED_LAYER_POINTER_SIZE
    const pageNumber = Math.floor(p.defOffset / CTB_PAGE_SIZE)
    const layerOffset = p.defOffset - CTB_PAGE_SIZE * pageNumber
    writeU32(dv, ptrOff + 0, layerOffset)
    writeU32(dv, ptrOff + 4, pageNumber)
    writeU32(dv, ptrOff + 8, CTB_ENCRYPTED_LAYER_DEF_SIZE)
    writeU32(dv, ptrOff + 12, 0)

    const fo = p.defOffset
    const dataPage = Math.floor(p.dataOffset / CTB_PAGE_SIZE)
    const dataOffInPage = p.dataOffset - CTB_PAGE_SIZE * dataPage
    writeU32(dv, fo + 0, CTB_ENCRYPTED_LAYER_DEF_SIZE)
    writeF32(dv, fo + 4, (i + 1) * opts.layerHeight)
    writeF32(dv, fo + 8, i < baseLayers ? baseOn : layerOn)
    writeF32(dv, fo + 12, 0)
    writeU32(dv, fo + 16, dataOffInPage)
    writeU32(dv, fo + 20, dataPage)
    writeU32(dv, fo + 24, p.data.length)
    writeU32(dv, fo + 28, 0)
    writeU32(dv, fo + 32, 0) // EncryptedDataOffset
    writeU32(dv, fo + 36, 0) // EncryptedDataLength
    writeF32(dv, fo + 40, 5)
    writeF32(dv, fo + 44, 60)
    // remaining floats/u32 zeroed by ArrayBuffer init
    writeF32(dv, fo + 80, 255) // LightPWM as float
    u8.set(p.data, p.dataOffset)
  }

  writeU32(dv, trailerOffset, 1109414650)
  writeU32(dv, trailerOffset + 4, 0)
  u8.set(signature, signatureOffset)
  writeU32(dv, signatureOffset + signatureSize, 1833054899)

  return buffer
}

export function readCtbEncryptedMagic(buf: ArrayBuffer): number {
  return new DataView(buf).getUint32(0, true)
}
