import { describe, expect, it } from 'vitest'
import { exportLaserPolylinesToSvg } from '@/core/laser/laserSvgExport'
import { laserSampleSquare } from '@/core/laser/laserSvgParse'
import { nestLaserPolylines, nestLaserPolylinesStats } from '@/core/laser/laserNest'
import { runLaserFromSvg } from '@/core/laser/laserEngine'
import { getSlaWorkerStatus } from '@/core/sla/slaWorkerBridge'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

describe('laserSvgExport', () => {
  it('exports flat polyline SVG with viewBox', () => {
    const svg = exportLaserPolylinesToSvg(laserSampleSquare(40, 10))
    expect(svg).toContain('<svg')
    expect(svg).toContain('polyline')
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('40')
  })

  it('engine result includes svgText and fileExt', () => {
    const r = runLaserFromSvg('<svg><rect x="0" y="0" width="10" height="10"/></svg>', {
      deviceId: 'xTool.D1',
    })
    expect(r.svgText).toContain('<polyline')
    expect(r.fileExt).toBe('svg')
    expect(r.gcodeText.length).toBeGreaterThan(10)
  })
})

describe('laserNest shelf', () => {
  it('sorts taller first and reports stats', () => {
    const short = laserSampleSquare(10, 0)[0]!
    const tall = {
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 30 },
        { x: 0, y: 30 },
      ],
    }
    const nested = nestLaserPolylines([short, tall], 2, 100)
    expect(nested[0]!.points.some((p) => p.y >= 20)).toBe(true)
    const stats = nestLaserPolylinesStats([short, tall], 2, 20)
    expect(stats.placed).toBe(2)
    expect(stats.width).toBeGreaterThan(0)
  })
})

describe('sla worker vendor files', () => {
  it('has raster and format path for scaffold', () => {
    const root = process.cwd()
    expect(existsSync(resolve(root, 'src/core/sla/legacy/work/raster.js'))).toBe(true)
    expect(existsSync(resolve(root, 'src/core/sla/legacy/core/formats.js'))).toBe(true)
    const st = getSlaWorkerStatus()
    expect(['ts-mvp', 'worker-runtime', 'legacy-pending']).toContain(st.mode)
    expect(st.missingDeps.some((d) => d.includes('raster.js'))).toBe(false)
  })
})
