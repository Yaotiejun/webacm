import { describe, expect, it } from 'vitest'
import { runLegacyFdmSliceBridge, runLegacyFdmSliceBridgeMulti } from './kiriLegacyBridge'

describe('kiriLegacyBridge extruder + fill types passthrough', () => {
  it('sets widget.anno.extruder from bridge input', async () => {
    const scope: any = { kiri_worker: { old: true } }
    let seen = -1
    await runLegacyFdmSliceBridge({
      settings: {
        process: {
          processName: 't',
          sliceFillType: 'gyroid',
          sliceSupportNozzle: 1,
          sliceLineWidth: 0.4,
        },
      },
      vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
      points: [{ x: 0, y: 0, z: 0 }],
      extruder: 2,
      fdmSliceImpl: (_settings, widget, _onupdate, ondone) => {
        seen = widget.anno.extruder
        widget.slices = []
        ondone(null)
      },
      workerScope: scope,
    })
    expect(seen).toBe(2)
  })
})

describe('kiriLegacyBridge multi-widget', () => {
  it('shares group and preserves per-widget extruders', async () => {
    const seen: number[] = []
    const out = await runLegacyFdmSliceBridgeMulti({
      settings: {},
      widgets: [
        {
          id: 'w0',
          vb: { minX: 0, minY: 0, minZ: 0, maxX: 5, maxY: 5, maxZ: 2 },
          points: [{ x: 0, y: 0, z: 0 }],
          extruder: 0,
        },
        {
          id: 'w1',
          vb: { minX: 6, minY: 0, minZ: 0, maxX: 11, maxY: 5, maxZ: 2 },
          points: [{ x: 6, y: 0, z: 0 }],
          extruder: 1,
        },
      ],
      fdmSliceImpl: (_settings, widget, _onupdate, ondone) => {
        seen.push(widget.anno.extruder)
        widget.slices = [
          {
            z: 0.2,
            tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }] }],
          },
        ]
        ondone(null)
      },
      workerScope: {},
    })
    expect(seen).toEqual([0, 1])
    expect(out.widgets).toHaveLength(2)
    expect(out.widgets[0].group).toBe(out.widgets[1].group)
    expect(out.widgets[0].group).toHaveLength(2)
    expect(out.layers.length).toBeGreaterThan(0)
  })
})
