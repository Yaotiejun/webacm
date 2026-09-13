import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { sha256BytesSync, sha256HexSync } from './sha256Sync'

describe('sha256Sync', () => {
  it('matches node:crypto for empty and short vectors', () => {
    expect(sha256HexSync(new Uint8Array())).toBe(
      createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
    )
    const msg = new TextEncoder().encode('abc')
    expect(sha256HexSync(msg)).toBe(createHash('sha256').update(msg).digest('hex'))
  })
})
