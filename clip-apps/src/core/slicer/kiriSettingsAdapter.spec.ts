import { describe, expect, it } from 'vitest'
import type { FdmProcess } from '@/types/process'
import { buildKiriSettingsPayload, toKiriLegacyProcess } from './kiriSettingsAdapter'

function makeProcess(): FdmProcess {
  return {
    processName: 'p',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 215,
    firstLayerBedTemp: 65,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 3,
    sliceBottomLayers: 3,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: true,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
    sliceSupportAngle: 55,
    outputRetractDist: 0.8,
    outputRetractSpeed: 30,
    outputFanSpeed: 100,
    outputFanLayer: 2,
    outputMinLayerTime: 5,
    zHopDistance: 0.2,
    enableBrim: true,
    brimCount: 2,
    brimOffset: 0.2,
    enableRaft: true,
    raftSpacing: 0.15,
    ranges: [{ fromLayer: 1, toLayer: 10, outputTemp: 205 }],
  }
}

describe('slicer.kiriSettingsAdapter', () => {
  it('maps fdm process to legacy fields', () => {
    const legacy = toKiriLegacyProcess(makeProcess())
    expect(legacy.sliceSupportGap).toBeUndefined()
    expect(legacy.firstLayerBrim).toBe(2)
    expect(Array.isArray(legacy.ranges)).toBe(true)
  })

  it('builds kiri settings payload', () => {
    const payload = buildKiriSettingsPayload({
      process: makeProcess(),
      modelCount: 3,
      deviceProfile: { d: 1 },
      controllerProfile: { c: 1 },
    })
    expect(payload.mode).toBe('FDM')
    expect((payload.jobMeta as { modelCount: number }).modelCount).toBe(3)
    const device = payload.device as { extruders: unknown[]; d?: number }
    expect(Array.isArray(device.extruders)).toBe(true)
    expect(device.extruders.length).toBeGreaterThan(0)
    expect(device.d).toBe(1)
    const controller = payload.controller as { c?: number; assembly: boolean }
    expect(controller.c).toBe(1)
    expect(controller.assembly).toBe(false)
  })
})
