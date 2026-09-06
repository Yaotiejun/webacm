import { describe, expect, it } from 'vitest'
import type { FdmProcess } from '@/types/process'
import {
  buildLegacyFdmControllerProfile,
  buildLegacyFdmDeviceProfile,
  buildLegacyWidgetBoundingBox,
} from './kiriLegacyFdmDefaults'

function minimalProcess(): FdmProcess {
  return {
    processName: 't',
    outputTemp: 200,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 200,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 1,
    sliceBottomLayers: 1,
    sliceShells: 1,
    sliceLineWidth: 0.35,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.1,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
    sliceSupportAngle: 55,
    outputRetractDist: 0.5,
    outputRetractSpeed: 30,
    outputFanSpeed: 0,
    outputFanLayer: 0,
    outputMinLayerTime: 0,
    zHopDistance: 0,
    enableBrim: false,
    brimCount: 0,
    brimOffset: 0,
    enableRaft: false,
    raftSpacing: 0,
    ranges: [],
  }
}

describe('slicer.kiriLegacyFdmDefaults', () => {
  it('builds device with extruders for fdm_slice', () => {
    const device = buildLegacyFdmDeviceProfile(minimalProcess())
    expect(device.extruders).toHaveLength(1)
    expect((device.extruders as { extNozzle: number }[])[0].extNozzle).toBe(0.35)
  })

  it('keeps override extruders when provided', () => {
    const device = buildLegacyFdmDeviceProfile(minimalProcess(), {
      extruders: [{ extNozzle: 0.6, extFilament: 2.85 }],
    })
    expect((device.extruders as { extNozzle: number }[])[0].extNozzle).toBe(0.6)
  })

  it('builds controller flags used by legacy slice', () => {
    const c = buildLegacyFdmControllerProfile()
    expect(c.assembly).toBe(false)
    expect(c.healMesh).toBe(true)
    expect(c.lineType).toBe('path')
  })

  it('builds widget bbox with min/max z', () => {
    const b = buildLegacyWidgetBoundingBox({
      minX: 1,
      minY: 2,
      minZ: 3,
      maxX: 4,
      maxY: 5,
      maxZ: 6,
    })
    expect(b.min.z).toBe(3)
    expect(b.max.z).toBe(6)
    expect(b.clone().min.z).toBe(3)
  })
})
