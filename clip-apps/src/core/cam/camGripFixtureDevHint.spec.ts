import { describe, expect, it } from 'vitest'
import { buildCamGripFixtureDevHint } from './camGripFixtureDevHint'
import { GRIP_CAM_FIXTURE_MIGRATION_SHA256 } from './camGripFixtureMeta'

describe('buildCamGripFixtureDevHint', () => {
  it('includes pinned SHA', () => {
    expect(buildCamGripFixtureDevHint()).toContain(GRIP_CAM_FIXTURE_MIGRATION_SHA256)
  })

  it('documents live capture command', () => {
    expect(buildCamGripFixtureDevHint()).toContain('capture:cam-fixture')
  })
})
