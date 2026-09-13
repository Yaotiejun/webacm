import { describe, expect, it } from 'vitest'
import {
  buildCtbFile,
  CTB_MVP_SEED,
  CTB_V3_MAGIC,
  decodeCtbLayerPixels,
  readCtbHeader,
} from './slaExportCtb'
import { ctbLayerCrypt, ctbLayerCryptInPlace } from './slaExportCtbCrypto'
import { decodeCtbRle, encodeCtbRle } from './slaExportCtbRle'

describe('slaExportCtbRle', () => {
  it('round-trips a sparse 0/1 plane', () => {
    const plane = new Uint8Array(64)
    plane[0] = 1
    plane[1] = 1
    plane[10] = 1
    plane[63] = 1
    const rle = encodeCtbRle(plane)
    const decoded = decodeCtbRle(rle, plane.length)
    expect(decoded[0]).toBe(3)
    expect(decoded[1]).toBe(3)
    expect(decoded[2]).toBe(0)
    expect(decoded[10]).toBe(3)
    expect(decoded[63]).toBe(3)
    for (let i = 0; i < plane.length; i++) {
      expect(decoded[i]! > 0).toBe(plane[i]! > 0)
    }
  })
})

describe('slaExportCtbCrypto', () => {
  it('crypt twice is identity (XOR)', () => {
    const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const once = ctbLayerCrypt(CTB_MVP_SEED, 0, input)
    expect(once).not.toEqual(input)
    const twice = ctbLayerCrypt(CTB_MVP_SEED, 0, once)
    expect([...twice]).toEqual([...input])

    const inplace = new Uint8Array(input)
    ctbLayerCryptInPlace(CTB_MVP_SEED, 3, inplace)
    ctbLayerCryptInPlace(CTB_MVP_SEED, 3, inplace)
    expect([...inplace]).toEqual([...input])
  })
})

describe('buildCtbFile', () => {
  it('writes CTB v3 magic and round-trips layer 0', () => {
    const w = 8
    const h = 8
    const plane = new Uint8Array(w * h)
    plane[0] = 1
    plane[7] = 1
    plane[w * h - 1] = 1
    const buf = buildCtbFile({
      layers: [plane],
      width: w,
      height: h,
      layerHeight: 0.05,
      bedX: 120,
      bedY: 68,
      bedZ: 150,
    })
    const hdr = readCtbHeader(buf)
    expect(hdr.magic).toBe(CTB_V3_MAGIC)
    expect(hdr.version).toBe(3)
    expect(hdr.seed).toBe(CTB_MVP_SEED)
    expect(hdr.width).toBe(w)
    expect(hdr.height).toBe(h)
    expect(hdr.layerCount).toBe(1)

    const decoded = decodeCtbLayerPixels(buf, 0)
    expect(decoded.length).toBe(w * h)
    expect(decoded[0]! > 0).toBe(true)
    expect(decoded[7]! > 0).toBe(true)
    expect(decoded[w * h - 1]! > 0).toBe(true)
    expect(decoded[1]).toBe(0)
  })
})

describe('buildCtbEncryptedFile', () => {
  it('writes encrypted magic 0x12fd0107', async () => {
    const { buildCtbEncryptedFileSync, readCtbEncryptedMagic } = await import('./slaExportCtbEncrypted')
    const { CTB_ENCRYPTED_MAGIC } = await import('./slaExportCtbAes')
    const plane = new Uint8Array(16)
    plane[0] = 1
    const buf = buildCtbEncryptedFileSync({
      layers: [plane],
      width: 4,
      height: 4,
      layerHeight: 0.05,
      bedX: 120,
      bedY: 68,
      bedZ: 150,
    })
    expect(readCtbEncryptedMagic(buf)).toBe(CTB_ENCRYPTED_MAGIC)
    expect(CTB_ENCRYPTED_MAGIC).toBe(0x12fd0107)
  })
})
