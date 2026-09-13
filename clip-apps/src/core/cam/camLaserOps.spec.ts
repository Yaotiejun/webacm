import { describe, expect, it } from 'vitest'
import { createLaserOffOp, createLaserOnOp, isLaserCamOp } from './camLaserOps'

describe('camLaserOps', () => {
  it('creates laser on/off defaults', () => {
    const on = createLaserOnOp()
    expect(on.type).toBe('laser on')
    expect(on.adapt).toBe(true)
    expect(on.power).toBe(1)
    const off = createLaserOffOp()
    expect(off.type).toBe('laser off')
    expect(isLaserCamOp(on)).toBe(true)
    expect(isLaserCamOp(off)).toBe(true)
    expect(isLaserCamOp({ type: 'rough', tool: 1 })).toBe(false)
  })
})
