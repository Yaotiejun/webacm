/**
 * Simplified Anycubic Photon (.photon) writer — shapexcam MVP.
 * Magic + RLE layer payloads (Kiri/x_photon style run bytes).
 */

export type PhotonBuildOpts = {
  layers: Uint8Array[]
  width: number
  height: number
  layerHeight: number
  bedX: number
  bedY: number
  bedZ: number
  layerOn: number
  baseOn: number
  baseLayers: number
}

/** Photon-style RLE: high bit = color (0/1), low 7 bits = run length (1..127). */
export function rleEncodePhotonLayer(pixels: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < pixels.length) {
    const color = pixels[i]! ? 1 : 0
    let count = 1
    while (i + count < pixels.length && (pixels[i + count]! ? 1 : 0) === color && count < 127) {
      count += 1
    }
    out.push((color << 7) | count)
    i += count
  }
  return Uint8Array.from(out)
}

/**
 * Build a non-empty .photon ArrayBuffer.
 * Header is simplified (preview addresses → EOF); layer table + RLE follow.
 */
export function buildPhotonFile(opts: PhotonBuildOpts): ArrayBuffer {
  const width = Math.max(1, Math.floor(opts.width))
  const height = Math.max(1, Math.floor(opts.height))
  const layerCount = opts.layers.length
  const HEADER = 96
  const LAYER_DEF = 36
  const tableBytes = layerCount * LAYER_DEF

  const encoded = opts.layers.map((L) => rleEncodePhotonLayer(L))
  let dataBytes = 0
  for (const e of encoded) dataBytes += e.length

  const total = HEADER + tableBytes + dataBytes
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)

  dv.setUint32(0, 0x1900fd12, true)
  dv.setUint32(4, 1, true)
  dv.setFloat32(8, opts.bedX, true)
  dv.setFloat32(12, opts.bedY, true)
  dv.setFloat32(16, opts.bedZ, true)
  dv.setUint32(20, 0, true)
  dv.setFloat32(24, 0, true)
  dv.setFloat32(28, opts.layerHeight, true)
  dv.setFloat32(32, opts.layerOn, true)
  dv.setFloat32(36, opts.baseOn, true)
  dv.setUint32(40, Math.max(0, Math.floor(opts.baseLayers)), true)
  dv.setUint16(44, width, true)
  dv.setUint16(46, height, true)
  dv.setUint32(48, layerCount, true)
  dv.setUint32(52, total, true)
  dv.setUint32(56, 0, true)
  dv.setUint32(60, total, true)
  dv.setUint32(64, 0, true)
  const mark = new TextEncoder().encode('SXPHOTON')
  u8.set(mark.slice(0, 8), 68)

  let dataOffset = HEADER + tableBytes
  for (let i = 0; i < layerCount; i += 1) {
    const off = HEADER + i * LAYER_DEF
    const payload = encoded[i]!
    const z = (i + 1) * opts.layerHeight
    const exposure = i < opts.baseLayers ? opts.baseOn : opts.layerOn
    dv.setUint32(off + 0, dataOffset, true)
    dv.setUint32(off + 4, payload.length, true)
    dv.setFloat32(off + 8, z, true)
    dv.setFloat32(off + 12, exposure, true)
    dv.setFloat32(off + 16, 0, true)
    dv.setFloat32(off + 20, 0, true)
    dv.setUint32(off + 24, 0, true)
    dv.setUint32(off + 28, 0, true)
    dv.setUint32(off + 32, 0, true)
    u8.set(payload, dataOffset)
    dataOffset += payload.length
  }

  return buf
}
