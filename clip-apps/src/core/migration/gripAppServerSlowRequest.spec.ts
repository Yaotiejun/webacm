import { describe, expect, it } from 'vitest'
import { GripAppServerSlowRequestWatcher } from './gripAppServerSlowRequest'

describe('gripAppServerSlowRequest', () => {
  it('reports paths open longer than 5s', () => {
    const w = new GripAppServerSlowRequestWatcher()
    const id = w.track('/api/slow', 1000)
    expect(w.tick(5000)).toEqual([])
    expect(w.tick(6001)).toEqual(['/api/slow'])
    expect(w.tick(7000)).toEqual([])
    w.close(id)
  })
})
