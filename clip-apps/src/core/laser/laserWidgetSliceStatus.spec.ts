import { describe, expect, it } from 'vitest'
import { getLaserWidgetSliceStatus } from './laserWidgetSliceStatus'

describe('laserWidgetSliceStatus', () => {
  it('declares widget path out of product scope', () => {
    const st = getLaserWidgetSliceStatus()
    expect(st.productPath).toBe('svg-dxf-kiri-ts')
    expect(st.widgetSliceInScope).toBe(false)
    expect(st.legacyDriverPresent).toBe(true)
    expect(st.missingForWidgetRuntime.length).toBeGreaterThan(0)
  })
})
