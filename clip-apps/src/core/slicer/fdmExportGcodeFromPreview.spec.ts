import { describe, expect, it } from 'vitest'
import {
  buildFdmGcodeFromPreview,
  extrudePerMm,
} from './fdmExportGcodeFromPreview'
import type { FdmProcess } from '@/types/process'

function sampleProcess(partial: Partial<FdmProcess> = {}): FdmProcess {
  return {
    processName: 'default',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 215,
    firstLayerBedTemp: 60,
    outputFeedrate: 60,
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
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0,
    sliceSupportSize: 0,
    sliceSupportAngle: 45,
    outputRetractDist: 1,
    outputRetractSpeed: 40,
    outputFanSpeed: 100,
    outputFanLayer: 2,
    outputMinLayerTime: 10,
    zHopDistance: 0,
    ...partial,
  }
}

describe('fdmExportGcodeFromPreview', () => {
  it('extrudePerMm matches grip formula', () => {
    const e = extrudePerMm(0.4, 1.75, 0.2)
    expect(e).toBeCloseTo((0.4 * 0.2) / (1.75 * 1.75), 6)
  })

  it('emits placeholder when no layers', () => {
    const out = buildFdmGcodeFromPreview({ bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] }, {
      process: sampleProcess(),
    })
    expect(out.source).toBe('placeholder-empty')
    expect(out.gcodeText).toContain('placeholderPath=1')
  })

  it('emits G1 with E from perimeter paths', () => {
    const out = buildFdmGcodeFromPreview(
      {
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        layers: [
          {
            z: 0.2,
            paths: [
              {
                type: 'perimeter',
                points: [
                  [0, 0],
                  [10, 0],
                  [10, 10],
                ],
              },
            ],
          },
        ],
      },
      { process: sampleProcess(), deviceName: 'Any.Generic.Marlin', jobName: 'cube' },
    )
    expect(out.source).toBe('legacy-preview-path')
    expect(out.segmentCount).toBeGreaterThan(0)
    expect(out.extrudedMm).toBeGreaterThan(0)
    expect(out.gcodeText).toContain('gcodeSource=legacy-preview-path')
    expect(out.gcodeText).toMatch(/G1 X10\.0000 Y0\.0000 E/)
    expect(out.gcodeText).toContain('M109 S215')
    expect(out.gcodeText).not.toContain('placeholderPath=1')
  })
})
