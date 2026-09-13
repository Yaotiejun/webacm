/**
 * Elegoo GOO V3.0 machine-readable writer (Kiri x_goo.js layout).
 * Big-endian fields; zeroed preview stubs for deterministic goldens.
 */

export type GooBuildOpts = {
  layers: Uint8Array[]
  width: number
  height: number
  layerHeight: number
  bedX?: number
  bedY?: number
  bedZ?: number
  layerOn?: number
  baseOn?: number
  baseLayers?: number
  machineName?: string
  /** Fixed file create time for deterministic exports. */
  fileCreateTime?: string
}

export const GOO_FILE_VERSION = 'V3.0'
/** FILE_MAGIC from Kiri x_goo.js — also exported as GOO_MVP_MAGIC for soak alias. */
export const GOO_FILE_MAGIC = new Uint8Array([0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00])
/** @deprecated use GOO_FILE_MAGIC */
export const GOO_MVP_MAGIC = GOO_FILE_MAGIC

const DELIMITER = new Uint8Array([0x0d, 0x0a])
const LAYER_MAGIC = 0x55
const HEADER_SIZE = 195477
const LAYER_DEF_SIZE = 70
const FOOTER_SIZE = 11
const MAX_RUN = 0x0fffffff
const PREVIEW_SMALL = 116
const PREVIEW_LARGE = 290

class BinaryWriter {
  buffer: ArrayBuffer
  view: DataView
  pos = 0

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer
    this.view = new DataView(buffer)
  }

  seek(pos: number): void {
    this.pos = pos
  }

  writeBytes(bytes: Uint8Array | number[]): void {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    new Uint8Array(this.buffer, this.pos, u8.length).set(u8)
    this.pos += u8.length
  }

  writeString(value: string, length: number): void {
    const v = value || ''
    for (let i = 0; i < length; i++) {
      this.writeU8(i < v.length ? v.charCodeAt(i) : 0)
    }
  }

  writeU8(value: number): void {
    this.view.setUint8(this.pos, Number(value || 0) & 0xff)
    this.pos += 1
  }

  writeU16(value: number): void {
    this.view.setUint16(this.pos, Number(value || 0) & 0xffff, false)
    this.pos += 2
  }

  writeU32(value: number): void {
    this.view.setUint32(this.pos, Number(value || 0) >>> 0, false)
    this.pos += 4
  }

  writeF32(value: number): void {
    this.view.setFloat32(this.pos, Number(value || 0), false)
    this.pos += 4
  }
}

function checksum(bytes: number[] | Uint8Array): number {
  let sum = 0
  for (let i = 1; i < bytes.length; i++) {
    sum = (sum + (bytes[i] || 0)) & 0xff
  }
  return (~sum) & 0xff
}

function writeRun(output: number[], color: number, previous: number, run: number): void {
  while (run > 0) {
    const stride = Math.min(run, MAX_RUN)
    const diff = Math.abs(color - previous)
    if (color > 0 && color < 255 && diff <= 0x0f && stride <= 0xff) {
      let first = 0x80 | (diff & 0x0f)
      if (stride > 1) first |= 0x10
      if (color < previous) first |= 0x20
      output.push(first)
      if (stride > 1) output.push(stride)
      run -= stride
      continue
    }

    const lengthCode = stride <= 0x0f ? 0 : stride <= 0x0fff ? 1 : stride <= 0x0fffff ? 2 : 3
    const type = color === 0 ? 0 : color === 255 ? 3 : 1
    const first = (type << 6) | (lengthCode << 4) | (stride & 0x0f)
    const ext: number[] = []
    if (lengthCode >= 1) ext.unshift((stride >> 4) & 0xff)
    if (lengthCode >= 2) ext.unshift((stride >> 12) & 0xff)
    if (lengthCode >= 3) ext.unshift((stride >> 20) & 0xff)
    output.push(first)
    if (type === 1) output.push(color)
    output.push(...ext)
    run -= stride
  }
}

/** GOO RLE (LAYER_MAGIC 0x55 + runs + checksum). Differs from CTB RLE. */
export function encodeGooRle(input: Uint8Array): Uint8Array {
  const output: number[] = [LAYER_MAGIC]
  let previous = 0
  let current = input[0] || 0
  let run = 0

  for (let i = 0; i < input.length; i++) {
    const value = input[i] || 0
    if (value === current && run < MAX_RUN) {
      run++
    } else {
      writeRun(output, current, previous, run)
      previous = current
      current = value
      run = 1
    }
  }
  writeRun(output, current, previous, run)
  output.push(checksum(output))
  return Uint8Array.from(output)
}

function normalizePlane(plane: Uint8Array): Uint8Array {
  const out = new Uint8Array(plane.length)
  for (let i = 0; i < plane.length; i++) {
    const v = plane[i] || 0
    out[i] = v === 0 ? 0 : v === 255 ? 255 : v > 0 ? 255 : 0
  }
  return out
}

