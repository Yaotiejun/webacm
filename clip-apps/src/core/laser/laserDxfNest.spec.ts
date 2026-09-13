import { describe, expect, it } from 'vitest'
import { parseDxfToLaserPolylines } from '@/core/laser/laserDxfParse'
import { nestLaserPolylines } from '@/core/laser/laserNest'
import { runLaserFromDxf } from '@/core/laser/laserEngine'

const SQUARE_LINES = `0
SECTION
2
ENTITIES
0
LINE
10
0
20
0
11
10
21
0
0
LINE
10
10
20
0
11
10
21
10
0
LINE
10
10
20
10
11
0
21
10
0
LINE
10
0
20
10
11
0
21
0
0
ENDSEC
0
EOF
`

describe('laserDxfParse', () => {
  it('joins LINE square into one closed loop', () => {
    const polys = parseDxfToLaserPolylines(SQUARE_LINES)
    expect(polys).toHaveLength(1)
    expect(polys[0]!.closed).toBe(true)
    expect(polys[0]!.points.length).toBeGreaterThanOrEqual(4)
    expect(polys[0]!.points[0]).toEqual({ x: 0, y: 0 })
  })

  it('parses CIRCLE into closed polyline', () => {
    const dxf = `0
SECTION
2
ENTITIES
0
CIRCLE
10
5
20
5
40
3
0
ENDSEC
0
EOF
`
    const polys = parseDxfToLaserPolylines(dxf)
    expect(polys).toHaveLength(1)
    expect(polys[0]!.closed).toBe(true)
    expect(polys[0]!.points.length).toBeGreaterThanOrEqual(24)
  })

  it('parses ARC into open polyline', () => {
    const dxf = `0
SECTION
2
ENTITIES
0
ARC
10
0
20
0
40
10
50
0
51
90
0
ENDSEC
0
EOF
`
    const polys = parseDxfToLaserPolylines(dxf)
    expect(polys).toHaveLength(1)
    expect(polys[0]!.closed).toBe(false)
    expect(polys[0]!.points.length).toBeGreaterThanOrEqual(4)
  })

  it('parses closed LWPOLYLINE', () => {
    const dxf = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
70
1
90
4
10
1
20
1
10
5
20
1
10
5
20
4
10
1
20
4
0
ENDSEC
0
EOF
`
    const polys = parseDxfToLaserPolylines(dxf)
    expect(polys).toHaveLength(1)
    expect(polys[0]!.closed).toBe(true)
    expect(polys[0]!.points).toHaveLength(4)
  })
})

describe('laserNest', () => {
  it('translates second poly when gap > 0', () => {
    const a = {
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }
    const b = {
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
        { x: 0, y: 5 },
      ],
    }
    const nested = nestLaserPolylines([a, b], 2)
    expect(nested[0]!.points[0]).toEqual({ x: 0, y: 0 })
    expect(nested[1]!.points[0]!.x).toBe(12)
    expect(nested[1]!.points[0]!.y).toBe(0)
  })
})

describe('runLaserFromDxf', () => {
  it('emits gcode and nests when nestGap > 0', () => {
    const result = runLaserFromDxf(SQUARE_LINES, {
      deviceId: 'Any.Generic.Laser',
      process: { nestGap: 2, power: 1, passes: 1 },
    })
    expect(result.polylines.length).toBe(1)
    expect(result.polylines[0]!.closed).toBe(true)
    expect(result.gcodeText).toContain('M106')
    expect(result.backend).toBe('kiri-ts')
  })
})
