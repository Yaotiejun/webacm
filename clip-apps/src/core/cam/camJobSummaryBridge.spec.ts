import { describe, expect, it } from 'vitest'
import { enrichCamJobSummaryFromPostSliceWidget, estimateCamPlaceholderSummary, stripLegacyCamProcessKeys, canonicalizeCamProcessConfig } from './camJobSummaryBridge'
import type { CamJobInputGeometry } from '@/types/camJob'
import type { CamProcessConfig } from '@/types/cam'

function makeGeometry(): CamJobInputGeometry {
  return {
    id: 'g1',
    bbox: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 5 },
  }
}

function makeProcess(): CamProcessConfig {
  return {
    processName: 'p1',
    camFastFeed: 1200,
    ops: [
      { type: 'rough', tool: 1, down: 1, step: 1 },
      { type: 'outline', tool: 1, down: 1, step: 1 },
    ],
  } as CamProcessConfig
}

describe('camJobSummaryBridge', () => {
  it('estimateCamPlaceholderSummary derives non-zero passes and time', () => {
    const { summary, perOp } = estimateCamPlaceholderSummary(makeProcess(), makeGeometry())
    expect(summary.opCount).toBe(2)
    expect(summary.estimatedTotalPasses).toBeGreaterThan(0)
    expect(summary.estimatedTotalPathSegments).toBeGreaterThan(0)
    expect(summary.estimatedMachiningTimeMinutes).toBeGreaterThan(0)
    expect(perOp).toHaveLength(2)
  })

  it('estimateCamPlaceholderSummary uses stock footprint when larger than part bbox', () => {
    const geo = makeGeometry()
    const proc = {
      processName: 'stocky',
      camStockX: 100,
      camStockY: 100,
      camFastFeed: 2000,
      ops: [{ type: 'rough', tool: 1, down: 2, step: 2 }],
    } as CamProcessConfig
    const smallStock = estimateCamPlaceholderSummary(makeProcess(), geo)
    const largeStock = estimateCamPlaceholderSummary(proc, geo)
    expect(largeStock.summary.estimatedTotalPathSegments).toBeGreaterThanOrEqual(
      smallStock.summary.estimatedTotalPathSegments,
    )
    expect(largeStock.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(0)
  })

  it('uses camPocketOver for pocket XY step when op has no step/over', () => {
    const geo = makeGeometry()
    const fine = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.08,
        camPocketDown: 5,
        ops: [{ type: 'pocket' as const, tool: 1, down: 5 }],
      } as CamProcessConfig,
      geo,
    )
    const coarse = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.5,
        camPocketDown: 5,
        ops: [{ type: 'pocket' as const, tool: 1, down: 5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fine.perOp[0]!.estimatedPathSegments).toBeGreaterThan(coarse.perOp[0]!.estimatedPathSegments)
  })

  it('uses camTraceOffOver and per-op offover for trace XY step (more segments)', () => {
    const geo = makeGeometry()
    const baseOnly = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withProcBump = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        camTraceOffOver: 0.5,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withOpBump = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        ops: [{ type: 'trace' as const, tool: 1, offover: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(baseOnly.perOp[0]!.estimatedPathSegments).toBeGreaterThan(withProcBump.perOp[0]!.estimatedPathSegments)
    expect(withOpBump.perOp[0]!.estimatedPathSegments).toBe(withProcBump.perOp[0]!.estimatedPathSegments)
  })

  it('uses camTraceThru and per-op thru for trace Z depth when op.down omitted (fewer passes)', () => {
    const geo = makeGeometry()
    const shallow = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        camTraceDown: 0.5,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const deeperProc = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        camTraceDown: 0.5,
        camTraceThru: 2,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const deeperOp = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 1,
        camTraceDown: 0.5,
        ops: [{ type: 'trace' as const, tool: 1, thru: 2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shallow.perOp[0]!.estimatedPasses).toBeGreaterThan(deeperProc.perOp[0]!.estimatedPasses)
    expect(deeperOp.perOp[0]!.estimatedPasses).toBe(deeperProc.perOp[0]!.estimatedPasses)
  })

  it('trace clear mode scales path segments ~2× vs follow (grip dual offset shells)', () => {
    const geo = makeGeometry()
    const follow = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const clear = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'clear',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const f = follow.perOp[0]!.estimatedPathSegments
    const c = clear.perOp[0]!.estimatedPathSegments
    expect(c / Math.max(1, f)).toBeGreaterThanOrEqual(1.9)
    expect(c / Math.max(1, f)).toBeLessThanOrEqual(2.1)
  })

  it('trace per-op mode clear overrides process camTraceType follow for segment scale', () => {
    const geo = makeGeometry()
    const followProc = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1, mode: 'clear' }],
      } as CamProcessConfig,
      geo,
    )
    const followOp = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1, mode: 'follow' }],
      } as CamProcessConfig,
      geo,
    )
    expect(followProc.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      followOp.perOp[0]!.estimatedPathSegments * 1.5,
    )
  })

  it('trace follow with outside offset bumps segments vs none', () => {
    const geo = makeGeometry()
    const none = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOffset: 'none',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const outside = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOffset: 'outside',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(outside.perOp[0]!.estimatedPathSegments).toBeGreaterThan(none.perOp[0]!.estimatedPathSegments)
  })

  it('trace follow camTraceMerge reduces segments when single Z pass (grip union overlaps)', () => {
    const geo = makeGeometry()
    const noMerge = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 5,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const merged = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 5,
        camTraceMerge: true,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(merged.perOp[0]!.estimatedPasses).toBe(1)
    expect(merged.perOp[0]!.estimatedPathSegments).toBeLessThan(noMerge.perOp[0]!.estimatedPathSegments)
  })

  it('trace camTraceMerge ignored when multiple Z passes (no grip union branch)', () => {
    const geo = makeGeometry()
    const withMerge = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 1,
        camTraceMerge: true,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const noMerge = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withMerge.perOp[0]!.estimatedPasses).toBeGreaterThan(1)
    expect(withMerge.perOp[0]!.estimatedPathSegments).toBe(noMerge.perOp[0]!.estimatedPathSegments)
  })

  it('trace camTraceDogbone increases path segments (corner extras)', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 5,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const dogbone = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceType: 'follow',
        camTraceOver: 0.5,
        camTraceDown: 5,
        camTraceDogbone: true,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(dogbone.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('uses camPocketDown for pocket ops without per-op down', () => {
    const geo = makeGeometry()
    const shallow = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketDown: 0.4,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const defaultDown = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shallow.perOp[0]!.estimatedPasses).toBeGreaterThan(defaultDown.perOp[0]!.estimatedPasses)
  })

  it('applies camFastFeedZ cap to effective machining feed', () => {
    const geo = makeGeometry()
    const slowZ = estimateCamPlaceholderSummary(
      { ...makeProcess(), camFastFeed: 4000, camFastFeedZ: 120, camRoughSpeed: 3000 } as CamProcessConfig,
      geo,
    )
    const fastZ = estimateCamPlaceholderSummary(
      { ...makeProcess(), camFastFeed: 4000, camFastFeedZ: 3500, camRoughSpeed: 3000 } as CamProcessConfig,
      geo,
    )
    expect(slowZ.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(fastZ.summary.estimatedMachiningTimeMinutes)
  })

  it('uses camDrillDown for drill passes and camDrillDownSpeed in feed cap', () => {
    const geo = makeGeometry()
    const shallow = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camDrillDown: 0.5,
        camDrillDownSpeed: 800,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const deep = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camDrillDown: 0.2,
        camDrillDownSpeed: 800,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(deep.perOp[0]!.estimatedPasses).toBeGreaterThan(shallow.perOp[0]!.estimatedPasses)
    const slowDrillFeed = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 6000,
        camDrillDown: 1,
        camDrillDownSpeed: 120,
        camRoughSpeed: 8000,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1, down: 1, step: 0.2 }],
      } as CamProcessConfig,
      geo,
    )
    const fastDrillFeed = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 6000,
        camDrillDown: 1,
        camDrillDownSpeed: 2000,
        camRoughSpeed: 8000,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1, down: 1, step: 0.2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(slowDrillFeed.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      fastDrillFeed.summary.estimatedMachiningTimeMinutes,
    )
  })

  it('drill camDrillingOn false lowers segments vs true (grip conf drillingOn)', () => {
    const geo = makeGeometry()
    const off = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camDrillDown: 1,
        camDrillMark: false,
        camDrillingOn: false,
        ops: [{ type: 'drill' as const, tool: 1, down: 1, step: 0.2 }],
      } as CamProcessConfig,
      geo,
    )
    const on = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camDrillDown: 1,
        camDrillMark: false,
        camDrillingOn: true,
        ops: [{ type: 'drill' as const, tool: 1, down: 1, step: 0.2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(on.perOp[0]!.estimatedPathSegments).toBeGreaterThan(off.perOp[0]!.estimatedPathSegments)
  })

  it('uses camLaserSpeed in effective feed cap for laser ops', () => {
    const geo = makeGeometry()
    const fastLaser = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 6000,
        camLaserSpeed: 5000,
        ops: [{ type: 'laser' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const slowLaser = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 6000,
        camLaserSpeed: 200,
        ops: [{ type: 'laser' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(slowLaser.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      fastLaser.summary.estimatedMachiningTimeMinutes,
    )
  })

  it('uses camHelicalDownSpeed in effective feed cap for helical ops', () => {
    const geo = makeGeometry()
    const helicalOp = { type: 'helical' as const, tool: 1, down: 2, step: 0.5 }
    const fastHelixZ = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 5000,
        camHelicalSpeed: 4000,
        camHelicalDownSpeed: 2000,
        ops: [helicalOp],
      } as CamProcessConfig,
      geo,
    )
    const slowHelixZ = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 5000,
        camHelicalSpeed: 4000,
        camHelicalDownSpeed: 100,
        ops: [helicalOp],
      } as CamProcessConfig,
      geo,
    )
    expect(slowHelixZ.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      fastHelixZ.summary.estimatedMachiningTimeMinutes,
    )
  })

  it('resolves helical XY step from rough-style over when op has no step (not camHelicalDown)', () => {
    const geo = makeGeometry()
    const fine = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughOver: 0.35,
        camHelicalDown: 8,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const coarse = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughOver: 2,
        camHelicalDown: 8,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fine.perOp[0]!.estimatedPathSegments).toBeGreaterThan(coarse.perOp[0]!.estimatedPathSegments)
  })

  it('uses per-op rate in effective feed cap when lower than process speeds', () => {
    const geo = makeGeometry()
    const withSlowRate = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camRoughSpeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1, rate: 400 }],
      } as CamProcessConfig,
      geo,
    )
    const withoutRate = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camRoughSpeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withSlowRate.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      withoutRate.summary.estimatedMachiningTimeMinutes * 1.2,
    )
  })

  it('uses camRoughPlunge in effective feed cap alongside XY speeds', () => {
    const geo = makeGeometry()
    const fasterPlunge = estimateCamPlaceholderSummary(
      { ...makeProcess(), camRoughPlunge: 800, camRoughSpeed: 3000 } as CamProcessConfig,
      geo,
    )
    const slowerPlunge = estimateCamPlaceholderSummary(
      { ...makeProcess(), camRoughPlunge: 120, camRoughSpeed: 3000 } as CamProcessConfig,
      geo,
    )
    expect(slowerPlunge.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      fasterPlunge.summary.estimatedMachiningTimeMinutes,
    )
  })

  it('uses per-op plunge in effective feed cap when lower than camRoughSpeed', () => {
    const geo = makeGeometry()
    const withPlunge = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camRoughSpeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1, plunge: 180 }],
      } as CamProcessConfig,
      geo,
    )
    const withoutPlunge = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 4000,
        camRoughSpeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withPlunge.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      withoutPlunge.summary.estimatedMachiningTimeMinutes * 1.1,
    )
  })

  it('uses camPocketSpeed in effective feed cap', () => {
    const geo = makeGeometry()
    const pocketOp = { type: 'pocket' as const, tool: 1, down: 1, step: 1 }
    const fast = estimateCamPlaceholderSummary(
      { ...makeProcess(), camFastFeed: 5000, camPocketSpeed: 4000, ops: [pocketOp] } as CamProcessConfig,
      geo,
    )
    const slow = estimateCamPlaceholderSummary(
      { ...makeProcess(), camFastFeed: 5000, camPocketSpeed: 150, ops: [pocketOp] } as CamProcessConfig,
      geo,
    )
    expect(slow.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(fast.summary.estimatedMachiningTimeMinutes)
  })

  it('uses slowest configured op speed when below camFastFeed for machining minutes', () => {
    const geo = makeGeometry()
    const base = estimateCamPlaceholderSummary(makeProcess(), geo)
    const slowRough = estimateCamPlaceholderSummary(
      { ...makeProcess(), camFastFeed: 3000, camRoughSpeed: 400 } as CamProcessConfig,
      geo,
    )
    expect(slowRough.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      base.summary.estimatedMachiningTimeMinutes * 1.5,
    )
  })

  it('estimateCamPlaceholderSummary synthesizes roughing estimate when ops list is empty', () => {
    const proc = { processName: 'no-ops', camFastFeed: 3000, ops: [] } as CamProcessConfig
    const { summary, perOp } = estimateCamPlaceholderSummary(proc, makeGeometry())
    expect(perOp).toHaveLength(0)
    expect(summary.opCount).toBe(0)
    expect(summary.toolCountUsed).toBe(0)
    expect(summary.estimatedTotalPasses).toBeGreaterThan(0)
    expect(summary.estimatedTotalPathSegments).toBeGreaterThan(0)
    expect(summary.estimatedMachiningTimeMinutes).toBeGreaterThan(0)
  })

  it('empty ops placeholder sets toolCountUsed from distinct cam*Tool ids', () => {
    const geo = makeGeometry()
    const multi = estimateCamPlaceholderSummary(
      {
        processName: 'no-ops',
        camFastFeed: 3000,
        camRoughTool: 1001,
        camOutlineTool: 1002,
        camRegisterTool: 1003,
        camLatheTool: 1004,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const dup = estimateCamPlaceholderSummary(
      {
        processName: 'no-ops',
        camFastFeed: 3000,
        camRoughTool: 1001,
        camLevelTool: 1001,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(multi.summary.toolCountUsed).toBe(4)
    expect(dup.summary.toolCountUsed).toBe(1)
  })

  it('empty ops placeholder prefers camRoughOver and camRoughDown from process', () => {
    const geo = makeGeometry()
    const tuned = estimateCamPlaceholderSummary(
      {
        processName: 'no-ops',
        camFastFeed: 3000,
        camRoughOver: 0.22,
        camRoughDown: 1.2,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const stock = estimateCamPlaceholderSummary(
      { processName: 'no-ops', camFastFeed: 3000, ops: [] } as CamProcessConfig,
      geo,
    )
    expect(tuned.summary.estimatedTotalPathSegments).toBeGreaterThan(stock.summary.estimatedTotalPathSegments)
    expect(tuned.summary.estimatedTotalPasses).toBeGreaterThanOrEqual(stock.summary.estimatedTotalPasses)
  })

  it('empty ops placeholder uses camOutlineOver when roughing-style fields unset', () => {
    const geo = makeGeometry()
    const outline = estimateCamPlaceholderSummary(
      {
        processName: 'no-ops',
        camFastFeed: 3000,
        camOutlineOver: 0.19,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const bare = estimateCamPlaceholderSummary(
      { processName: 'no-ops', camFastFeed: 3000, ops: [] } as CamProcessConfig,
      geo,
    )
    expect(outline.summary.estimatedTotalPathSegments).toBeGreaterThan(bare.summary.estimatedTotalPathSegments)
  })

  it('outline camOutlineWide + camOutlineOverCount multiplies path segments (grip wide shells)', () => {
    const geo = makeGeometry()
    const narrow = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineWide: false,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const wide = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineWide: true,
        camOutlineOverCount: 4,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(wide.perOp[0]!.estimatedPathSegments).toBeGreaterThanOrEqual(
      narrow.perOp[0]!.estimatedPathSegments * 3.5,
    )
  })

  it('camWideCutout aliases camOutlineWide for legacy process JSON (grip conf renamed map)', () => {
    const geo = makeGeometry()
    const canonical = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineWide: true,
        camOutlineOverCount: 3,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const legacyAlias = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camWideCutout: true,
        camOutlineOverCount: 3,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(legacyAlias.perOp[0]!.estimatedPathSegments).toBe(canonical.perOp[0]!.estimatedPathSegments)
  })

  it('legacy finishingOn and roughingOn match camOutlineOn and camRoughOn (grip conf renamed)', () => {
    const geo = makeGeometry()
    const legacy = estimateCamPlaceholderSummary(
      {
        processName: 'mix',
        camFastFeed: 2000,
        finishingOn: false,
        roughingOn: false,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camRoughOver: 0.5,
        camRoughDown: 1,
        ops: [
          { type: 'outline' as const, tool: 1 },
          { type: 'rough' as const, tool: 1, down: 1, step: 0.5 },
        ],
      } as CamProcessConfig,
      geo,
    )
    const canonical = estimateCamPlaceholderSummary(
      {
        processName: 'mix',
        camFastFeed: 2000,
        camOutlineOn: false,
        camRoughOn: false,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camRoughOver: 0.5,
        camRoughDown: 1,
        ops: [
          { type: 'outline' as const, tool: 1 },
          { type: 'rough' as const, tool: 1, down: 1, step: 0.5 },
        ],
      } as CamProcessConfig,
      geo,
    )
    expect(legacy.perOp[0]!.estimatedPathSegments).toBe(canonical.perOp[0]!.estimatedPathSegments)
    expect(legacy.perOp[1]!.estimatedPathSegments).toBe(canonical.perOp[1]!.estimatedPathSegments)
  })

  it('legacy drillDown matches camDrillDown for drill placeholder passes', () => {
    const geo = makeGeometry()
    const legacy = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        drillDown: 0.5,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const canonical = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 0.5,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(legacy.perOp[0]!.estimatedPasses).toBe(canonical.perOp[0]!.estimatedPasses)
    expect(legacy.perOp[0]!.estimatedPathSegments).toBe(canonical.perOp[0]!.estimatedPathSegments)
  })

  it('outline per-op steps overrides camOutlineOverCount for wide shell multiplier', () => {
    const geo = makeGeometry()
    const procCount = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineWide: true,
        camOutlineOverCount: 2,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const opSteps = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineWide: true,
        camOutlineOverCount: 2,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1, steps: 5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opSteps.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      procCount.perOp[0]!.estimatedPathSegments * 1.9,
    )
  })

  it('outline camOutlineDogbone increases segments; camOutlineOmitVoid decreases', () => {
    const geo = makeGeometry()
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const dog = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineDogbone: true,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const omit = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineOmitVoid: true,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(dog.perOp[0]!.estimatedPathSegments).toBeGreaterThan(base.perOp[0]!.estimatedPathSegments)
    expect(omit.perOp[0]!.estimatedPathSegments).toBeLessThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('outline per-op dogbones wide omitvoid omitthru override process when set on op', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineDogbone: false,
        camOutlineWide: false,
        camOutlineOmitVoid: false,
        camOutlineOmitThru: false,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const dogOp = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineDogbone: false,
        camOutlineWide: false,
        camOutlineOmitVoid: false,
        camOutlineOmitThru: false,
        ops: [{ type: 'outline' as const, tool: 1, dogbones: true }],
      } as CamProcessConfig,
      geo,
    )
    const wideOp = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineWide: false,
        camOutlineOverCount: 1,
        ops: [{ type: 'outline' as const, tool: 1, wide: true, steps: 4 }],
      } as CamProcessConfig,
      geo,
    )
    const omitOp = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineOmitVoid: false,
        camOutlineOmitThru: false,
        ops: [{ type: 'outline' as const, tool: 1, omitvoid: true, omitthru: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(dogOp.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
    expect(wideOp.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments * 3)
    expect(omitOp.perOp[0]!.estimatedPathSegments).toBeLessThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('outline camOutlineOn false lowers segments vs true (grip conf finishingOn)', () => {
    const geo = makeGeometry()
    const off = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineOn: false,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const on = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineOn: true,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(on.perOp[0]!.estimatedPathSegments).toBeGreaterThan(off.perOp[0]!.estimatedPathSegments)
  })

  it('trace camTraceZTop / camTraceZBottom clip Z span for fewer passes than full stock', () => {
    const geo = makeGeometry()
    const full = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 0.5,
        camTraceDown: 1,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const clipped = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 2000,
        camTraceOver: 0.5,
        camTraceDown: 1,
        camTraceZTop: 2.5,
        camTraceZBottom: 0,
        ops: [{ type: 'trace' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(full.perOp[0]!.estimatedPasses).toBeGreaterThan(clipped.perOp[0]!.estimatedPasses)
  })

  it('pocket camPocketZTop / camPocketZBottom clip Z span for fewer passes than full stock', () => {
    const geo = makeGeometry()
    const full = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.5,
        camPocketDown: 1,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const clipped = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.5,
        camPocketDown: 1,
        camPocketZTop: 2.5,
        camPocketZBottom: 0,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(full.perOp[0]!.estimatedPasses).toBeGreaterThan(clipped.perOp[0]!.estimatedPasses)
  })

  it('outline camOutlineTop increases pass count vs explicit false (grip clear top)', () => {
    const geo = makeGeometry()
    const noTop = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 1,
        camOutlineTop: false,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withTop = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 1,
        camOutlineTop: true,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withTop.perOp[0]!.estimatedPasses).toBeGreaterThan(noTop.perOp[0]!.estimatedPasses)
  })

  it('outline op inside (no outside) increases segments vs outside-only (grip inner filter path)', () => {
    const geo = makeGeometry()
    const outsideOnly = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineWide: false,
        ops: [{ type: 'outline' as const, tool: 1, outside: true, inside: false }],
      } as CamProcessConfig,
      geo,
    )
    const insideOnly = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineWide: false,
        ops: [{ type: 'outline' as const, tool: 1, outside: false, inside: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(insideOnly.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      outsideOnly.perOp[0]!.estimatedPathSegments,
    )
  })

  it('outline process camOutlineIn without op override increases segments vs camOutlineOut default', () => {
    const geo = makeGeometry()
    const stockOutside = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineWide: false,
        camOutlineOut: true,
        camOutlineIn: false,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const stockInside = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 2000,
        camOutlineOver: 0.4,
        camOutlineDown: 5,
        camOutlineWide: false,
        camOutlineOut: false,
        camOutlineIn: true,
        ops: [{ type: 'outline' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(stockInside.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      stockOutside.perOp[0]!.estimatedPathSegments,
    )
  })

  it('contour camContourReduce lowers segments; camContourBottom increases', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourReduce: 0,
        camContourBottom: false,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const reduced = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourReduce: 8,
        camContourBottom: false,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const bottom = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourReduce: 0,
        camContourBottom: true,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(reduced.perOp[0]!.estimatedPathSegments).toBeLessThan(plain.perOp[0]!.estimatedPathSegments)
    expect(bottom.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('contour camContourIn inside mesh mode increases segments; per-op inside false overrides', () => {
    const geo = makeGeometry()
    const exterior = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourIn: false,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const interior = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourIn: true,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(interior.perOp[0]!.estimatedPathSegments).toBeGreaterThan(exterior.perOp[0]!.estimatedPathSegments)

    const forcedExterior = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourIn: true,
        ops: [{ type: 'contour' as const, tool: 1, inside: false }],
      } as CamProcessConfig,
      geo,
    )
    expect(interior.perOp[0]!.estimatedPathSegments).toBeGreaterThan(forcedExterior.perOp[0]!.estimatedPathSegments)
  })

  it('contour per-op bottom true applies bottom pass scale when process camContourBottom is false', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'cb',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourBottom: false,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const meshBottom = estimateCamPlaceholderSummary(
      {
        processName: 'cb',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourBottom: false,
        ops: [{ type: 'contour' as const, tool: 1, bottom: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(meshBottom.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('contour per-op bridging widens segments when process camContourBridge is zero', () => {
    const geo = makeGeometry()
    const noBridge = estimateCamPlaceholderSummary(
      {
        processName: 'br',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourBridge: 0,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const opBridge = estimateCamPlaceholderSummary(
      {
        processName: 'br',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourBridge: 0,
        ops: [{ type: 'contour' as const, tool: 1, bridging: 120 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opBridge.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noBridge.perOp[0]!.estimatedPathSegments)
  })

  it('contour dual-axis X+Y scales segments vs X only (grip finishing passes)', () => {
    const geo = makeGeometry()
    const xOnly = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourXOn: true,
        camContourYOn: false,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const xy = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 2000,
        camContourOver: 0.25,
        camLevelDown: 5,
        camContourXOn: true,
        camContourYOn: true,
        ops: [{ type: 'contour' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(xy.perOp[0]!.estimatedPathSegments).toBeGreaterThan(xOnly.perOp[0]!.estimatedPathSegments * 1.5)
  })

  it('level camLevelStepZ drives Z depth when op.down omitted (more passes than camLevelDown alone)', () => {
    const geo = makeGeometry()
    const coarse = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.3,
        camLevelDown: 5,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const fineZ = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.3,
        camLevelDown: 5,
        camLevelStepZ: 0.5,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fineZ.perOp[0]!.estimatedPasses).toBeGreaterThan(coarse.perOp[0]!.estimatedPasses)
  })

  it('level camLevelStock true slightly increases path segments vs false', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: false,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const stock = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: true,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(stock.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('level per-op stock true uses stock segment scale even when process camLevelStock is false', () => {
    const geo = makeGeometry()
    const opStock = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: false,
        ops: [{ type: 'level' as const, tool: 1, stock: true }],
      } as CamProcessConfig,
      geo,
    )
    const noStock = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: false,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opStock.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noStock.perOp[0]!.estimatedPathSegments)
  })

  it('level per-op stock false suppresses process camLevelStock segment bump', () => {
    const geo = makeGeometry()
    const forcedOff = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: true,
        ops: [{ type: 'level' as const, tool: 1, stock: false }],
      } as CamProcessConfig,
      geo,
    )
    const procOn = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 2000,
        camLevelOver: 0.4,
        camLevelDown: 2,
        camLevelStock: true,
        ops: [{ type: 'level' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(procOn.perOp[0]!.estimatedPathSegments).toBeGreaterThan(forcedOff.perOp[0]!.estimatedPathSegments)
  })

  it('rough camRoughStockZ widens effective down when op.down omitted (fewer Z passes)', () => {
    const geo = makeGeometry()
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withZ = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughStockZ: 2,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withZ.perOp[0]!.estimatedPasses).toBeLessThan(base.perOp[0]!.estimatedPasses)
  })

  it('rough camRoughOmitThru lowers placeholder path segments', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const omit = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughOmitThru: true,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(omit.perOp[0]!.estimatedPathSegments).toBeLessThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('rough per-op omitthru lowers segments when process camRoughOmitThru is false', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughOmitThru: false,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const opOmit = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughOmitThru: false,
        ops: [{ type: 'rough' as const, tool: 1, omitthru: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(opOmit.perOp[0]!.estimatedPathSegments).toBeLessThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('rough per-op voids and flats apply rough void/flat scale when process void/flat are off', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughVoid: false,
        camRoughFlat: false,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const opVf = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughVoid: false,
        camRoughFlat: false,
        ops: [{ type: 'rough' as const, tool: 1, voids: true, flats: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(opVf.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('rough camRoughTop increases segment estimate vs false', () => {
    const geo = makeGeometry()
    const noTop = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughTop: false,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withTop = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughTop: true,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withTop.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noTop.perOp[0]!.estimatedPathSegments)
  })

  it('rough camRoughOn false lowers segment estimate vs true (grip conf roughingOn)', () => {
    const geo = makeGeometry()
    const off = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughOn: false,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const on = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughOn: true,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(on.perOp[0]!.estimatedPathSegments).toBeGreaterThan(off.perOp[0]!.estimatedPathSegments)
  })

  it('pocket camPocketContour and camPocketSmooth raise segment estimate', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const heavy = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketContour: true,
        camPocketSmooth: 8,
        camPocketRefine: 5,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(heavy.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments * 1.5)
  })

  it('pocket per-op contour true enables contour segment scale when process camPocketContour is false', () => {
    const geo = makeGeometry()
    const opContour = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketContour: false,
        ops: [{ type: 'pocket' as const, tool: 1, contour: true }],
      } as CamProcessConfig,
      geo,
    )
    const noContour = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketContour: false,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opContour.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noContour.perOp[0]!.estimatedPathSegments)
  })

  it('pocket per-op smooth and refine raise segments when process pocket smooth/refine are zero', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketSmooth: 0,
        camPocketRefine: 0,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const tuned = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketSmooth: 0,
        camPocketRefine: 0,
        ops: [{ type: 'pocket' as const, tool: 1, smooth: 6, refine: 4 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tuned.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('pocket camPocketFollow increases segment estimate (grip follow distance)', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const follow = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 2000,
        camPocketOver: 0.2,
        camPocketDown: 2,
        camPocketFollow: 30,
        ops: [{ type: 'pocket' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(follow.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('rough camRoughAll increases segment estimate (indexed clear-all)', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughAll: false,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const all = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 2000,
        camRoughOver: 0.5,
        camRoughDown: 1,
        camRoughAll: true,
        ops: [{ type: 'rough' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(all.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('drill camDrillThru and camDrillPrecision increase segment estimate', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 1,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const thru = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 1,
        camDrillThru: 4,
        camDrillPrecision: 3,
        camDrillMark: false,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(thru.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('drill per-op precision and fromTop increase segments when process defaults are off', () => {
    const geo = makeGeometry()
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 1,
        camDrillMark: false,
        camDrillPrecision: 0,
        camDrillFromStockTop: false,
        ops: [{ type: 'drill' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const pr = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 1,
        camDrillMark: false,
        camDrillPrecision: 0,
        camDrillFromStockTop: false,
        ops: [{ type: 'drill' as const, tool: 1, precision: 4 }],
      } as CamProcessConfig,
      geo,
    )
    const top = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 2000,
        camDrillDown: 1,
        camDrillMark: false,
        camDrillPrecision: 0,
        camDrillFromStockTop: false,
        ops: [{ type: 'drill' as const, tool: 1, fromTop: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(pr.perOp[0]!.estimatedPathSegments).toBeGreaterThan(base.perOp[0]!.estimatedPathSegments)
    expect(top.perOp[0]!.estimatedPathSegments).toBeGreaterThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('camZTop / camZBottom clip empty-ops Z span for fewer passes than bbox-only', () => {
    const geo = makeGeometry()
    const full = estimateCamPlaceholderSummary(
      {
        processName: 'n',
        camFastFeed: 2000,
        camRoughDown: 2,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const clipped = estimateCamPlaceholderSummary(
      {
        processName: 'n',
        camFastFeed: 2000,
        camRoughDown: 2,
        camZTop: 4,
        camZBottom: 1,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(full.summary.estimatedTotalPasses).toBeGreaterThan(clipped.summary.estimatedTotalPasses)
  })

  it('pocket placeholder widens XY step with camPocketExpand for fewer path segments', () => {
    const geo = makeGeometry()
    const expanded = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camPocketOver: 0.2,
        camPocketExpand: 0.35,
        ops: [{ type: 'pocket' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camPocketOver: 0.2,
        ops: [{ type: 'pocket' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(expanded.perOp[0]!.estimatedPathSegments).toBeLessThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('level placeholder widens XY step with camLevelInset for fewer path segments', () => {
    const geo = makeGeometry()
    const withInset = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camLevelOver: 0.4,
        camLevelInset: 0.25,
        ops: [{ type: 'level' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camLevelOver: 0.4,
        ops: [{ type: 'level' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withInset.perOp[0]!.estimatedPathSegments).toBeLessThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('level per-op inset increases segment scale when op.step pins XY step (inset does not widen step)', () => {
    const geo = makeGeometry()
    const noInset = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camLevelOver: 0.5,
        camLevelInset: 0,
        ops: [{ type: 'level' as const, tool: 1, down: 1, step: 0.35 }],
      } as CamProcessConfig,
      geo,
    )
    const opInset = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camLevelOver: 0.5,
        camLevelInset: 0,
        ops: [{ type: 'level' as const, tool: 1, down: 1, step: 0.35, inset: 4 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opInset.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noInset.perOp[0]!.estimatedPathSegments)
  })

  it('rough placeholder widens XY step with camRoughStock for fewer path segments', () => {
    const geo = makeGeometry()
    const withStock = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughOver: 0.35,
        camRoughStock: 0.5,
        ops: [{ type: 'rough' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughOver: 0.35,
        ops: [{ type: 'rough' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withStock.perOp[0]!.estimatedPathSegments).toBeLessThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('contour placeholder widens XY step with camContourLeave for fewer path segments', () => {
    const geo = makeGeometry()
    const withLeave = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camContourOver: 0.25,
        camContourLeave: 0.45,
        ops: [{ type: 'contour' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camContourOver: 0.25,
        ops: [{ type: 'contour' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withLeave.perOp[0]!.estimatedPathSegments).toBeLessThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('indexed op falls back to camLevelOver and camLevelDown when rough defaults absent', () => {
    const geo = makeGeometry()
    const withLevel = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camLevelDown: 0.85,
        camLevelOver: 0.32,
        ops: [{ type: 'indexed' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const stock = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        ops: [{ type: 'indexed' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withLevel.perOp[0]!.estimatedPasses).toBeGreaterThan(stock.perOp[0]!.estimatedPasses)
    expect(withLevel.perOp[0]!.estimatedPathSegments).toBeGreaterThan(stock.perOp[0]!.estimatedPathSegments)
  })

  it('uses camStockZ with part bbox so taller stock increases Z passes when stock exceeds part height', () => {
    const geo = makeGeometry()
    const tallStock = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughDown: 5,
        camStockZ: 30,
        ops: [{ type: 'rough' as const, tool: 1, down: 5, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const partOnly = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camRoughDown: 5,
        ops: [{ type: 'rough' as const, tool: 1, down: 5, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tallStock.perOp[0]!.estimatedPasses).toBeGreaterThan(partOnly.perOp[0]!.estimatedPasses)
  })

  it('empty ops placeholder uses camHelicalDown for pass depth when milling downs unset', () => {
    const geo = makeGeometry()
    const helix = estimateCamPlaceholderSummary(
      {
        processName: 'no-ops',
        camFastFeed: 3000,
        camHelicalDown: 1,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const bare = estimateCamPlaceholderSummary(
      { processName: 'no-ops', camFastFeed: 3000, ops: [] } as CamProcessConfig,
      geo,
    )
    expect(helix.summary.estimatedTotalPasses).toBeGreaterThan(bare.summary.estimatedTotalPasses)
  })

  it('synthesizes perOp from camops when process has no ops but legacy returned slices + camops', () => {
    const proc = { processName: 'x', camFastFeed: 2000, ops: [] } as CamProcessConfig
    const base = estimateCamPlaceholderSummary(proc, makeGeometry())
    expect(base.perOp.length).toBe(0)
    const widget = {
      slices: Array.from({ length: 100 }, () => ({})),
      camops: [
        { op: { type: 'rough', tool: 1 } },
        { op: { type: 'outline', tool: 2 } },
      ],
    }
    const { summary, perOp } = enrichCamJobSummaryFromPostSliceWidget(widget, proc, base)
    expect(perOp.length).toBe(2)
    expect(perOp[0]?.type).toBe('rough')
    expect(perOp[1]?.type).toBe('outline')
    expect(perOp.reduce((a, r) => a + r.estimatedPathSegments, 0)).toBe(summary.estimatedTotalPathSegments)
    expect(perOp[0]?.estimatedPasses).toBeGreaterThanOrEqual(50)
  })

  it('scales perOp estimatedPathSegments when slice boost raises summary total', () => {
    const base = {
      summary: {
        opCount: 2,
        toolCountUsed: 1,
        estimatedTotalPasses: 4,
        estimatedTotalPathSegments: 40,
        estimatedMachiningTimeMinutes: 0,
      },
      perOp: [
        { opIndex: 0, type: 'rough' as const, toolId: 1, estimatedPasses: 2, estimatedPathSegments: 20 },
        { opIndex: 1, type: 'outline' as const, toolId: 1, estimatedPasses: 2, estimatedPathSegments: 20 },
      ],
    }
    const widget = { slices: Array.from({ length: 50 }, () => ({})), camops: [] }
    const { summary, perOp } = enrichCamJobSummaryFromPostSliceWidget(widget, makeProcess(), base as any)
    expect(summary.estimatedTotalPathSegments).toBeGreaterThan(40)
    const sum = perOp.reduce((a, r) => a + r.estimatedPathSegments, 0)
    expect(sum).toBe(summary.estimatedTotalPathSegments)
  })

  it('raises opCount when widget.camops has more entries than process.ops', () => {
    const base = estimateCamPlaceholderSummary(makeProcess(), makeGeometry())
    expect(base.summary.opCount).toBe(2)
    const widget = {
      slices: Array.from({ length: 30 }, () => ({})),
      camops: [
        { op: { type: 'rough', tool: 1 } },
        { op: { type: 'outline', tool: 1 } },
        { op: { type: 'trace', tool: 2 } },
      ],
    }
    const { summary, perOp } = enrichCamJobSummaryFromPostSliceWidget(widget, makeProcess(), base)
    expect(summary.opCount).toBe(3)
    expect(perOp.length).toBe(3)
    expect(perOp[2]?.type).toBe('trace')
    expect(perOp.reduce((a, r) => a + r.estimatedPathSegments, 0)).toBe(summary.estimatedTotalPathSegments)
    expect(summary.estimatedTotalPasses).toBeGreaterThanOrEqual(30)
  })

  it('raises toolCountUsed from distinct tools in widget.camops', () => {
    const base = estimateCamPlaceholderSummary(makeProcess(), makeGeometry())
    expect(base.summary.toolCountUsed).toBe(1)
    const widget = {
      slices: [{ z: 0 }],
      camops: [{ op: { type: 'rough', tool: 1 } }, { op: { type: 'outline', tool: 3 } }],
    }
    const { summary } = enrichCamJobSummaryFromPostSliceWidget(widget, makeProcess(), base)
    expect(summary.toolCountUsed).toBe(2)
  })

  it('enrich machining minutes use Σ(segments×step)/feed after slice segment scaling', () => {
    const proc = {
      processName: 'p',
      camFastFeed: 1000,
      ops: [{ type: 'rough' as const, tool: 1, down: 5, step: 1 }],
    } as CamProcessConfig
    const base = estimateCamPlaceholderSummary(proc, makeGeometry())
    const enriched = enrichCamJobSummaryFromPostSliceWidget(
      { slices: Array.from({ length: 40 }, () => ({})), camops: [] },
      proc,
      base,
    )
    const segs = enriched.perOp[0]!.estimatedPathSegments
    const expectedMin = (segs * 1) / 1000 / 60
    expect(enriched.summary.estimatedMachiningTimeMinutes).toBeCloseTo(expectedMin, 5)
  })

  it('enrich uses camops XY step for machining minutes when process.ops is empty', () => {
    const proc = { processName: 'legacy', camFastFeed: 1000, ops: [] } as CamProcessConfig
    const base = estimateCamPlaceholderSummary(proc, makeGeometry())
    const enriched = enrichCamJobSummaryFromPostSliceWidget(
      {
        slices: Array.from({ length: 20 }, () => ({})),
        camops: [{ op: { type: 'rough', tool: 1, down: 1, step: 2 } }],
      },
      proc,
      base,
    )
    expect(enriched.perOp).toHaveLength(1)
    const segs = enriched.perOp[0]!.estimatedPathSegments
    expect(enriched.summary.estimatedMachiningTimeMinutes).toBeCloseTo((segs * 2) / 1000 / 60, 5)
  })

  it('enrich uses camops per-op rate for feed when process.ops is empty', () => {
    const proc = { processName: 'legacy', camFastFeed: 1000, ops: [] } as CamProcessConfig
    const base = estimateCamPlaceholderSummary(proc, makeGeometry())
    const enriched = enrichCamJobSummaryFromPostSliceWidget(
      {
        slices: Array.from({ length: 20 }, () => ({})),
        camops: [{ op: { type: 'rough', tool: 1, down: 1, step: 2, rate: 250 } }],
      },
      proc,
      base,
    )
    const segs = enriched.perOp[0]!.estimatedPathSegments
    expect(enriched.summary.estimatedMachiningTimeMinutes).toBeCloseTo((segs * 2) / 250 / 60, 5)
  })

  it('enrich uses camops per-op plunge for feed when lower than rate', () => {
    const proc = { processName: 'legacy', camFastFeed: 2000, ops: [] } as CamProcessConfig
    const base = estimateCamPlaceholderSummary(proc, makeGeometry())
    const enriched = enrichCamJobSummaryFromPostSliceWidget(
      {
        slices: Array.from({ length: 20 }, () => ({})),
        camops: [{ op: { type: 'rough', tool: 1, down: 1, step: 2, rate: 900, plunge: 200 } }],
      },
      proc,
      base,
    )
    const segs = enriched.perOp[0]!.estimatedPathSegments
    expect(enriched.summary.estimatedMachiningTimeMinutes).toBeCloseTo((segs * 2) / 200 / 60, 5)
  })

  it('enrichCamJobSummaryFromPostSliceWidget lifts slice plane count into summary', () => {
    const base = estimateCamPlaceholderSummary(makeProcess(), makeGeometry())
    const widget = {
      slices: Array.from({ length: 40 }, () => ({})),
      camops: [{ op: { type: 'rough', tool: 1 } }, { op: { type: 'outline', tool: 1 } }],
    }
    const { summary, perOp } = enrichCamJobSummaryFromPostSliceWidget(widget, makeProcess(), base)
    expect(summary.estimatedTotalPasses).toBeGreaterThanOrEqual(40)
    expect(perOp[0]?.type).toBe('rough')
    expect(perOp[1]?.type).toBe('outline')
  })

  it('helical resolveOpDown adds camHelicalThru (or op.thru) for fewer Z passes vs thru unset', () => {
    const geo = makeGeometry()
    const baseThru = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camHelicalDown: 1,
        ops: [{ type: 'helical' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withProcThru = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camHelicalDown: 1,
        camHelicalThru: 4,
        ops: [{ type: 'helical' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withOpThru = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camHelicalDown: 1,
        camHelicalThru: 0,
        ops: [{ type: 'helical' as const, tool: 1, thru: 4 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withProcThru.perOp[0]!.estimatedPasses).toBeLessThan(baseThru.perOp[0]!.estimatedPasses)
    expect(withOpThru.perOp[0]!.estimatedPasses).toBe(withProcThru.perOp[0]!.estimatedPasses)
  })

  it('helical segment scale bumps path segments for entry / bottom finish / fromStockTop', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalEntry: false,
        camHelicalBottomFinish: false,
        camHelicalFromStockTop: false,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const busy = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalEntry: true,
        camHelicalBottomFinish: true,
        camHelicalFromStockTop: true,
        camHelicalEntryOffset: 2,
        camHelicalReverse: true,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(busy.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('helical per-op fromTop bumps segments when process camHelicalFromStockTop is false', () => {
    const geo = makeGeometry()
    const base = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalFromStockTop: false,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const opTop = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalFromStockTop: false,
        ops: [{ type: 'helical' as const, tool: 1, down: 2, fromTop: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(opTop.perOp[0]!.estimatedPathSegments).toBeGreaterThan(base.perOp[0]!.estimatedPathSegments)
  })

  it('helical per-op offOver sets XY step when process camHelicalOffsetOverride is zero', () => {
    const geo = makeGeometry()
    const defaultStep = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.35,
        camHelicalOffsetOverride: 0,
        ops: [{ type: 'helical' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const fatStep = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.35,
        camHelicalOffsetOverride: 0,
        ops: [{ type: 'helical' as const, tool: 1, down: 2, offOver: 2.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fatStep.perOp[0]!.estimatedPathSegments).toBeLessThan(defaultStep.perOp[0]!.estimatedPathSegments)
  })

  it('helical per-op entry reverse finish offOver and offset string override process defaults', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalEntry: false,
        camHelicalBottomFinish: false,
        camHelicalReverse: false,
        camHelicalOffset: 'auto',
        camHelicalOffsetOverride: 0,
        camHelicalStartAngle: 0,
        camHelicalForceStartAngle: false,
        ops: [{ type: 'helical' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const busy = estimateCamPlaceholderSummary(
      {
        processName: 'h',
        camFastFeed: 3000,
        camRoughOver: 0.5,
        camHelicalDown: 2,
        camHelicalEntry: false,
        camHelicalBottomFinish: false,
        camHelicalReverse: false,
        camHelicalOffset: 'auto',
        camHelicalOffsetOverride: 0,
        camHelicalStartAngle: 0,
        camHelicalForceStartAngle: false,
        ops: [
          {
            type: 'helical' as const,
            tool: 1,
            down: 2,
            step: 0.5,
            entry: true,
            reverse: true,
            finish: true,
            offOver: 12,
            offset: 'inside',
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    expect(busy.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments * 1.25)
  })

  it('register axis not "-" increases placeholder segments vs mark-only register', () => {
    const geo = makeGeometry()
    const mark = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: '-' }],
      } as CamProcessConfig,
      geo,
    )
    const drillish = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    expect(drillish.perOp[0]!.estimatedPathSegments).toBeGreaterThan(mark.perOp[0]!.estimatedPathSegments)
  })

  it('register axis "=" uses same face-style segment scale as axis "-" (grip op-register.js)', () => {
    const geo = makeGeometry()
    const dash = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: '-' }],
      } as CamProcessConfig,
      geo,
    )
    const equals = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: '=' }],
      } as CamProcessConfig,
      geo,
    )
    expect(equals.perOp[0]!.estimatedPathSegments).toBe(dash.perOp[0]!.estimatedPathSegments)
  })

  it('register points 3 increases segments vs points 2 on X (grip regpoints)', () => {
    const geo = makeGeometry()
    const two = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'X', points: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const three = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'X', points: 3 }],
      } as CamProcessConfig,
      geo,
    )
    expect(three.perOp[0]!.estimatedPathSegments).toBeGreaterThan(two.perOp[0]!.estimatedPathSegments)
  })

  it('register X/Y dwell and lift nudge segments like drill peck (grip shared camDrillDwell/Lift)', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'Y', points: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const pecky = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camDrillLift: 4,
        camDrillDwell: 2000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'Y', points: 2 }],
      } as CamProcessConfig,
      geo,
    )
    expect(pecky.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('register per-op offset and thru increase segments when process register offset/thru are unset', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: 'X', points: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const wide = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [
          {
            type: 'register' as const,
            tool: 1,
            axis: 'X',
            points: 2,
            offset: 2.5,
            thru: 6,
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    expect(wide.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('register face axis - feed increases segments vs zero feed when camRegisterSpeed unset', () => {
    const geo = makeGeometry()
    const slow = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        ops: [{ type: 'register' as const, tool: 1, axis: '-' }],
      } as CamProcessConfig,
      geo,
    )
    const fast = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camRegisterSpeed: 0,
        ops: [{ type: 'register' as const, tool: 1, axis: '-', feed: 12000 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fast.perOp[0]!.estimatedPathSegments).toBeGreaterThan(slow.perOp[0]!.estimatedPathSegments)
  })

  it('indexed camIndexAxis increases segment estimate vs zero degrees', () => {
    const geo = makeGeometry()
    const zero = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 0,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const rot = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 90,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(rot.perOp[0]!.estimatedPathSegments).toBeGreaterThan(zero.perOp[0]!.estimatedPathSegments)
  })

  it('indexed op degrees overrides process camIndexAxis for segment scale', () => {
    const geo = makeGeometry()
    const opDeg = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 0,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5, degrees: 90 }],
      } as CamProcessConfig,
      geo,
    )
    const procOnly = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 0,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(opDeg.perOp[0]!.estimatedPathSegments).toBeGreaterThan(procOnly.perOp[0]!.estimatedPathSegments)
  })

  it('indexed op absolute true applies segment bump; explicit false skips even if process camIndexAbs', () => {
    const geo = makeGeometry()
    const absOp = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 45,
        camIndexAbs: true,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5, absolute: true }],
      } as CamProcessConfig,
      geo,
    )
    const absOff = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 45,
        camIndexAbs: true,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5, absolute: false }],
      } as CamProcessConfig,
      geo,
    )
    expect(absOp.perOp[0]!.estimatedPathSegments).toBeGreaterThan(absOff.perOp[0]!.estimatedPathSegments)
  })

  it('gcode op scales segments with non-empty camCustomGcode', () => {
    const geo = makeGeometry()
    const empty = estimateCamPlaceholderSummary(
      {
        processName: 'g',
        camFastFeed: 3000,
        camCustomGcode: [],
        ops: [{ type: 'gcode' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const lines = estimateCamPlaceholderSummary(
      {
        processName: 'g',
        camFastFeed: 3000,
        camCustomGcode: 'G0 X0\nG0 Y0\nM2',
        ops: [{ type: 'gcode' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(lines.perOp[0]!.estimatedPathSegments).toBeGreaterThan(empty.perOp[0]!.estimatedPathSegments)
  })

  it('gcode op uses per-op gcode lines when set (overrides process camCustomGcode)', () => {
    const geo = makeGeometry()
    const withOpLines = estimateCamPlaceholderSummary(
      {
        processName: 'g',
        camFastFeed: 3000,
        camCustomGcode: [],
        ops: [{ type: 'gcode' as const, tool: 1, gcode: 'G0 X1\nG0 X2\nG0 X3' }],
      } as CamProcessConfig,
      geo,
    )
    const empty = estimateCamPlaceholderSummary(
      {
        processName: 'g',
        camFastFeed: 3000,
        camCustomGcode: [],
        ops: [{ type: 'gcode' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withOpLines.perOp[0]!.estimatedPathSegments).toBeGreaterThan(empty.perOp[0]!.estimatedPathSegments)
  })

  it('flip op uses a single Z pass in placeholder estimate', () => {
    const geo = makeGeometry()
    const { perOp } = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        ops: [{ type: 'flip' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(perOp[0]!.estimatedPasses).toBe(1)
    expect(perOp[0]!.type).toBe('flip')
  })

  it('flip op axis Y slightly increases segments vs X (grip cl-flip.js branch)', () => {
    const geo = makeGeometry()
    const x = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipAxis: 'X',
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    const y = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipAxis: 'Y',
        ops: [{ type: 'flip' as const, tool: 1, axis: 'Y' }],
      } as CamProcessConfig,
      geo,
    )
    expect(y.perOp[0]!.estimatedPathSegments).toBeGreaterThan(x.perOp[0]!.estimatedPathSegments)
  })

  it('flip per-op invert true applies invert bump when process camFlipInvert is false', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipInvert: false,
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    const inverted = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipInvert: false,
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X', invert: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(inverted.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('flip non-X/Y axis lowers segment scale vs X (no pi rotation in grip)', () => {
    const geo = makeGeometry()
    const x = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    const dash = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        ops: [{ type: 'flip' as const, tool: 1, axis: '-' }],
      } as CamProcessConfig,
      geo,
    )
    expect(x.perOp[0]!.estimatedPathSegments).toBeGreaterThan(dash.perOp[0]!.estimatedPathSegments)
  })

  it('flip camFlipOther non-empty string slightly increases segment scale', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipOther: '',
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    const noted = estimateCamPlaceholderSummary(
      {
        processName: 'f',
        camFastFeed: 3000,
        camFlipOther: 'secondary axis note for operator',
        ops: [{ type: 'flip' as const, tool: 1, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    expect(noted.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('grip op type index matches indexed placeholder segments', () => {
    const geo = makeGeometry()
    const indexed = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 45,
        ops: [{ type: 'indexed' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const indexAlias = estimateCamPlaceholderSummary(
      {
        processName: 'i',
        camFastFeed: 3000,
        camIndexAxis: 45,
        ops: [{ type: 'index' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(indexAlias.perOp[0]!.estimatedPathSegments).toBe(indexed.perOp[0]!.estimatedPathSegments)
    expect(indexAlias.perOp[0]!.estimatedPasses).toBe(indexed.perOp[0]!.estimatedPasses)
  })

  it('laser on with camLaserAdaptive increases segments vs adaptive off', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    const adapt = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: true,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(adapt.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('laser on camLaserPower increases segments when adaptive is off', () => {
    const geo = makeGeometry()
    const dim = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        camLaserPower: 0.1,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    const bright = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        camLaserPower: 1,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(bright.perOp[0]!.estimatedPathSegments).toBeGreaterThan(dim.perOp[0]!.estimatedPathSegments)
  })

  it('laser on adaptive power min/max span widens segment estimate', () => {
    const geo = makeGeometry()
    const narrow = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: true,
        camLaserPowerMin: 0.45,
        camLaserPowerMax: 0.5,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    const wide = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: true,
        camLaserPowerMin: 0.05,
        camLaserPowerMax: 0.98,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(wide.perOp[0]!.estimatedPathSegments).toBeGreaterThan(narrow.perOp[0]!.estimatedPathSegments)
  })

  it('laser on per-op adapt and power override process when laser fields are off or zero', () => {
    const geo = makeGeometry()
    const dim = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        camLaserPower: 0,
        camLaserPowerMin: 0,
        camLaserPowerMax: 0,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    const opAdaptive = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        camLaserPowerMin: 0,
        camLaserPowerMax: 0,
        ops: [
          {
            type: 'laser on' as const,
            tool: 1,
            down: 0.2,
            step: 0.1,
            adapt: true,
            minp: 0.1,
            maxp: 0.95,
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    const opPower = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        camLaserAdaptive: false,
        camLaserPower: 0,
        ops: [
          {
            type: 'laser on' as const,
            tool: 1,
            down: 0.2,
            step: 0.1,
            power: 0.9,
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    expect(opAdaptive.perOp[0]!.estimatedPathSegments).toBeGreaterThan(dim.perOp[0]!.estimatedPathSegments)
    expect(opPower.perOp[0]!.estimatedPathSegments).toBeGreaterThan(dim.perOp[0]!.estimatedPathSegments)
  })

  it('laser off uses one pass and fewer segments than laser on', () => {
    const geo = makeGeometry()
    const off = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        ops: [{ type: 'laser off' as const, tool: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const on = estimateCamPlaceholderSummary(
      {
        processName: 'l',
        camFastFeed: 3000,
        ops: [{ type: 'laser on' as const, tool: 1, down: 0.2, step: 0.1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(off.perOp[0]!.estimatedPasses).toBe(1)
    expect(off.perOp[0]!.estimatedPathSegments).toBeLessThan(on.perOp[0]!.estimatedPathSegments)
  })

  it('camLatheSpeed caps machining minutes like other op speeds', () => {
    const geo = makeGeometry()
    const fast = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 6000,
        camLatheSpeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const slow = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 6000,
        camLatheSpeed: 200,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(slow.summary.estimatedMachiningTimeMinutes).toBeGreaterThan(
      fast.summary.estimatedMachiningTimeMinutes,
    )
  })

  it('lathe op smaller per-op angle increases placeholder path segments (latheSegmentScale)', () => {
    const geo = makeGeometry()
    const coarse = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 3000,
        camLatheOver: 0.2,
        camLatheAngle: 10,
        ops: [{ type: 'lathe' as const, tool: 1, down: 1, angle: 8 }],
      } as CamProcessConfig,
      geo,
    )
    const fine = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 3000,
        camLatheOver: 0.2,
        camLatheAngle: 10,
        ops: [{ type: 'lathe' as const, tool: 1, down: 1, angle: 0.35 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fine.perOp[0]!.estimatedPathSegments).toBeGreaterThan(coarse.perOp[0]!.estimatedPathSegments)
  })

  it('lathe XY step widens with camContourLeave when op has no explicit step', () => {
    const geo = makeGeometry()
    const noLeave = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 3000,
        camLatheOver: 0.15,
        camContourLeave: 0,
        ops: [{ type: 'lathe' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const withLeave = estimateCamPlaceholderSummary(
      {
        processName: 'lathe',
        camFastFeed: 3000,
        camLatheOver: 0.15,
        camContourLeave: 0.4,
        ops: [{ type: 'lathe' as const, tool: 1, down: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withLeave.perOp[0]!.estimatedPathSegments).toBeLessThan(noLeave.perOp[0]!.estimatedPathSegments)
  })

  it('empty ops placeholder adds camZThru to Z span for more passes when down unchanged', () => {
    const geo = makeGeometry()
    const noThru = estimateCamPlaceholderSummary(
      {
        processName: 'z',
        camFastFeed: 3000,
        camRoughDown: 2,
        camZThru: 0,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const withThru = estimateCamPlaceholderSummary(
      {
        processName: 'z',
        camFastFeed: 3000,
        camRoughDown: 2,
        camZThru: 8,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(withThru.summary.estimatedTotalPasses).toBeGreaterThanOrEqual(noThru.summary.estimatedTotalPasses)
  })

  it('empty ops implicit XY step prefers camLatheOver after trace-style overs unset', () => {
    const geo = makeGeometry()
    const latheOnly = estimateCamPlaceholderSummary(
      {
        processName: 'lathe-only',
        camFastFeed: 3000,
        camLatheOver: 0.06,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const stockDefault = estimateCamPlaceholderSummary(
      {
        processName: 'bare',
        camFastFeed: 3000,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(latheOnly.summary.estimatedTotalPathSegments).toBeGreaterThan(
      stockDefault.summary.estimatedTotalPathSegments,
    )
  })

  it('camTabsWidth/Height/Depth increase per-op placeholder path segments', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const tabs = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 3000,
        camTabsWidth: 20,
        camTabsHeight: 5,
        camTabsDepth: 10,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tabs.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('camEaseDown increases placeholder segments vs ease off', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'e',
        camFastFeed: 3000,
        camEaseDown: false,
        camEaseAngle: 0,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const eased = estimateCamPlaceholderSummary(
      {
        processName: 'e',
        camFastFeed: 3000,
        camEaseDown: true,
        camEaseAngle: 20,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(eased.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('camContourFilter non-empty lines increase contour placeholder segments', () => {
    const geo = makeGeometry()
    const noFilter = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camContourFilter: [],
        ops: [{ type: 'contour' as const, tool: 1, down: 1, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const filtered = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camContourFilter: ';; layer 1\nM0\n',
        ops: [{ type: 'contour' as const, tool: 1, down: 1, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    expect(filtered.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noFilter.perOp[0]!.estimatedPathSegments)
  })

  it('camDepthFirst false increases rough placeholder segments vs depth-first true', () => {
    const geo = makeGeometry()
    const depthFirst = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 3000,
        camDepthFirst: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const widthFirst = estimateCamPlaceholderSummary(
      {
        processName: 'd',
        camFastFeed: 3000,
        camDepthFirst: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(widthFirst.perOp[0]!.estimatedPathSegments).toBeGreaterThan(depthFirst.perOp[0]!.estimatedPathSegments)
  })

  it('empty ops placeholder applies width-first segment bump when camDepthFirst is false', () => {
    const geo = makeGeometry()
    const depthFirst = estimateCamPlaceholderSummary(
      {
        processName: 'empty',
        camFastFeed: 3000,
        camRoughDown: 2,
        camRoughOver: 0.5,
        camDepthFirst: true,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const widthFirst = estimateCamPlaceholderSummary(
      {
        processName: 'empty',
        camFastFeed: 3000,
        camRoughDown: 2,
        camRoughOver: 0.5,
        camDepthFirst: false,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(widthFirst.summary.estimatedTotalPathSegments).toBeGreaterThan(
      depthFirst.summary.estimatedTotalPathSegments,
    )
  })

  it('rough camConventional increases placeholder path segments vs climb default', () => {
    const geo = makeGeometry()
    const climb = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camConventional: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const conv = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camConventional: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(conv.perOp[0]!.estimatedPathSegments).toBeGreaterThan(climb.perOp[0]!.estimatedPathSegments)
  })

  it('rough camTrueShadow increases placeholder segments vs false shadow', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camTrueShadow: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const shadow = estimateCamPlaceholderSummary(
      {
        processName: 'r',
        camFastFeed: 3000,
        camTrueShadow: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 2, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shadow.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('contour camContourCurves with shallower camContourAngle increases segments vs near-90 angle', () => {
    const geo = makeGeometry()
    const steep = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camContourCurves: true,
        camContourAngle: 88,
        ops: [{ type: 'contour' as const, tool: 1, down: 1, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const shallow = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camContourCurves: true,
        camContourAngle: 48,
        ops: [{ type: 'contour' as const, tool: 1, down: 1, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shallow.perOp[0]!.estimatedPathSegments).toBeGreaterThan(steep.perOp[0]!.estimatedPathSegments)
  })

  it('camExpertFast lowers empty-ops placeholder path segments', () => {
    const geo = makeGeometry()
    const normal = estimateCamPlaceholderSummary(
      {
        processName: 'e',
        camFastFeed: 3000,
        camRoughDown: 2,
        camRoughOver: 0.5,
        camExpertFast: false,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    const fast = estimateCamPlaceholderSummary(
      {
        processName: 'e',
        camFastFeed: 3000,
        camRoughDown: 2,
        camRoughOver: 0.5,
        camExpertFast: true,
        ops: [],
      } as CamProcessConfig,
      geo,
    )
    expect(fast.summary.estimatedTotalPathSegments).toBeLessThan(normal.summary.estimatedTotalPathSegments)
  })

  it('rough per-op ov_topz/ov_botz narrows Z span for fewer passes vs full stock', () => {
    const geo = makeGeometry()
    const full = estimateCamPlaceholderSummary(
      {
        processName: 'ov',
        camFastFeed: 3000,
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const narrow = estimateCamPlaceholderSummary(
      {
        processName: 'ov',
        camFastFeed: 3000,
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 1, ov_topz: 2, ov_botz: 0 }],
      } as CamProcessConfig,
      geo,
    )
    expect(narrow.perOp[0]!.estimatedPasses).toBeLessThan(full.perOp[0]!.estimatedPasses)
  })

  it('pocket op.ov_conv true bumps segments when process camConventional is false', () => {
    const geo = makeGeometry()
    const climb = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camConventional: false,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const opConv = estimateCamPlaceholderSummary(
      {
        processName: 'p',
        camFastFeed: 3000,
        camConventional: false,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5, ov_conv: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(opConv.perOp[0]!.estimatedPathSegments).toBeGreaterThan(climb.perOp[0]!.estimatedPathSegments)
  })

  it('trace revbone adds segment scale on top of dogbone', () => {
    const geo = makeGeometry()
    const dogOnly = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 3000,
        camTraceDogbone: true,
        ops: [
          {
            type: 'trace' as const,
            tool: 1,
            down: 5,
            step: 0.5,
            dogbone: true,
            revbone: false,
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    const dogRev = estimateCamPlaceholderSummary(
      {
        processName: 't',
        camFastFeed: 3000,
        camTraceDogbone: true,
        ops: [
          {
            type: 'trace' as const,
            tool: 1,
            down: 5,
            step: 0.5,
            dogbone: true,
            revbone: true,
          },
        ],
      } as CamProcessConfig,
      geo,
    )
    expect(dogRev.perOp[0]!.estimatedPathSegments).toBeGreaterThan(dogOnly.perOp[0]!.estimatedPathSegments)
  })

  it('outline op.ov_conv false suppresses process camConventional segment bump', () => {
    const geo = makeGeometry()
    const procConv = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 3000,
        camConventional: true,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4 }],
      } as CamProcessConfig,
      geo,
    )
    const opClimb = estimateCamPlaceholderSummary(
      {
        processName: 'o',
        camFastFeed: 3000,
        camConventional: true,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4, ov_conv: false }],
      } as CamProcessConfig,
      geo,
    )
    expect(opClimb.perOp[0]!.estimatedPathSegments).toBeLessThan(procConv.perOp[0]!.estimatedPathSegments)
  })

  it('camStockClipTo with absolute stock smaller than part shrinks XY footprint vs no clip', () => {
    const geo = makeGeometry()
    const noClip = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockOffset: false,
        camStockX: 4,
        camStockY: 4,
        camStockClipTo: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const clipped = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockOffset: false,
        camStockX: 4,
        camStockY: 4,
        camStockClipTo: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(clipped.perOp[0]!.estimatedPathSegments).toBeLessThan(noClip.perOp[0]!.estimatedPathSegments)
  })

  it('camStockClipTo applies a small segment bump when XY footprint matches non-clip case', () => {
    const geo = makeGeometry()
    const noClip = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockX: 200,
        camStockY: 200,
        camStockClipTo: false,
        camStockOffset: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const clipped = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockX: 200,
        camStockY: 200,
        camStockClipTo: true,
        camStockOffset: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(clipped.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      noClip.perOp[0]!.estimatedPathSegments,
    )
  })

  it('camStockOffset true nudges segment estimate when XY footprint matches no-offset case', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockX: 200,
        camStockY: 200,
        camStockClipTo: false,
        camStockOffset: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const offsetOn = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockX: 200,
        camStockY: 200,
        camStockClipTo: false,
        camStockOffset: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(offsetOn.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('camStockOffset does not affect segments when camStockOn is false', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockOn: false,
        camStockOffset: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const offsetIgnored = estimateCamPlaceholderSummary(
      {
        processName: 'c',
        camFastFeed: 3000,
        camStockOn: false,
        camStockOffset: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(offsetIgnored.perOp[0]!.estimatedPathSegments).toBe(plain.perOp[0]!.estimatedPathSegments)
  })

  it('camArcEnabled bumps segment estimate for contour when tolerance and resolution are valid', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'a',
        camFastFeed: 3000,
        camArcEnabled: false,
        camArcTolerance: 0.006,
        camArcResolution: 5,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const arcs = estimateCamPlaceholderSummary(
      {
        processName: 'a',
        camFastFeed: 3000,
        camArcEnabled: true,
        camArcTolerance: 0.006,
        camArcResolution: 5,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    expect(arcs.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('camStockOn false ignores camStockZ for Z pass count', () => {
    const geo = makeGeometry()
    const partOnly = estimateCamPlaceholderSummary(
      {
        processName: 'z',
        camFastFeed: 3000,
        camRoughDown: 5,
        ops: [{ type: 'rough' as const, tool: 1, down: 5, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    const tallIgnored = estimateCamPlaceholderSummary(
      {
        processName: 'z',
        camFastFeed: 3000,
        camRoughDown: 5,
        camStockZ: 30,
        camStockOn: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 5, step: 1 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tallIgnored.perOp[0]!.estimatedPasses).toBe(partOnly.perOp[0]!.estimatedPasses)
  })

  it('camStockOn false does not inflate XY footprint from camStockX/Y', () => {
    const geo = makeGeometry()
    const partFoot = estimateCamPlaceholderSummary(
      {
        processName: 'xy',
        camFastFeed: 3000,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const stockOffHuge = estimateCamPlaceholderSummary(
      {
        processName: 'xy',
        camFastFeed: 3000,
        camStockX: 200,
        camStockY: 200,
        camStockOn: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(stockOffHuge.perOp[0]!.estimatedPathSegments).toBe(partFoot.perOp[0]!.estimatedPathSegments)
  })

  it('contour op.axis X or Y lowers wall multiplier vs dual-axis when both process wall toggles on', () => {
    const geo = makeGeometry()
    const dual = estimateCamPlaceholderSummary(
      {
        processName: 'ax',
        camFastFeed: 3000,
        camContourXOn: true,
        camContourYOn: true,
        camContourCurves: false,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const singleWall = estimateCamPlaceholderSummary(
      {
        processName: 'ax',
        camFastFeed: 3000,
        camContourXOn: true,
        camContourYOn: true,
        camContourCurves: false,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25, axis: 'X' }],
      } as CamProcessConfig,
      geo,
    )
    expect(singleWall.perOp[0]!.estimatedPathSegments).toBeLessThan(dual.perOp[0]!.estimatedPathSegments)
  })

  it('contour per-op tolerance overrides process camTolerance for segment scale', () => {
    const geo = makeGeometry()
    const coarseProc = estimateCamPlaceholderSummary(
      {
        processName: 'tol',
        camFastFeed: 3000,
        camTolerance: 8,
        camContourCurves: false,
        camContourXOn: true,
        camContourYOn: false,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const tightOp = estimateCamPlaceholderSummary(
      {
        processName: 'tol',
        camFastFeed: 3000,
        camTolerance: 8,
        camContourCurves: false,
        camContourXOn: true,
        camContourYOn: false,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25, tolerance: 0.02 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tightOp.perOp[0]!.estimatedPathSegments).toBeGreaterThan(coarseProc.perOp[0]!.estimatedPathSegments)
  })

  it('pocket contour mode applies tolerance to segment scale', () => {
    const geo = makeGeometry()
    const loose = estimateCamPlaceholderSummary(
      {
        processName: 'pt',
        camFastFeed: 3000,
        camPocketContour: true,
        camTolerance: 6,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const tight = estimateCamPlaceholderSummary(
      {
        processName: 'pt',
        camFastFeed: 3000,
        camPocketContour: true,
        camTolerance: 0.05,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(tight.perOp[0]!.estimatedPathSegments).toBeGreaterThan(loose.perOp[0]!.estimatedPathSegments)
  })

  it('camStockIndexed bumps rough segment estimate vs plain stock', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'idx',
        camFastFeed: 3000,
        camStockIndexed: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const indexed = estimateCamPlaceholderSummary(
      {
        processName: 'idx',
        camFastFeed: 3000,
        camStockIndexed: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(indexed.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('camStockIndexGrid adds a small segment bump on indexed rough vs grid off', () => {
    const geo = makeGeometry()
    const noGrid = estimateCamPlaceholderSummary(
      {
        processName: 'idx',
        camFastFeed: 3000,
        camStockIndexed: true,
        camStockIndexGrid: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const withGrid = estimateCamPlaceholderSummary(
      {
        processName: 'idx',
        camFastFeed: 3000,
        camStockIndexed: true,
        camStockIndexGrid: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withGrid.perOp[0]!.estimatedPathSegments).toBeGreaterThan(noGrid.perOp[0]!.estimatedPathSegments)
  })

  it('camForceZMax increases rough segment estimate vs off', () => {
    const geo = makeGeometry()
    const off = estimateCamPlaceholderSummary(
      {
        processName: 'fz',
        camFastFeed: 3000,
        camForceZMax: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const on = estimateCamPlaceholderSummary(
      {
        processName: 'fz',
        camFastFeed: 3000,
        camForceZMax: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(on.perOp[0]!.estimatedPathSegments).toBeGreaterThan(off.perOp[0]!.estimatedPathSegments)
  })

  it('camInnerFirst increases pocket segment estimate vs off', () => {
    const geo = makeGeometry()
    const normal = estimateCamPlaceholderSummary(
      {
        processName: 'if',
        camFastFeed: 3000,
        camInnerFirst: false,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const inner = estimateCamPlaceholderSummary(
      {
        processName: 'if',
        camFastFeed: 3000,
        camInnerFirst: true,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(inner.perOp[0]!.estimatedPathSegments).toBeGreaterThan(normal.perOp[0]!.estimatedPathSegments)
  })

  it('camToolInit false lowers segment estimate vs true', () => {
    const geo = makeGeometry()
    const noInit = estimateCamPlaceholderSummary(
      {
        processName: 'ti',
        camFastFeed: 3000,
        camToolInit: false,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4 }],
      } as CamProcessConfig,
      geo,
    )
    const withInit = estimateCamPlaceholderSummary(
      {
        processName: 'ti',
        camFastFeed: 3000,
        camToolInit: true,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4 }],
      } as CamProcessConfig,
      geo,
    )
    expect(noInit.perOp[0]!.estimatedPathSegments).toBeLessThan(withInit.perOp[0]!.estimatedPathSegments)
  })

  it('camOriginTop true slightly increases segment estimate vs false', () => {
    const geo = makeGeometry()
    const zBottomish = estimateCamPlaceholderSummary(
      {
        processName: 'ot',
        camFastFeed: 3000,
        camOriginTop: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const zTop = estimateCamPlaceholderSummary(
      {
        processName: 'ot',
        camFastFeed: 3000,
        camOriginTop: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(zTop.perOp[0]!.estimatedPathSegments).toBeGreaterThan(zBottomish.perOp[0]!.estimatedPathSegments)
  })

  it('lower camFullEngage increases segment estimate vs full engage', () => {
    const geo = makeGeometry()
    const full = estimateCamPlaceholderSummary(
      {
        processName: 'fe',
        camFastFeed: 3000,
        camFullEngage: 1,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const shallow = estimateCamPlaceholderSummary(
      {
        processName: 'fe',
        camFastFeed: 3000,
        camFullEngage: 0.25,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shallow.perOp[0]!.estimatedPathSegments).toBeGreaterThan(full.perOp[0]!.estimatedPathSegments)
  })

  it('camOriginOffX shifts bump segment estimate vs zero offsets', () => {
    const geo = makeGeometry()
    const zero = estimateCamPlaceholderSummary(
      {
        processName: 'or',
        camFastFeed: 3000,
        camOriginOffX: 0,
        camOriginOffY: 0,
        camOriginOffZ: 0,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const shifted = estimateCamPlaceholderSummary(
      {
        processName: 'or',
        camFastFeed: 3000,
        camOriginOffX: 120,
        camOriginOffY: 0,
        camOriginOffZ: 0,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(shifted.perOp[0]!.estimatedPathSegments).toBeGreaterThan(zero.perOp[0]!.estimatedPathSegments)
  })

  it('outputInvertX/Y increase segment estimate vs no axis flip', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'inv',
        camFastFeed: 3000,
        outputInvertX: false,
        outputInvertY: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const flipped = estimateCamPlaceholderSummary(
      {
        processName: 'inv',
        camFastFeed: 3000,
        outputInvertX: true,
        outputInvertY: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(flipped.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('ctOriginCenter applies origin-style segment bump when camOriginCenter is false', () => {
    const geo = makeGeometry()
    const neither = estimateCamPlaceholderSummary(
      {
        processName: 'ct',
        camFastFeed: 3000,
        camOriginCenter: false,
        ctOriginCenter: false,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const deviceCenter = estimateCamPlaceholderSummary(
      {
        processName: 'ct',
        camFastFeed: 3000,
        camOriginCenter: false,
        ctOriginCenter: true,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(deviceCenter.perOp[0]!.estimatedPathSegments).toBeGreaterThan(neither.perOp[0]!.estimatedPathSegments)
  })

  it('camZAnchor top or bottom slightly increases Z span vs middle for pass count', () => {
    const geo = makeGeometry()
    const mid = estimateCamPlaceholderSummary(
      {
        processName: 'za',
        camFastFeed: 3000,
        camZAnchor: 'middle',
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const bottom = estimateCamPlaceholderSummary(
      {
        processName: 'za',
        camFastFeed: 3000,
        camZAnchor: 'bottom',
        camRoughDown: 1,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(bottom.perOp[0]!.estimatedPasses).toBeGreaterThan(mid.perOp[0]!.estimatedPasses)
  })

  it('camZClearance increases segment estimate vs minimal clearance', () => {
    const geo = makeGeometry()
    const low = estimateCamPlaceholderSummary(
      {
        processName: 'zc',
        camFastFeed: 3000,
        camZClearance: 0.5,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4 }],
      } as CamProcessConfig,
      geo,
    )
    const high = estimateCamPlaceholderSummary(
      {
        processName: 'zc',
        camFastFeed: 3000,
        camZClearance: 40,
        ops: [{ type: 'outline' as const, tool: 1, down: 1, step: 0.4 }],
      } as CamProcessConfig,
      geo,
    )
    expect(high.perOp[0]!.estimatedPathSegments).toBeGreaterThan(low.perOp[0]!.estimatedPathSegments)
  })

  it('camTraceBottom increases trace segment estimate vs off', () => {
    const geo = makeGeometry()
    const topOnly = estimateCamPlaceholderSummary(
      {
        processName: 'tb',
        camFastFeed: 3000,
        camTraceBottom: false,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 3, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const withBottom = estimateCamPlaceholderSummary(
      {
        processName: 'tb',
        camFastFeed: 3000,
        camTraceBottom: true,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 3, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(withBottom.perOp[0]!.estimatedPathSegments).toBeGreaterThan(topOnly.perOp[0]!.estimatedPathSegments)
  })

  it('trace per-op traceBottom applies bottom scale when process camTraceBottom is false', () => {
    const geo = makeGeometry()
    const flat = estimateCamPlaceholderSummary(
      {
        processName: 'tb',
        camFastFeed: 3000,
        camTraceBottom: false,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 3, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const opBottom = estimateCamPlaceholderSummary(
      {
        processName: 'tb',
        camFastFeed: 3000,
        camTraceBottom: false,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 3, step: 0.5, traceBottom: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(opBottom.perOp[0]!.estimatedPathSegments).toBeGreaterThan(flat.perOp[0]!.estimatedPathSegments)
  })

  it('helical non-auto camHelicalOffset and CCW bump segment estimate', () => {
    const geo = makeGeometry()
    const autoCw = estimateCamPlaceholderSummary(
      {
        processName: 'hel',
        camFastFeed: 3000,
        camHelicalOffset: 'auto',
        camHelicalClockwise: true,
        ops: [{ type: 'helical' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const fixedCcw = estimateCamPlaceholderSummary(
      {
        processName: 'hel',
        camFastFeed: 3000,
        camHelicalOffset: 'inside',
        camHelicalClockwise: false,
        ops: [{ type: 'helical' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(fixedCcw.perOp[0]!.estimatedPathSegments).toBeGreaterThan(autoCw.perOp[0]!.estimatedPathSegments)
  })

  it('ctOriginBounds with ctOriginOffX increases segment estimate vs bounds off', () => {
    const geo = makeGeometry()
    const plain = estimateCamPlaceholderSummary(
      {
        processName: 'ctb',
        camFastFeed: 3000,
        ctOriginBounds: false,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    const boundsShift = estimateCamPlaceholderSummary(
      {
        processName: 'ctb',
        camFastFeed: 3000,
        ctOriginBounds: true,
        ctOriginOffX: 80,
        ctOriginOffY: 0,
        ops: [{ type: 'contour' as const, tool: 1, down: 2, step: 0.25 }],
      } as CamProcessConfig,
      geo,
    )
    expect(boundsShift.perOp[0]!.estimatedPathSegments).toBeGreaterThan(plain.perOp[0]!.estimatedPathSegments)
  })

  it('pocket per-op expand increases effective step and segment estimate vs zero expand', () => {
    const geo = makeGeometry()
    const tight = estimateCamPlaceholderSummary(
      {
        processName: 'pex',
        camFastFeed: 3000,
        camPocketExpand: 0,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const wide = estimateCamPlaceholderSummary(
      {
        processName: 'pex',
        camFastFeed: 3000,
        camPocketExpand: 0,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, step: 0.5, expand: 6 }],
      } as CamProcessConfig,
      geo,
    )
    expect(wide.perOp[0]!.estimatedPathSegments).toBeGreaterThan(tight.perOp[0]!.estimatedPathSegments)
  })

  it('pocket per-op expand widens default XY step when op.step is omitted', () => {
    const geo = makeGeometry()
    const tight = estimateCamPlaceholderSummary(
      {
        processName: 'pex',
        camFastFeed: 3000,
        camPocketOver: 0.3,
        camPocketExpand: 0,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const wider = estimateCamPlaceholderSummary(
      {
        processName: 'pex',
        camFastFeed: 3000,
        camPocketOver: 0.3,
        camPocketExpand: 0,
        ops: [{ type: 'pocket' as const, tool: 1, down: 2, expand: 5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(wider.perOp[0]!.estimatedPathSegments).toBeLessThan(tight.perOp[0]!.estimatedPathSegments)
  })

  it('camTraceLines or op.lines increases trace segment estimate', () => {
    const geo = makeGeometry()
    const curves = estimateCamPlaceholderSummary(
      {
        processName: 'tl',
        camFastFeed: 3000,
        camTraceLines: false,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const asLines = estimateCamPlaceholderSummary(
      {
        processName: 'tl',
        camFastFeed: 3000,
        camTraceLines: true,
        camTraceType: 'follow',
        ops: [{ type: 'trace' as const, tool: 1, down: 2, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(asLines.perOp[0]!.estimatedPathSegments).toBeGreaterThan(curves.perOp[0]!.estimatedPathSegments)
  })

  it('camRoughIn false increases rough segment estimate vs inside roughing', () => {
    const geo = makeGeometry()
    const inside = estimateCamPlaceholderSummary(
      {
        processName: 'ri',
        camFastFeed: 3000,
        camRoughIn: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    const outside = estimateCamPlaceholderSummary(
      {
        processName: 'ri',
        camFastFeed: 3000,
        camRoughIn: false,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5 }],
      } as CamProcessConfig,
      geo,
    )
    expect(outside.perOp[0]!.estimatedPathSegments).toBeGreaterThan(inside.perOp[0]!.estimatedPathSegments)
  })

  it('rough per-op inside false overrides process camRoughIn for segment estimate', () => {
    const geo = makeGeometry()
    const processInside = estimateCamPlaceholderSummary(
      {
        processName: 'ri',
        camFastFeed: 3000,
        camRoughIn: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5, inside: false }],
      } as CamProcessConfig,
      geo,
    )
    const processAndOpInside = estimateCamPlaceholderSummary(
      {
        processName: 'ri',
        camFastFeed: 3000,
        camRoughIn: true,
        ops: [{ type: 'rough' as const, tool: 1, down: 1, step: 0.5, inside: true }],
      } as CamProcessConfig,
      geo,
    )
    expect(processInside.perOp[0]!.estimatedPathSegments).toBeGreaterThan(
      processAndOpInside.perOp[0]!.estimatedPathSegments,
    )
  })

  it('drill marking mode lowers segment estimate vs peck drilling with dwell', () => {
    const geo = makeGeometry()
    const mark = estimateCamPlaceholderSummary(
      {
        processName: 'dm',
        camFastFeed: 3000,
        camDrillMark: true,
        camDrillThru: 2,
        camDrillDwell: 4000,
        ops: [{ type: 'drill' as const, tool: 1, down: 2 }],
      } as CamProcessConfig,
      geo,
    )
    const peck = estimateCamPlaceholderSummary(
      {
        processName: 'dm',
        camFastFeed: 3000,
        camDrillMark: false,
        camDrillThru: 2,
        camDrillDwell: 4000,
        camDrillLift: 3,
        ops: [{ type: 'drill' as const, tool: 1, down: 2, mark: false }],
      } as CamProcessConfig,
      geo,
    )
    expect(peck.perOp[0]!.estimatedPathSegments).toBeGreaterThan(mark.perOp[0]!.estimatedPathSegments)
  })
})

describe('stripLegacyCamProcessKeys', () => {
  it('removes drillDown when camDrillDown is present', () => {
    const p = { processName: 'x', camDrillDown: 2, drillDown: 2 } as CamProcessConfig
    const s = stripLegacyCamProcessKeys(p)
    expect((s as Record<string, unknown>).drillDown).toBeUndefined()
    expect(s.camDrillDown).toBe(2)
  })

  it('keeps drillDown when canonical is absent', () => {
    const p = { processName: 'x', drillDown: 2 } as CamProcessConfig
    expect((stripLegacyCamProcessKeys(p) as Record<string, unknown>).drillDown).toBe(2)
  })

  it('does not mutate input', () => {
    const p = { processName: 'x', camDrillDown: 1, drillDown: 1 } as CamProcessConfig
    stripLegacyCamProcessKeys(p)
    expect((p as Record<string, unknown>).drillDown).toBe(1)
  })
})

describe('canonicalizeCamProcessConfig', () => {
  it('deep clones and maps legacy-only drillDown to camDrillDown', () => {
    const src = { processName: 'x', drillDown: 2.5, ops: [] } as CamProcessConfig
    const out = canonicalizeCamProcessConfig(src)
    expect(out).not.toBe(src)
    expect(out.camDrillDown).toBe(2.5)
    expect((out as Record<string, unknown>).drillDown).toBeUndefined()
    expect((src as Record<string, unknown>).drillDown).toBe(2.5)
  })

  it('drops duplicate legacy keys after merge', () => {
    const src = { processName: 'x', camDrillDown: 3, drillDown: 3, ops: [] } as CamProcessConfig
    const out = canonicalizeCamProcessConfig(src)
    expect(out.camDrillDown).toBe(3)
    expect((out as Record<string, unknown>).drillDown).toBeUndefined()
  })

  it('maps cmaPocketOutline / cmaPocketRefine to camPocket* and strips typo keys when canonical present', () => {
    const src = {
      processName: 'x',
      cmaPocketOutline: true,
      cmaPocketRefine: 12,
      ops: [],
    } as CamProcessConfig
    const out = canonicalizeCamProcessConfig(src)
    expect(out.camPocketOutline).toBe(true)
    expect(out.camPocketRefine).toBe(12)
    expect((out as Record<string, unknown>).cmaPocketOutline).toBeUndefined()
    expect((out as Record<string, unknown>).cmaPocketRefine).toBeUndefined()
  })

  it('prefers explicit camPocketOutline over cmaPocketOutline when both differ', () => {
    const src = {
      processName: 'x',
      camPocketOutline: false,
      cmaPocketOutline: true,
      ops: [],
    } as CamProcessConfig
    const out = canonicalizeCamProcessConfig(src)
    expect(out.camPocketOutline).toBe(false)
    expect((out as Record<string, unknown>).cmaPocketOutline).toBeUndefined()
  })
})
