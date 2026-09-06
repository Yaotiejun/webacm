import { describe, expect, it } from 'vitest'
import {
  buildOpsApplyPreview,
  buildRecordApplyPreview,
  buildSessionApplyAllPreview,
  buildSessionApplyPreview,
  canBuildSessionApplyPreview,
} from './sessionApplyPreview'

describe('cam.sessionApplyPreview', () => {
  it('builds record preview with changed fields and message', () => {
    const out = buildRecordApplyPreview(
      'process',
      { camZBottom: 0, camFastFeed: 1000, ops: [1] },
      { camZBottom: -1, camFastFeed: 900, ops: [2] },
      8,
      ['ops'],
    )
    expect(out.changeCount).toBe(2)
    expect(out.changedKeys).toContain('camZBottom')
    expect(out.confirmMessage).toContain('即将应用会话包字段: process')
  })

  it('builds ops preview as single aggregate change', () => {
    const out = buildOpsApplyPreview(3, 5, true)
    expect(out.changeCount).toBe(1)
    expect(out.changedKeys).toEqual(['ops'])
    expect(out.diffLines[0]).toContain('ops !!')
  })

  it('builds ops preview with no diff when unchanged', () => {
    const out = buildOpsApplyPreview(3, 3, false)
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
    expect(out.diffLines).toEqual([])
  })

  it('canBuildSessionApplyPreview rejects missing profile slices', () => {
    expect(canBuildSessionApplyPreview('device', {})).toBe(false)
    expect(canBuildSessionApplyPreview('process', {})).toBe(false)
    expect(canBuildSessionApplyPreview('ops', { process: {} })).toBe(false)
    expect(canBuildSessionApplyPreview('ops', { process: { ops: [] } })).toBe(true)
  })

  it('validates required profile parts and builds unified preview', () => {
    expect(canBuildSessionApplyPreview('device', { device: { deviceName: 'A' } })).toBe(true)
    expect(canBuildSessionApplyPreview('ops', { process: {} })).toBe(false)
    const out = buildSessionApplyPreview({
      field: 'device',
      profile: { device: { deviceName: 'B' } },
      currentDevice: { deviceName: 'A' },
      previewLimit: 8,
    })
    expect(out.confirmMessage).toContain('即将应用会话包字段: device')
  })

  it('process preview ignores legacy vs canonical alias when values match (drillDown vs camDrillDown)', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          camFastFeed: 3000,
          drillDown: 1.5,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camFastFeed: 3000,
        camDrillDown: 1.5,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('process preview ignores reverse alias pair (current legacy-only drillDown, incoming camDrillDown)', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          camFastFeed: 3000,
          camDrillDown: 2,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camFastFeed: 3000,
        drillDown: 2,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('process preview ignores cmaPocket* vs camPocket* when values match after canonicalize', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          camFastFeed: 3000,
          cmaPocketOutline: true,
          cmaPocketRefine: 7,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camFastFeed: 3000,
        camPocketOutline: true,
        camPocketRefine: 7,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('process preview ignores roughingDown vs camRoughDown when values match after canonicalize', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          roughingDown: 4,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camRoughDown: 4,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('process preview ignores finishingSpeed vs camOutlineSpeed when values match after canonicalize', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          finishingSpeed: 800,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camOutlineSpeed: 800,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('process preview ignores outputClockwise vs camConventional when both true after canonicalize', () => {
    const out = buildSessionApplyPreview({
      field: 'process',
      profile: {
        process: {
          processName: 'p',
          outputClockwise: true,
        } as Record<string, unknown>,
      },
      currentProcess: {
        processName: 'p',
        camConventional: true,
      } as Record<string, unknown>,
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('does not mark ops changed when only key order differs', () => {
    const out = buildSessionApplyPreview({
      field: 'ops',
      profile: {
        process: {
          ops: [{ type: 'rough', params: { b: 2, a: 1 } } as unknown as never],
        },
      },
      currentOps: [{ type: 'rough', params: { a: 1, b: 2 } } as unknown as never],
      previewLimit: 8,
    })
    expect(out.changeCount).toBe(0)
    expect(out.changedKeys).toEqual([])
  })

  it('buildSessionApplyAllPreview aggregates device, process, and ops', () => {
    const out = buildSessionApplyAllPreview({
      profile: {
        device: { deviceName: 'D-bundle' },
        process: { camZBottom: -2, ops: [{ type: 'rough' } as never] },
      },
      currentDevice: { deviceName: 'D-current' },
      currentProcess: { camZBottom: 0 },
      currentOps: [],
      previewLimit: 8,
    })
    expect(out.changeCount).toBeGreaterThan(0)
    expect(out.confirmMessage).toContain('device、process、ops')
  })
})
