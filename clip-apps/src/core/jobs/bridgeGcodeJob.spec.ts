import { describe, expect, it } from 'vitest'
import {
  createCarveraJobFromBridgeGcode,
  createGridBotJobFromBridgeGcode,
  formatBridgeGcodeContent,
} from './bridgeGcodeJob'

describe('bridgeGcodeJob', () => {
  it('formats bridge header and trace lines', () => {
    const { name, content } = formatBridgeGcodeContent({
      mode: 'RASTER',
      gcodeText: 'G1 X1\n',
      namePrefix: 'raster',
      device: 'dev1',
      traceCommentLines: ['; trace=test'],
    })
    expect(name).toMatch(/^raster-/)
    expect(content).toContain('; mode=RASTER')
    expect(content).toContain('; from workspace (bridge)')
    expect(content).toContain('; trace=test')
    expect(content).toContain('G1 X1')
  })

  it('creates carvera job record', () => {
    const job = createCarveraJobFromBridgeGcode({
      mode: 'CAM',
      gcodeText: 'G90\n',
      namePrefix: 'cam',
    })
    expect(job.content).toContain('; mode=CAM')
    expect(job.size).toBeGreaterThan(0)
  })

  it('creates gridbot job with trace lines', () => {
    const job = createGridBotJobFromBridgeGcode({
      mode: 'CAM',
      gcodeText: 'G1 X1\n',
      namePrefix: 'cam',
      traceCommentLines: ['; trace=abc'],
    })
    expect(job.content).toContain('; trace=abc')
    expect(job.content).toContain('; mode=CAM')
  })
})
