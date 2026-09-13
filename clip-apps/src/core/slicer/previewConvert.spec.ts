import { describe, expect, it } from 'vitest'
import { convertWidgetSlicesToLayers, lineToPath, mergeWidgetSlicesToLayers, polyToPath } from './previewConvert'

describe('slicer.previewConvert', () => {
  it('accepts polygon points as [x, y] tuples', () => {
    const out = polyToPath({ points: [[0, 0], [2, 0], [2, 2]] }, 'perimeter')
    expect(out?.points[0]).toEqual([0, 0])
    expect(out?.points[out.points.length - 1]).toEqual([0, 0])
  })

  it('reads line endpoints with X/Y when x/y are absent', () => {
    const out = lineToPath({ p1: { X: 1, Y: 2 }, p2: { X: 3, Y: 4 } }, 'infill')
    expect(out?.points).toEqual([[1, 2], [3, 4]])
  })

  it('closes polygon path when needed', () => {
    const out = polyToPath({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }] }, 'perimeter')
    expect(out?.points[0]).toEqual([0, 0])
    expect(out?.points[out.points.length - 1]).toEqual([0, 0])
  })

  it('converts line variants to infill path', () => {
    const a = lineToPath({ p1: { x: 1, y: 2 }, p2: { x: 3, y: 4 } }, 'infill')
    const b = lineToPath([{ x: 5, y: 6 }, { x: 7, y: 8 }], 'infill')
    expect(a?.points).toEqual([[1, 2], [3, 4]])
    expect(b?.points).toEqual([[5, 6], [7, 8]])
  })

  it('converts widget slices to preview layers', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }], fill_lines: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]] }],
        supports: [{ points: [{ x: 0, y: 0 }, { x: 0, y: 1 }] }],
      },
    ])
    expect(layers.length).toBe(1)
    expect(layers[0]?.paths.some((p) => p.type === 'perimeter')).toBe(true)
    expect(layers[0]?.paths.some((p) => p.type === 'infill')).toBe(true)
    expect(layers[0]?.paths.some((p) => p.type === 'support')).toBe(true)
  })

  it('maps top.poly to perimeter when shells are absent', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.15,
        tops: [
          {
            poly: { points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] },
            shells: [],
            fill_lines: [],
            fill_sparse: [],
          },
        ],
      },
    ])
    expect(layers[0]?.paths.filter((p) => p.type === 'perimeter').length).toBeGreaterThan(0)
  })

  it('maps thin_wall multi-point traces to a closed perimeter (Kiri non-thin style)', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [
          {
            shells: [],
            thin_wall: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
              ],
            ],
          },
        ],
      },
    ])
    const per = layers[0]?.paths.filter((p) => p.type === 'perimeter') ?? []
    expect(per.length).toBe(1)
    expect(per[0]?.points[0]).toEqual([0, 0])
    expect(per[0]?.points[per[0]!.points.length - 1]).toEqual([0, 0])
  })

  it('omits devel/xray extras by default (Kiri layerRender parity)', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [
          {
            shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
            fill_off: [{ points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }] }],
            gaps: [{ points: [{ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.2 }, { x: 0.4, y: 0.4 }] }],
            last: [{ points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] }],
          },
        ],
        groups: [{ points: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }] }],
        solids: [{ points: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 5 }] }],
        lines: [{ p1: { x: 0, y: 0 }, p2: { x: 2, y: 0 } }],
      },
    ])
    expect(layers[0]?.paths.length).toBe(1)
    expect(layers[0]?.paths.every((p) => p.type === 'perimeter')).toBe(true)
  })

  it('maps slice-level groups/solids/bridges/flats when devel+xray enabled', () => {
    const layers = convertWidgetSlicesToLayers(
      [
        {
          z: 0.2,
          tops: [
            {
              shells: [],
              poly: { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] },
              solids: [{ points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }] }],
              bridges: [{ points: [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.2 }, { x: 0.6, y: 0.6 }] }],
            },
          ],
          groups: [{ points: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }] }],
          solids: [{ points: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 5 }] }],
          bridges: [{ points: [{ x: 6, y: 6 }, { x: 7, y: 6 }, { x: 7, y: 7 }] }],
          flats: [{ points: [{ x: 8, y: 8 }, { x: 9, y: 8 }, { x: 9, y: 9 }] }],
        },
      ],
      { devel: true, xray: true },
    )
    const layer = layers[0]
    expect(layer?.paths.filter((p) => p.type === 'perimeter').length).toBeGreaterThanOrEqual(2)
    expect(layer?.paths.filter((p) => p.type === 'infill').length).toBeGreaterThanOrEqual(5)
  })

  it('maps support outline plus support poly.fill line pairs', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [
          {
            shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
          },
        ],
        supports: [
          {
            points: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
            fill: [{ x: 2.1, y: 2.1 }, { x: 2.9, y: 2.1 }, { x: 2.1, y: 2.2 }, { x: 2.9, y: 2.2 }],
          },
        ],
      },
    ])
    const supPaths = layers[0]?.paths.filter((p) => p.type === 'support') ?? []
    expect(supPaths.length).toBe(3)
    expect(supPaths[0]?.points.length).toBeGreaterThanOrEqual(3)
    expect(supPaths[1]?.points).toEqual([[2.1, 2.1], [2.9, 2.1]])
    expect(supPaths[2]?.points).toEqual([[2.1, 2.2], [2.9, 2.2]])
  })

  it('maps top.thin_fill with the same line-record / flat-pair rules as fill_lines', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [
          {
            shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
            thin_fill: [{ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.95 }],
          },
        ],
      },
    ])
    const inf = layers[0]?.paths.filter((p) => p.type === 'infill') ?? []
    expect(inf.length).toBe(1)
    expect(inf[0]?.points).toEqual([[0.05, 0.05], [0.95, 0.95]])
  })

  it('maps top.fill_lines as flat Point pairs (POLY.fillArea / forEachSegment shape)', () => {
    const layers = convertWidgetSlicesToLayers([
      {
        z: 0.2,
        tops: [
          {
            shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
            fill_lines: [
              { x: 0.1, y: 0.1 },
              { x: 0.9, y: 0.9 },
              { x: 0.2, y: 0.8 },
              { x: 0.8, y: 0.2 },
            ],
          },
        ],
      },
    ])
    const inf = layers[0]?.paths.filter((p) => p.type === 'infill') ?? []
    expect(inf.length).toBe(2)
    expect(inf[0]?.points).toEqual([[0.1, 0.1], [0.9, 0.9]])
    expect(inf[1]?.points).toEqual([[0.2, 0.8], [0.8, 0.2]])
  })

  it('maps slice.lines to travel (p1/p2 and start/end) in xray mode', () => {
    const layers = convertWidgetSlicesToLayers(
      [
        {
          z: 0.2,
          tops: [
            {
              shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
            },
          ],
          lines: [
            { p1: { x: 0, y: 0 }, p2: { x: 2, y: 0 } },
            { start: { x: 1, y: 1 }, end: { x: 3, y: 3 } },
          ],
        },
      ],
      { xray: true },
    )
    const travel = layers[0]?.paths.filter((p) => p.type === 'travel') ?? []
    expect(travel.length).toBe(2)
    expect(travel[0]?.points).toEqual([[0, 0], [2, 0]])
    expect(travel[1]?.points).toEqual([[1, 1], [3, 3]])
  })

  it('maps slice.lines as flat Point pairs to travel in xray mode', () => {
    const layers = convertWidgetSlicesToLayers(
      [
        {
          z: 0.2,
          tops: [
            {
              shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
            },
          ],
          lines: [
            { x: 0, y: 0 },
            { x: 4, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 3 },
          ],
        },
      ],
      { xray: true },
    )
    const travel = layers[0]?.paths.filter((p) => p.type === 'travel') ?? []
    expect(travel.length).toBe(2)
    expect(travel[0]?.points).toEqual([[0, 0], [4, 1]])
    expect(travel[1]?.points).toEqual([[1, 1], [2, 3]])
  })

  it('maps fill_off and gaps polygons to infill only in devel mode', () => {
    const slice = {
      z: 0.2,
      tops: [
        {
          shells: [],
          fill_off: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }],
          gaps: [{ points: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }] }],
        },
      ],
    }
    expect(convertWidgetSlicesToLayers([slice])).toEqual([])
    const layers = convertWidgetSlicesToLayers([slice], { devel: true })
    const inf = layers[0]?.paths.filter((p) => p.type === 'infill') ?? []
    expect(inf.length).toBe(2)
  })

  it('merges multi-widget slices by Z', () => {
    const layers = mergeWidgetSlicesToLayers([
      {
        slices: [
          {
            z: 0.2,
            tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }] }],
          },
        ],
      },
      {
        slices: [
          {
            z: 0.2,
            tops: [{ shells: [{ points: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }] }] }],
          },
          {
            z: 0.4,
            tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }] }],
          },
        ],
      },
    ])
    expect(layers.map((l) => l.z)).toEqual([0.2, 0.4])
    expect(layers[0]?.paths.filter((p) => p.type === 'perimeter').length).toBe(2)
  })
})
