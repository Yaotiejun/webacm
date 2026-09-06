import { describe, expect, it } from 'vitest'
import { buildTexturizerPipelineInput } from './texturizerJobInput'

describe('buildTexturizerPipelineInput', () => {
  it('maps request/config into pipeline input', () => {
    const onProgress = () => {}
    const out = buildTexturizerPipelineInput({
      req: {
        vertices: new Float32Array([0, 0, 0]),
        amplitude: 2,
        frequency: 3,
        mappingMode: 0,
        exclusionMode: 'include',
        excludedFaces: [1],
      },
      defaultCubicMode: 6,
      computeUvLegacy: () => ({ u: 0, v: 0 }),
      onProgress,
    })
    expect(out.vertices.length).toBe(3)
    expect(out.amplitude).toBe(2)
    expect(out.uvFrequency).toBe(3)
    expect(out.exclusionMode).toBe('include')
    expect(out.excludedFaces).toEqual([1])
    expect(out.cubicMappingMode).toBe(6)
    expect(out.onProgress).toBe(onProgress)
  })
})
