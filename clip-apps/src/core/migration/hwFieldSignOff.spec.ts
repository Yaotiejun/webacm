import { describe, expect, it } from 'vitest'
import { evaluateHwFieldSignOff } from './hwFieldSignOff'

describe('hwFieldSignOff', () => {
  it('returns unsigned HW-04..09 checklist', () => {
    const r = evaluateHwFieldSignOff()
    expect(r.ok).toBe(true)
    expect(r.rows.map((x) => x.id)).toEqual([
      'HW-04',
      'HW-05',
      'HW-06',
      'HW-07',
      'HW-08',
      'HW-09',
    ])
    expect(r.unsigned).toHaveLength(6)
    expect(r.rows.every((x) => x.signed === false)).toBe(true)
  })
})
