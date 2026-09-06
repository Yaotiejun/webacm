import { describe, expect, it } from 'vitest'
import { GripAppServerWssRegistry } from './gripAppServerWssRegistry'

describe('gripAppServerWssRegistry', () => {
  it('registers and dispatches wss handlers by path', () => {
    const reg = new GripAppServerWssRegistry()
    let seen: unknown
    reg.register('/device', (p) => {
      seen = p
    })
    expect(reg.dispatch('/device', { ok: true })).toBe(true)
    expect(seen).toEqual({ ok: true })
    expect(reg.dispatch('/missing', {})).toBe(false)
  })
})
