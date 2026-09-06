/**
 * @vitest-environment jsdom
 * Legacy CAM bundle probe (not in `test:migration`). Run with `soak:cam:live` or:
 *   npx vitest run src/core/cam/camLegacyBundleProbe.live.spec.ts
 */
import { describe, expect, it } from 'vitest'
import { probeCamLegacyBundle } from './camLegacyBundleProbe'

describe('camLegacyBundleProbe', () => {
  it('reports legacy bundle availability after init', async () => {
    const r = await probeCamLegacyBundle()
    expect(r.health.hasSlice).toBe(r.available)
    expect(r.health.hasExport).toBe(r.available)
    if (!r.available) {
      expect(r.detail.length).toBeGreaterThan(0)
    }
  })
})
