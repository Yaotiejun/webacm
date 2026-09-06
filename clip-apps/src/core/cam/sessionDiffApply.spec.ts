import { describe, expect, it } from 'vitest'
import type { CamProcessConfig } from '@/types/cam'
import { applyDiffKeyToState } from './sessionDiffApply'

describe('cam.sessionDiffApply', () => {
  it('applies scalar process/device fields', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camZBottom: 0, camFastFeed: 1000 },
      localOps: null as any,
    }
    const source = {
      deviceName: 'B',
      process: { camZBottom: -1, camFastFeed: 900 },
    }
    expect(applyDiffKeyToState('deviceName', source, state).applied).toBe(true)
    expect(state.device.deviceName).toBe('B')
    expect(applyDiffKeyToState('camZBottom', source, state).applied).toBe(true)
    expect(state.process.camZBottom).toBe(-1)
  })

  it('applies camDrillDown from snapshot source', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camDrillDown: 1 },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camDrillDown: 2.5 },
    }
    expect(applyDiffKeyToState('camDrillDown', source, state).applied).toBe(true)
    expect(state.process.camDrillDown).toBe(2.5)
  })

  it('applies camTolerance and camStockOn', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camTolerance: 0.1, camStockOn: true },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camTolerance: 0.02, camStockOn: false },
    }
    expect(applyDiffKeyToState('camTolerance', source, state).applied).toBe(true)
    expect(state.process.camTolerance).toBe(0.02)
    expect(applyDiffKeyToState('camStockOn', source, state).applied).toBe(true)
    expect(state.process.camStockOn).toBe(false)
  })

  it('applies camZThru, camZOffset, and camOriginTop', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camZThru: 0, camZOffset: 0, camOriginTop: true },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camZThru: 2, camZOffset: -0.1, camOriginTop: false },
    }
    expect(applyDiffKeyToState('camZThru', source, state).applied).toBe(true)
    expect(state.process.camZThru).toBe(2)
    expect(applyDiffKeyToState('camZOffset', source, state).applied).toBe(true)
    expect(state.process.camZOffset).toBe(-0.1)
    expect(applyDiffKeyToState('camOriginTop', source, state).applied).toBe(true)
    expect(state.process.camOriginTop).toBe(false)
  })

  it('applies camZTop, camOriginCenter, and stock option booleans', () => {
    const state = {
      device: { deviceName: 'A' },
      process: {
        camZTop: 0,
        camOriginCenter: false,
        camStockOffset: true,
        camStockClipTo: false,
        camDepthFirst: true,
      },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: {
        camZTop: 1,
        camOriginCenter: true,
        camStockOffset: false,
        camStockClipTo: true,
        camDepthFirst: false,
      },
    }
    expect(applyDiffKeyToState('camZTop', source, state).applied).toBe(true)
    expect(state.process.camZTop).toBe(1)
    expect(applyDiffKeyToState('camOriginCenter', source, state).applied).toBe(true)
    expect(state.process.camOriginCenter).toBe(true)
    expect(applyDiffKeyToState('camStockOffset', source, state).applied).toBe(true)
    expect(state.process.camStockOffset).toBe(false)
    expect(applyDiffKeyToState('camStockClipTo', source, state).applied).toBe(true)
    expect(state.process.camStockClipTo).toBe(true)
    expect(applyDiffKeyToState('camDepthFirst', source, state).applied).toBe(true)
    expect(state.process.camDepthFirst).toBe(false)
  })

  it('applies camOriginOffX/Y/Z and camExpertFast', () => {
    const state = {
      device: { deviceName: 'A' },
      process: {
        camOriginOffX: 0,
        camOriginOffY: 0,
        camOriginOffZ: 0,
        camExpertFast: false,
      },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: {
        camOriginOffX: 10,
        camOriginOffY: -5,
        camOriginOffZ: 1,
        camExpertFast: true,
      },
    }
    expect(applyDiffKeyToState('camOriginOffX', source, state).applied).toBe(true)
    expect(state.process.camOriginOffX).toBe(10)
    expect(applyDiffKeyToState('camOriginOffY', source, state).applied).toBe(true)
    expect(state.process.camOriginOffY).toBe(-5)
    expect(applyDiffKeyToState('camOriginOffZ', source, state).applied).toBe(true)
    expect(state.process.camOriginOffZ).toBe(1)
    expect(applyDiffKeyToState('camExpertFast', source, state).applied).toBe(true)
    expect(state.process.camExpertFast).toBe(true)
  })

  it('applies camArcEnabled, camFirstZMax, and ctOrigin fields', () => {
    const state = {
      device: { deviceName: 'A' },
      process: {
        camArcEnabled: false,
        camFirstZMax: false,
        ctOriginCenter: false,
        ctOriginBounds: false,
        ctOriginOffX: 0,
        ctOriginOffY: 0,
      },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: {
        camArcEnabled: true,
        camFirstZMax: true,
        ctOriginCenter: true,
        ctOriginBounds: true,
        ctOriginOffX: 5,
        ctOriginOffY: -3,
      },
    }
    expect(applyDiffKeyToState('camArcEnabled', source, state).applied).toBe(true)
    expect(state.process.camArcEnabled).toBe(true)
    expect(applyDiffKeyToState('camFirstZMax', source, state).applied).toBe(true)
    expect(state.process.camFirstZMax).toBe(true)
    expect(applyDiffKeyToState('ctOriginCenter', source, state).applied).toBe(true)
    expect(state.process.ctOriginCenter).toBe(true)
    expect(applyDiffKeyToState('ctOriginBounds', source, state).applied).toBe(true)
    expect(state.process.ctOriginBounds).toBe(true)
    expect(applyDiffKeyToState('ctOriginOffX', source, state).applied).toBe(true)
    expect(state.process.ctOriginOffX).toBe(5)
    expect(applyDiffKeyToState('ctOriginOffY', source, state).applied).toBe(true)
    expect(state.process.ctOriginOffY).toBe(-3)
  })

  it('applies outputInvert* and camArcTolerance / camArcResolution', () => {
    const state = {
      device: { deviceName: 'A' },
      process: {
        outputInvertX: false,
        outputInvertY: true,
        camArcTolerance: 0.01,
        camArcResolution: 45,
      },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: {
        outputInvertX: true,
        outputInvertY: false,
        camArcTolerance: 0.05,
        camArcResolution: 120,
      },
    }
    expect(applyDiffKeyToState('outputInvertX', source, state).applied).toBe(true)
    expect(state.process.outputInvertX).toBe(true)
    expect(applyDiffKeyToState('outputInvertY', source, state).applied).toBe(true)
    expect(state.process.outputInvertY).toBe(false)
    expect(applyDiffKeyToState('camArcTolerance', source, state).applied).toBe(true)
    expect(state.process.camArcTolerance).toBe(0.05)
    expect(applyDiffKeyToState('camArcResolution', source, state).applied).toBe(true)
    expect(state.process.camArcResolution).toBe(120)
  })

  it('applies any canonical process field by key (generic path)', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camFlatness: 0.1 } as CamProcessConfig,
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camFlatness: 0.2 } as CamProcessConfig,
    }
    expect(applyDiffKeyToState('camFlatness', source, state).applied).toBe(true)
    expect(state.process.camFlatness).toBe(0.2)
  })

  it('applies ops with selection-reset hint', () => {
    const state = {
      device: { deviceName: 'A' },
      process: {},
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { ops: [{ type: 'rough', tool: 1 }] as any[] },
    }
    const out = applyDiffKeyToState('ops', source, state)
    expect(out.applied).toBe(true)
    expect(out.resetSelectedOp).toBe(true)
    expect(state.localOps).toEqual(source.process.ops)
    expect(state.localOps).not.toBe(source.process.ops)
  })

  it('deletes process key when snapshot source omits that field', () => {
    const state = {
      device: { deviceName: 'A' },
      process: { camPocketRefine: 20, camRoughDown: 3 },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camRoughDown: 3 },
    }
    expect(applyDiffKeyToState('camPocketRefine', source, state).applied).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(state.process, 'camPocketRefine')).toBe(false)
  })

  it('clones object/array process values so state is not aliased to source', () => {
    const filter = [{ k: 1 }]
    const state = {
      device: { deviceName: 'A' },
      process: { camContourFilter: [] as unknown[] },
      localOps: null as any,
    }
    const source = {
      deviceName: 'A',
      process: { camContourFilter: filter },
    }
    applyDiffKeyToState('camContourFilter', source, state)
    const applied = (state.process as Record<string, unknown>).camContourFilter as unknown[]
    expect(applied).toEqual(filter)
    expect(applied).not.toBe(filter)
    applied.push({ k: 2 })
    expect((source.process as Record<string, unknown>).camContourFilter).toEqual([{ k: 1 }])
  })
})