export function buildGooFile(opts: GooBuildOpts): ArrayBuffer {
  const width = Math.max(1, Math.floor(opts.width))
  const height = Math.max(1, Math.floor(opts.height))
  const layerCount = opts.layers.length
  const layerHeight = opts.layerHeight
  const layerOn = opts.layerOn ?? 2.5
  const baseOn = opts.baseOn ?? 25
  const baseLayers = opts.baseLayers ?? 8
  const bedX = opts.bedX ?? 0
  const bedY = opts.bedY ?? 0
  const bedZ = opts.bedZ ?? 0
  const machineName = opts.machineName ?? 'shapexcam'
  const fileCreateTime = opts.fileCreateTime ?? '2026-01-01 00:00:00'

  const encoded = opts.layers.map((plane, index) => {
    const data = encodeGooRle(normalizePlane(plane))
    const z = (index + 1) * layerHeight
    return {
      data,
      dataLength: data.length,
      z,
      pausePositionZ: bedZ,
      exposure: index < baseLayers ? baseOn : layerOn,
      lightOffDelay: 0,
      waitTimeAfterCure: 0,
      waitTimeAfterLift: 0,
      waitTimeBeforeCure: 0,
      liftHeight: 5,
      liftSpeed: 60,
      liftHeight2: 0,
      liftSpeed2: 0,
      retractHeight: 5,
      retractSpeed: 60,
      retractHeight2: 0,
      retractSpeed2: 0,
      lightPWM: 255,
    }
  })

  let total = HEADER_SIZE + FOOTER_SIZE
  for (const layer of encoded) {
    total += LAYER_DEF_SIZE + layer.dataLength + DELIMITER.length
  }

  const writer = new BinaryWriter(new ArrayBuffer(total))

  writer.writeString(GOO_FILE_VERSION, 4)
  writer.writeBytes(GOO_FILE_MAGIC)
  writer.writeString('shapexcam', 32)
  writer.writeString('1.0', 24)
  writer.writeString(fileCreateTime, 24)
  writer.writeString(machineName, 32)
  writer.writeString('DLP', 32)
  writer.writeString('shapexcam', 32)
  writer.writeU16(1)
  writer.writeU16(1)
  writer.writeU16(0)
  writer.writeBytes(new Uint8Array(PREVIEW_SMALL * PREVIEW_SMALL * 2))
  writer.writeBytes(DELIMITER)
  writer.writeBytes(new Uint8Array(PREVIEW_LARGE * PREVIEW_LARGE * 2))
  writer.writeBytes(DELIMITER)
  writer.writeU32(layerCount)
  writer.writeU16(width)
  writer.writeU16(height)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeF32(bedX)
  writer.writeF32(bedY)
  writer.writeF32(bedZ)
  writer.writeF32(layerHeight)
  writer.writeF32(layerOn)
  writer.writeU8(1)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(baseOn)
  writer.writeU32(baseLayers)
  writer.writeF32(5)
  writer.writeF32(60)
  writer.writeF32(5)
  writer.writeF32(60)
  writer.writeF32(5)
  writer.writeF32(60)
  writer.writeF32(5)
  writer.writeF32(60)
  for (let i = 0; i < 8; i++) writer.writeF32(0)
  writer.writeU16(255)
  writer.writeU16(255)
  writer.writeU8(0)
  writer.writeU32(
    Math.round(
      baseLayers * baseOn + Math.max(0, layerCount - baseLayers) * layerOn,
    ),
  )
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeF32(0)
  writer.writeString('$', 8)
  writer.writeU32(HEADER_SIZE)
  writer.writeU8(1)
  writer.writeU16(0)

  if (writer.pos !== HEADER_SIZE) {
    throw new Error('GOO header size mismatch (' + writer.pos + ' !== ' + HEADER_SIZE + ')')
  }

  writer.seek(HEADER_SIZE)
  for (const layer of encoded) {
    writer.writeU16(0)
    writer.writeF32(layer.pausePositionZ)
    writer.writeF32(layer.z)
    writer.writeF32(layer.exposure)
    writer.writeF32(layer.lightOffDelay)
    writer.writeF32(layer.waitTimeAfterCure)
    writer.writeF32(layer.waitTimeAfterLift)
    writer.writeF32(layer.waitTimeBeforeCure)
    writer.writeF32(layer.liftHeight)
    writer.writeF32(layer.liftSpeed)
    writer.writeF32(layer.liftHeight2)
    writer.writeF32(layer.liftSpeed2)
    writer.writeF32(layer.retractHeight)
    writer.writeF32(layer.retractSpeed)
    writer.writeF32(layer.retractHeight2)
    writer.writeF32(layer.retractSpeed2)
    writer.writeU16(layer.lightPWM)
    writer.writeBytes(DELIMITER)
    writer.writeU32(layer.dataLength)
    writer.writeBytes(layer.data)
    writer.writeBytes(DELIMITER)
  }

  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeBytes(GOO_FILE_MAGIC)

  if (writer.pos !== total) {
    throw new Error('GOO writer size mismatch (' + writer.pos + ' !== ' + total + ')')
  }

  return writer.buffer
}

/** Magic bytes start at offset 4 after FILE_VERSION. */
export function readGooFileMagic(buf: ArrayBuffer): Uint8Array {
  return new Uint8Array(buf, 4, 8)
}

export function readGooFileVersion(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf, 0, 4)
  let s = ''
  for (let i = 0; i < 4; i++) {
    if (!u8[i]) break
    s += String.fromCharCode(u8[i]!)
  }
  return s
}

/** True when buffer starts with V3.0 + GOO_FILE_MAGIC. */
export function gooFileMagicOk(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 12) return false
  if (readGooFileVersion(buf) !== GOO_FILE_VERSION) return false
  const magic = readGooFileMagic(buf)
  for (let i = 0; i < GOO_FILE_MAGIC.length; i++) {
    if (magic[i] !== GOO_FILE_MAGIC[i]) return false
  }
  return true
}
