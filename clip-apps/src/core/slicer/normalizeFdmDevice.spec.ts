import { describe, expect, it } from 'vitest'
import { normalizeFdmDeviceJson, fdmDeviceToLegacyProfile } from './normalizeFdmDevice'

describe('normalizeFdmDeviceJson', () => {
  it('maps legacy pre/post/settings.origin_center', () => {
    const d = normalizeFdmDeviceJson(
      {
        pre: ['G28'],
        post: ['M84'],
        settings: { origin_center: true, bed_width: 200, bed_depth: 200, build_height: 200 },
        extruders: [{ nozzle: 0.4, filament: 1.75 }],
      },
      'Any.Generic.Marlin',
    )
    expect(d.originCenter).toBe(true)
    expect(d.bedWidth).toBe(200)
    expect(d.gcodePre).toEqual(['G28'])
    expect(d.extruders[0]!.extNozzle).toBe(0.4)
    const legacy = fdmDeviceToLegacyProfile(d)
    expect(legacy.originCenter).toBe(true)
    expect(legacy.bedWidth).toBe(200)
  })

  it('keeps modern field names', () => {
    const d = normalizeFdmDeviceJson(
      {
        deviceName: 'Creality Ender 3',
        bedWidth: 220,
        bedDepth: 220,
        maxHeight: 300,
        originCenter: false,
        gcodePre: ['G28 W'],
        extruders: [{ extNozzle: 0.4, extFilament: 1.75, extOffsetX: 0, extOffsetY: 0 }],
      },
      'Creality.Ender.3',
    )
    expect(d.bedWidth).toBe(220)
    expect(d.originCenter).toBe(false)
    expect(d.deviceName).toBe('Creality Ender 3')
  })
})
