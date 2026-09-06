import { describe, expect, it } from 'vitest'
import { countChangedFields, listChangedFieldKeys } from './sessionDiffDetector'

describe('cam.sessionDiffDetector', () => {
  it('counts changed fields with ignore support', () => {
    const count = countChangedFields(
      { a: 1, b: 2, ops: [1] },
      { a: 1, b: 3, ops: [2] },
      ['ops'],
    )
    expect(count).toBe(1)
  })

  it('ignores multiple keys when counting', () => {
    const count = countChangedFields(
      { a: 1, b: 2, c: 3 },
      { a: 9, b: 9, c: 3 },
      ['a', 'b'],
    )
    expect(count).toBe(0)
  })

  it('lists changed keys deterministically by object key union order', () => {
    const keys = listChangedFieldKeys({ a: 1, b: 2 }, { a: 9, b: 2, c: 3 })
    expect(keys).toEqual(['a', 'c'])
  })

  it('listChangedFieldKeys respects ignoreKeys', () => {
    const keys = listChangedFieldKeys({ a: 1, b: 2, ops: [] }, { a: 2, b: 2, ops: [1] }, ['ops'])
    expect(keys).toEqual(['a'])
  })

  it('treats floating-point noise within 1e-9 as unchanged (aligns with snapshot diff)', () => {
    const count = countChangedFields({ camTolerance: 0.1 + 0.2 }, { camTolerance: 0.3 })
    expect(count).toBe(0)
  })

  it('treats key-order-only differences as unchanged', () => {
    const count = countChangedFields(
      { cfg: { b: 2, a: 1 } },
      { cfg: { a: 1, b: 2 } },
    )
    const keys = listChangedFieldKeys(
      { cfg: { b: 2, a: 1 } },
      { cfg: { a: 1, b: 2 } },
    )
    expect(count).toBe(0)
    expect(keys).toEqual([])
  })
})
