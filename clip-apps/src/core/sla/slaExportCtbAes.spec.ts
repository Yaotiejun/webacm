import { describe, expect, it } from 'vitest'
import {
  CTB_ENCRYPTED_MAGIC,
  ctbDecrypt,
  ctbEncrypt,
} from './slaExportCtbAes'
import {
  buildCtbEncryptedFileSync,
  readCtbEncryptedMagic,
} from './slaExportCtbEncrypted'

describe('slaExportCtbAes', () => {
  it('encrypt→decrypt round-trips a 16-byte-aligned buffer', () => {
    const plain = new Uint8Array(32)
    for (let i = 0; i < plain.length; i++) plain[i] = (i * 17 + 3) & 0xff
    const enc = ctbEncrypt(plain)
    expect(enc.length).toBe(32)
    expect([...enc]).not.toEqual([...plain])
    const dec = ctbDecrypt(enc)
    expect([...dec]).toEqual([...plain])
  })

  it('exports CTB_ENCRYPTED_MAGIC 0x12fd0107', () => {
    expect(CTB_ENCRYPTED_MAGIC).toBe(0x12fd0107)
    const plane = new Uint8Array(16)
    plane[0] = 1
    plane[15] = 1
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
  })
})
