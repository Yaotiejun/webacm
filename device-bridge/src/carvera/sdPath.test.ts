import { describe, expect, it } from 'node:test'
import assert from 'node:assert/strict'
import { crc16xmodem } from './crc16.ts'
import { buildCarveraXmodemChunks, md5Hex, sanitizeCarveraSdPath } from './sdPath.ts'

describe('carvera crc16xmodem', () => {
  it('is stable for empty and short buffers', () => {
    assert.equal(crc16xmodem(Buffer.alloc(0)), 0)
    assert.equal(crc16xmodem(Buffer.from([0x01, 0x02])), crc16xmodem(Buffer.from([0x01, 0x02])))
  })
})

describe('carvera sdPath', () => {
  it('sanitizes to /sd/gcodes/', () => {
    assert.equal(sanitizeCarveraSdPath('hello world.nc'), '/sd/gcodes/hello_world.nc')
  })

  it('builds md5 + 8k chunks', () => {
    const file = Buffer.alloc(9000, 0x41)
    const chunks = buildCarveraXmodemChunks(file)
    assert.equal(chunks[0]!.toString('utf8'), md5Hex(file))
    assert.equal(chunks.length, 3) // md5 + 8192 + 808
    assert.equal(chunks[1]!.length, 8192)
  })
})
