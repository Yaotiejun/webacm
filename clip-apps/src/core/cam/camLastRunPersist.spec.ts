import { beforeEach, describe, expect, it } from 'vitest'
import { clearCamLastRunPreview, loadCamLastRunPreview, saveCamLastRunPreview } from './camLastRunPersist'
import type { CamJobInputGeometry, CamJobResult } from '@/types/camJob'

describe('camLastRunPersist', () => {
  beforeEach(() => {
    clearCamLastRunPreview()
  })

  it('round-trips gcode and geometry via localStorage', () => {
    const geometry: CamJobInputGeometry = {
      id: 'p1',
      bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
      complexityHint: 1,
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    }
    const result = {
      backend: 'kiri-cam',
      gcodeText: 'G90\nG1 X1 Y2 Z3\n',
    } as CamJobResult
    saveCamLastRunPreview(result, geometry)
    const loaded = loadCamLastRunPreview()
    expect(loaded?.result.gcodeText).toContain('G1 X1')
    expect(loaded?.result.backend).toBe('kiri-cam')
    expect(loaded?.geometry.vertices?.length).toBe(9)
  })
})
