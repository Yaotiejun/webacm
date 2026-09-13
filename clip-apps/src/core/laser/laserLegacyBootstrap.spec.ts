import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { exportLaserPolylinesToSvg } from '@/core/laser/laserSvgExport'
import { getLaserWorkerStatus, isLaserLegacyWorkerAvailable } from '@/core/laser/laserWorkerBridge'
import {
  LASER_SVG_EXPORT_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_SVG,
} from '@/core/laser/laserGoldenProfile'
import { parseSvgToLaserPolylines } from '@/core/laser/laserSvgParse'

describe('laserLegacyBootstrap imports', () => {
  it('loads LASER driver from shimmed init-work', async () => {
    const mod = await import('@/core/laser/laserLegacyBootstrap')
    expect(mod.TYPE.LASER).toBe(0)
    expect(typeof mod.LASER.slice).toBe('function')
    expect(typeof mod.LASER.exportSVG).toBe('function')
  })

  it('reports shim tree present', () => {
    expect(isLaserLegacyWorkerAvailable()).toBe(true)
    const st = getLaserWorkerStatus()
    expect(st.legacyPath).toContain('init-work')
    expect(st.importShimPresent).toBe(true)
    expect(st.mode).toBe('worker-runtime')
    expect(st.workerFilePresent).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'src/core/laser/legacy/geo/base.js'))).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'src/core/laser/legacy/kiri/app/pack.js'))).toBe(true)
  })
})

describe('LASER-SVG-EXPORT golden', () => {
  it('pins structural SVG export digest', () => {
    const polys = parseSvgToLaserPolylines(LASER_SVG_GOLDEN_SVG)
    const svg = exportLaserPolylinesToSvg(polys)
    const digest = svg.replace(/\r\n/g, '\n').trim()
    const sha = createHash('sha256').update(digest, 'utf8').digest('hex')
    expect(sha).toBe(LASER_SVG_EXPORT_GOLDEN_SHA256)
  })
})
