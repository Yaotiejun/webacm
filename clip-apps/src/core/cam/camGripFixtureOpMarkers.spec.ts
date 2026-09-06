import { describe, expect, it } from 'vitest'
import gripFixture from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import {
  GRIP_CAM_FIXTURE_OP_MARKERS,
  extractCamOpMarkersFromGcode,
} from './camGripFixtureOpMarkers'

describe('camGripFixtureOpMarkers', () => {
  it('reads op markers from bundled legacy capture', () => {
    expect(extractCamOpMarkersFromGcode(gripFixture)).toEqual([...GRIP_CAM_FIXTURE_OP_MARKERS])
  })
})
