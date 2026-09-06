import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTexturizerLastRunParams,
  loadTexturizerLastRunParams,
  saveTexturizerLastRunParams,
} from './texturizerLastRunPersist'

describe('texturizerLastRunPersist', () => {
  beforeEach(() => {
    clearTexturizerLastRunParams()
  })

  it('round-trips params', () => {
    saveTexturizerLastRunParams({
      amplitude: 0.5,
      frequency: 2,
      mappingMode: 6,
      scaleU: 1,
      scaleV: 1,
      offsetU: 0,
      offsetV: 0,
      rotationDeg: 0,
      mappingBlend: 0,
      seamBandWidth: 0.5,
      capAngle: 20,
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      exclusionMode: 'exclude',
      subdivisionLevels: 1,
      decimationRatio: 0.9,
      symmetricDisplacement: false,
    })
    const loaded = loadTexturizerLastRunParams()
    expect(loaded?.amplitude).toBe(0.5)
    expect(loaded?.frequency).toBe(2)
    expect(loaded?.subdivisionLevels).toBe(1)
  })
})
