import { describe, expect, it, vi } from 'vitest'
import { gripBaselineStlSyncHint } from './rasterGripBaselineLoader'

vi.mock('three/examples/jsm/loaders/STLLoader.js', () => ({
  STLLoader: class {
    parse() {
      const arr = new Float32Array(9)
      arr[0] = 0
      return { getAttribute: () => ({ array: arr }) }
    }
  },
}))

describe('rasterGripBaselineLoader', () => {
  it('documents sync command', () => {
    expect(gripBaselineStlSyncHint()).toContain('sync:grip-fixtures')
  })
})
