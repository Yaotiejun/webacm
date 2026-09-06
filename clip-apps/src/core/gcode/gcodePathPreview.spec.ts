import { describe, expect, it } from 'vitest'
import { buildGcodePathHint } from './gcodePathHint'
import { buildGcodePathPositions } from './gcodePathPreview'

describe('gcodePathPreview', () => {
  it('builds LINE_STRIP from G1 segments in G90', () => {
    const g = `
G90
G1 X1 Y0 Z0
G1 X10 Y0 Z0
G1 X10 Y10 Z-1
`
    const r = buildGcodePathPositions(g)
    expect(r.vertexCount).toBe(4)
    expect(Array.from(r.positions.slice(0, 6))).toEqual([0, 0, 0, 1, 0, 0])
  })

  it('tessellates G2 in XY (G17 default)', () => {
    const g = `
G90
G1 X0 Y0 Z0
G2 X1 Y1 I0.5 J0.5
`
    const r = buildGcodePathPositions(g)
    expect(r.tessellatedArcs).toBe(1)
    expect(r.vertexCount).toBeGreaterThan(3)
  })

  it('tessellates G2 in XZ when G18 active', () => {
    const g = `
G90
G18
G1 X0 Y0 Z0
G2 X1 Y0 Z1 I0.5 K0
`
    const r = buildGcodePathPositions(g)
    expect(r.tessellatedArcs).toBe(1)
    expect(r.skippedArcs).toBe(0)
    expect(r.vertexCount).toBeGreaterThan(3)
    const vi = Math.floor(r.vertexCount / 2) * 3
    expect(r.positions[vi]).toBeGreaterThan(0)
    expect(r.positions[vi + 2]).toBeGreaterThan(0)
  })

  it('buildGcodePathHint reports arc stats', () => {
    const r = buildGcodePathPositions('G90\nG1X0Y0\nG2X1Y1I0.5J0.5')
    expect(buildGcodePathHint(r)).toContain('圆弧 1')
    expect(buildGcodePathHint(r)).toContain('刀路预览')
  })

  it('splits G0 rapid and G1 cut into colored segments', () => {
    const g = `
G90
G0 X10 Y0 Z0
G1 X10 Y10 Z0
G0 X0 Y0 Z0
`
    const r = buildGcodePathPositions(g)
    expect(r.segments.length).toBe(3)
    expect(r.segments[0]?.kind).toBe('rapid')
    expect(r.segments[1]?.kind).toBe('cut')
    expect(r.segments[2]?.kind).toBe('rapid')
    expect(r.rapidVertexCount).toBeGreaterThan(0)
    expect(r.cutVertexCount).toBeGreaterThan(0)
    expect(buildGcodePathHint(r)).toContain('G0')
    expect(buildGcodePathHint(r)).toContain('G1/G2/G3')
  })

  it('classifies G2 arcs as cut segments', () => {
    const r = buildGcodePathPositions('G90\nG1 X0 Y0\nG2 X1 Y1 I0.5 J0.5')
    expect(r.segments.every((s) => s.kind === 'cut')).toBe(true)
    expect(r.cutVertexCount).toBe(r.vertexCount)
  })

  it('reports endPosition at last motion target', () => {
    const r = buildGcodePathPositions('G90\nG0 X5 Y0\nG1 X5 Y8 Z-2\n')
    expect(r.endPosition).toEqual({ x: 5, y: 8, z: -2 })
  })
})
