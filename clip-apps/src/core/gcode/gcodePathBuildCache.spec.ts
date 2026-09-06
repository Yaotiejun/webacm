import { beforeEach, describe, expect, it } from 'vitest'
import { getCachedGcodePathBuild, resetGcodePathBuildCacheForTests } from './gcodePathBuildCache'

describe('gcodePathBuildCache', () => {
  beforeEach(() => {
    resetGcodePathBuildCacheForTests()
  })

  it('returns same object reference for identical gcode', () => {
    const g = 'G90\nG1 X1 Y2 Z3\n'
    const a = getCachedGcodePathBuild(g)
    const b = getCachedGcodePathBuild(g)
    expect(a).toBe(b)
    expect(a.endPosition).toEqual({ x: 1, y: 2, z: 3 })
  })
})
