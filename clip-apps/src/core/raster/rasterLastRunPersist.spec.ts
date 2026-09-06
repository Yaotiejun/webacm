import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRasterLastRunMeta,
  loadRasterLastRunMeta,
  saveRasterLastRunMeta,
} from './rasterLastRunPersist'

describe('rasterLastRunPersist', () => {
  beforeEach(() => {
    clearRasterLastRunMeta()
  })

  it('round-trips config and summary', () => {
    saveRasterLastRunMeta(
      {
        mode: 'planar',
        resolution: 0.05,
        rotationStep: 1,
        xStep: 1,
        yStep: 1,
        zFloor: -100,
        tracingStep: 1,
      },
      { pathCount: 2, pointCount: 100, gripBridge: true },
      75_586,
      960,
    )
    const loaded = loadRasterLastRunMeta()
    expect(loaded?.terrainVertexCount).toBe(75_586)
    expect(loaded?.summary.gripBridge).toBe(true)
  })
})
