import { describe, expect, it } from 'vitest'

describe('kiriLegacyArrayPolyfills', () => {
  it('loads grip array.js extensions including remove', async () => {
    await import('./legacy/add/array.js')
    await import('./kiriLegacyPolyfills')
    const arr: number[] = [1, 2, 3]
    expect(typeof (arr as number[] & { remove: (v: number) => unknown }).remove).toBe('function')
    const copy = [1, 2, 3] as number[] & { remove: (v: number) => unknown }
    copy.remove(2)
    expect(copy).toEqual([1, 3])
  })
})
