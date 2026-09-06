import { describe, expect, it } from 'vitest'
import { posKey } from './positionKey'

describe('posKey', () => {
  it('quantizes xyz to stable integer key', () => {
    expect(posKey(1.23456, -2.34567, 3.45678)).toBe('12346_-23457_34568')
  })

  it('supports custom quantization factor', () => {
    expect(posKey(1.24, 2.26, 3.29, 10)).toBe('12_23_33')
  })
})
