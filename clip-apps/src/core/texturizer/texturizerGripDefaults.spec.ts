import { describe, expect, it } from 'vitest'
import { applyGripTexturizerUiDefaults, GRIP_STL_TEXTURIZER_UI_DEFAULTS } from './texturizerGripDefaults'

describe('texturizerGripDefaults', () => {
  it('matches grip main.js settings snapshot', () => {
    expect(GRIP_STL_TEXTURIZER_UI_DEFAULTS.mappingMode).toBe(5)
    expect(GRIP_STL_TEXTURIZER_UI_DEFAULTS.amplitude).toBe(0.5)
    expect(GRIP_STL_TEXTURIZER_UI_DEFAULTS.mappingBlend).toBe(1)
    expect(GRIP_STL_TEXTURIZER_UI_DEFAULTS.bottomAngleLimit).toBe(5)
  })

  it('applyGripTexturizerUiDefaults overwrites target fields', () => {
    const target = {
      amplitude: 9,
      frequency: 9,
      mappingMode: 0,
      scaleU: 9,
      scaleV: 9,
      offsetU: 9,
      offsetV: 9,
      rotationDeg: 9,
      mappingBlend: 0,
      seamBandWidth: 0,
      capAngle: 0,
      topAngleLimit: 90,
      bottomAngleLimit: 0,
      exclusionMode: 'include' as const,
      subdivisionLevels: 2,
      decimationRatio: 0.5,
      symmetricDisplacement: true,
    }
    applyGripTexturizerUiDefaults(target)
    expect(target.mappingMode).toBe(5)
    expect(target.amplitude).toBe(0.5)
    expect(target.exclusionMode).toBe('exclude')
  })
})
