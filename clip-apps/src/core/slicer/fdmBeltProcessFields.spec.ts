import { describe, expect, it } from 'vitest'
import {
  ensureFdmBeltProcessFields,
  FDM_BELT_PROCESS_DEFAULTS,
  listFdmBeltProcessKeys,
} from './fdmBeltProcessFields'
import { toKiriLegacyProcess } from './kiriSettingsAdapter'
import type { FdmProcess } from '@/types/process'

function minimalProcess(partial: Partial<FdmProcess> = {}): FdmProcess {
  return {
    processName: 'belt-test',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 210,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
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
    ...partial,
  }
}

describe('fdmBeltProcessFields', () => {
  it('fills missing belt defaults without clobbering set values', () => {
    const p = ensureFdmBeltProcessFields(
      minimalProcess({ sliceAngle: 35, firstLayerBeltBump: 2 }),
    )
    expect(p.sliceAngle).toBe(35)
    expect(p.firstLayerBeltBump).toBe(2)
    expect(p.firstLayerBeltFact).toBe(FDM_BELT_PROCESS_DEFAULTS.firstLayerBeltFact)
    expect(listFdmBeltProcessKeys()).toContain('firstLayerBeltBump')
  })

  it('toKiriLegacyProcess preserves belt knobs for legacy slice/prepare', () => {
    const legacy = toKiriLegacyProcess(
      ensureFdmBeltProcessFields(
        minimalProcess({
          sliceAngle: 45,
          beltAnchor: 3,
          firstLayerBeltLead: 3,
          firstLayerBeltBump: 1.5,
          firstLayerBeltFact: 1.2,
        }),
      ),
    )
    expect(legacy.sliceAngle).toBe(45)
    expect(legacy.beltAnchor).toBe(3)
    expect(legacy.firstLayerBeltLead).toBe(3)
    expect(legacy.firstLayerBeltBump).toBe(1.5)
    expect(legacy.firstLayerBeltFact).toBe(1.2)
  })
})
