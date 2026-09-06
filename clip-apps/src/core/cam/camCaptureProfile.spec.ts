import { describe, expect, it } from 'vitest'
import {
  CAM_CAPTURE_BBOX,
  buildCamCaptureGeometry,
  buildCamCaptureProfile,
} from './camCaptureProfile'

describe('camCaptureProfile', () => {
  it('uses pinned stock bbox for fixture capture', () => {
    const g = buildCamCaptureGeometry()
    expect(g.bbox).toEqual(CAM_CAPTURE_BBOX)
    expect(buildCamCaptureProfile().process.ops?.length).toBeGreaterThan(0)
  })
})
