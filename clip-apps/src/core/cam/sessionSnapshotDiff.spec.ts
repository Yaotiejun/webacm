import { describe, expect, it } from 'vitest'
import { buildSessionSnapshotDiffItems } from './sessionSnapshotDiff'

describe('cam.sessionSnapshotDiff', () => {
  it('builds key diffs and ops summary diffs', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camStockX: 100, camFastFeed: 1000, ops: [{ type: 'rough' }] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'B',
        process: { camStockX: 120, camFastFeed: 900, ops: [{ type: 'outline' }] as any[] },
      },
    })
    expect(out.some((i) => i.label === 'deviceName')).toBe(true)
    expect(out.some((i) => i.label === 'camStockX')).toBe(true)
    expect(out.some((i) => i.label === 'ops.types')).toBe(true)
  })

  it('treats cmaPocket-only snapshot as matching camPocket* on current (canonical compare)', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camPocketOutline: true, camPocketRefine: 7, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { cmaPocketOutline: true, cmaPocketRefine: 7, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camPocketOutline')).toBe(false)
    expect(out.some((i) => i.key === 'camPocketRefine')).toBe(false)
  })

  it('treats drillDown-only snapshot as matching camDrillDown on current (canonical compare)', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camDrillDown: 2, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { drillDown: 2, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camDrillDown')).toBe(false)
  })

  it('detects camDrillDown mismatch after canonicalization', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camDrillDown: 2, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { camDrillDown: 3, ops: [] as any[] },
      },
    })
    expect(out.some((i) => i.key === 'camDrillDown' && i.label === 'camDrillDown')).toBe(true)
  })

  it('detects camTolerance and camStockOn differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camTolerance: 0.03, camStockOn: true, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { camTolerance: 0.05, camStockOn: false, ops: [] as any[] },
      },
    })
    expect(out.some((i) => i.key === 'camTolerance')).toBe(true)
    expect(out.some((i) => i.key === 'camStockOn')).toBe(true)
  })

  it('treats outputClockwise on snapshot as camConventional after canonicalize', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camConventional: true, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { outputClockwise: true, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camConventional')).toBe(false)
  })

  it('treats roughing* snapshot keys as matching camRough* when equivalent', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camRoughDown: 3, camRoughSpeed: 1000, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { roughingDown: 3, roughingSpeed: 1000, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camRoughDown')).toBe(false)
    expect(out.some((i) => i.key === 'camRoughSpeed')).toBe(false)
  })

  it('treats finishing* snapshot keys as matching camOutline*/camContour* when equivalent', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camOutlineSpeed: 800, camContourOver: 0.25, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { finishingSpeed: 800, finishingOver: 0.25, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camOutlineSpeed')).toBe(false)
    expect(out.some((i) => i.key === 'camContourOver')).toBe(false)
  })

  it('treats camWideCutout on snapshot as camOutlineWide when equivalent', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camOutlineWide: true, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { camWideCutout: true, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camOutlineWide')).toBe(false)
  })

  it('treats drill* snapshot keys as matching camDrill* when equivalent', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camDrillTool: 1000, camDrillDwell: 250, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { drillTool: 1000, drillDwell: 250, ops: [] as any[] } as any,
      },
    })
    expect(out.some((i) => i.key === 'camDrillTool')).toBe(false)
    expect(out.some((i) => i.key === 'camDrillDwell')).toBe(false)
  })

  it('detects camZThru, camZOffset, and camOriginTop differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camZThru: 0, camZOffset: 0, camOriginTop: true, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { camZThru: 1, camZOffset: 0.5, camOriginTop: false, ops: [] as any[] },
      },
    })
    expect(out.some((i) => i.key === 'camZThru')).toBe(true)
    expect(out.some((i) => i.key === 'camZOffset')).toBe(true)
    expect(out.some((i) => i.key === 'camOriginTop')).toBe(true)
  })

  it('detects camZTop, camOriginCenter, and camDepthFirst differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: {
          camZTop: 0,
          camOriginCenter: false,
          camDepthFirst: true,
          ops: [] as any[],
        },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: {
          camZTop: 0.5,
          camOriginCenter: true,
          camDepthFirst: false,
          ops: [] as any[],
        },
      },
    })
    expect(out.some((i) => i.key === 'camZTop')).toBe(true)
    expect(out.some((i) => i.key === 'camOriginCenter')).toBe(true)
    expect(out.some((i) => i.key === 'camDepthFirst')).toBe(true)
  })

  it('detects camOriginOffX/Y/Z and camExpertFast differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: {
          camOriginOffX: 0,
          camOriginOffY: 0,
          camOriginOffZ: 0,
          camExpertFast: false,
          ops: [] as any[],
        },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: {
          camOriginOffX: 1,
          camOriginOffY: -2,
          camOriginOffZ: 0.5,
          camExpertFast: true,
          ops: [] as any[],
        },
      },
    })
    expect(out.some((i) => i.key === 'camOriginOffX')).toBe(true)
    expect(out.some((i) => i.key === 'camOriginOffY')).toBe(true)
    expect(out.some((i) => i.key === 'camOriginOffZ')).toBe(true)
    expect(out.some((i) => i.key === 'camExpertFast')).toBe(true)
  })

  it('detects camArcEnabled, camFirstZMax, and ctOrigin* differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: {
          camArcEnabled: false,
          camFirstZMax: false,
          ctOriginCenter: false,
          ctOriginBounds: false,
          ctOriginOffX: 0,
          ctOriginOffY: 0,
          ops: [] as any[],
        },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: {
          camArcEnabled: true,
          camFirstZMax: true,
          ctOriginCenter: true,
          ctOriginBounds: true,
          ctOriginOffX: 1,
          ctOriginOffY: -2,
          ops: [] as any[],
        },
      },
    })
    expect(out.some((i) => i.key === 'camArcEnabled')).toBe(true)
    expect(out.some((i) => i.key === 'camFirstZMax')).toBe(true)
    expect(out.some((i) => i.key === 'ctOriginCenter')).toBe(true)
    expect(out.some((i) => i.key === 'ctOriginBounds')).toBe(true)
    expect(out.some((i) => i.key === 'ctOriginOffX')).toBe(true)
    expect(out.some((i) => i.key === 'ctOriginOffY')).toBe(true)
  })

  it('detects outputInvert* and camArcTolerance / camArcResolution differences', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: {
          outputInvertX: false,
          outputInvertY: true,
          camArcTolerance: 0.01,
          camArcResolution: 45,
          ops: [] as any[],
        },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: {
          outputInvertX: true,
          outputInvertY: false,
          camArcTolerance: 0.02,
          camArcResolution: 90,
          ops: [] as any[],
        },
      },
    })
    expect(out.some((i) => i.key === 'outputInvertX')).toBe(true)
    expect(out.some((i) => i.key === 'outputInvertY')).toBe(true)
    expect(out.some((i) => i.key === 'camArcTolerance')).toBe(true)
    expect(out.some((i) => i.key === 'camArcResolution')).toBe(true)
  })

  it('detects arbitrary process keys such as camFlatness (full-surface compare)', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: { camFlatness: 0.1, ops: [] as any[] },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: { camFlatness: 0.2, ops: [] as any[] },
      },
    })
    expect(out.some((i) => i.key === 'camFlatness')).toBe(true)
  })

  it('detects ops parameter changes even when op types are unchanged', () => {
    const out = buildSessionSnapshotDiffItems({
      current: {
        deviceName: 'A',
        process: {
          ops: [
            { type: 'rough', tool: 1, params: { stepover: 0.4, depth: 1 } },
          ] as any[],
        },
        localOps: null,
      },
      snapshot: {
        deviceName: 'A',
        process: {
          ops: [
            { type: 'rough', tool: 1, params: { depth: 2, stepover: 0.4 } },
          ] as any[],
        },
      },
    })
    expect(out.some((i) => i.label === 'ops.types')).toBe(false)
    expect(out.some((i) => i.label === 'ops.detail')).toBe(true)
  })
})
