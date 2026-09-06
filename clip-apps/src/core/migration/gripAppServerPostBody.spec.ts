import { describe, expect, it } from 'vitest'
import { accumulateGripPostBody, isGripPostMethod } from './gripAppServerPostBody'

describe('gripAppServerPostBody', () => {
  it('accumulates POST chunks like grip decodePost', () => {
    expect(accumulateGripPostBody(['{"a":', '1}'])).toBe('{"a":1}')
    expect(isGripPostMethod('POST')).toBe(true)
    expect(isGripPostMethod('GET')).toBe(false)
  })
})
