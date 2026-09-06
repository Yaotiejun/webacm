import { describe, expect, it } from 'vitest'
import { gripNetLevelHash } from './gripNetLevelHash'

describe('gripNetLevelHash', () => {
  it('matches pinned SHA-512 hex for sample payload', () => {
    const h = gripNetLevelHash('shape_cam_net_level')
    expect(h).toMatch(/^[a-f0-9]{128}$/)
    expect(h).toBe(
      '31d80b7a0f9f007b413060160eb9bbcbe95318bcc98b8d5f88f823ab7504cb70a8f48c4580c0b1dcaea70142b9bcb520e5d2e533d5fd442d3fe5448ee0bdb48b',
    )
  })
})
