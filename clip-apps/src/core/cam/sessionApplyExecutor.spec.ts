import { describe, expect, it } from 'vitest'
import { applySessionFieldToState } from './sessionApplyExecutor'

describe('cam.sessionApplyExecutor', () => {
  it('applies device/process fields and resets ops when process snapshot has no ops', () => {
    const state = {
      device: { deviceName: 'A' } as Record<string, unknown>,
      process: { camZBottom: 0 } as Record<string, unknown>,
      localOps: [{ type: 'rough' }] as any,
    }
    expect(
      applySessionFieldToState('device', { device: { deviceName: 'B' } }, state).applied,
    ).toBe(true)
    expect(state.device.deviceName).toBe('B')

    expect(
      applySessionFieldToState('process', { process: { camZBottom: -1 } as Record<string, unknown> }, state).applied,
    ).toBe(true)
    expect(state.process.camZBottom).toBe(-1)
    expect(state.localOps).toBeNull()
  })

  it('applies ops as cloned array', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: {} as Record<string, unknown>,
      localOps: null as any,
    }
    const ops = [{ type: 'rough', tool: 1 }] as any[]
    expect(applySessionFieldToState('ops', { process: { ops } as any }, state).applied).toBe(true)
    expect(state.localOps).toEqual(ops)
    expect(state.localOps).not.toBe(ops)
  })

  it('deep clones nested process/ops payloads to avoid shared references', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: {} as Record<string, unknown>,
      localOps: null as any,
    }
    const profile = {
      process: {
        camZBottom: -1,
        nested: { a: 1 },
        ops: [{ type: 'rough', params: { depth: 2 } }],
      } as any,
    }
    applySessionFieldToState('process', profile, state)
    applySessionFieldToState('ops', profile, state)

    ;(profile.process.nested as any).a = 9
    ;(profile.process.ops[0].params as any).depth = 7

    expect((state.process.nested as any).a).toBe(1)
    expect((state.localOps[0].params as any).depth).toBe(2)
  })

  it('merges legacy process keys into canonical fields (drillDown → camDrillDown)', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: {} as Record<string, unknown>,
      localOps: null as any,
    }
    expect(
      applySessionFieldToState(
        'process',
        { process: { processName: 's', drillDown: 2 } as Record<string, unknown> },
        state,
      ).applied,
    ).toBe(true)
    expect(state.process.camDrillDown).toBe(2)
  })

  it('applying process strips duplicate legacy keys on merged workspace state', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: {
        processName: 'cur',
        camFastFeed: 2000,
        camDrillDown: 2,
        drillDown: 2,
      } as Record<string, unknown>,
      localOps: null as any,
    }
    expect(
      applySessionFieldToState(
        'process',
        {
          process: {
            processName: 'cur',
            camFastFeed: 2000,
            camDrillDown: 2,
          } as Record<string, unknown>,
        },
        state,
      ).applied,
    ).toBe(true)
    expect(state.process.drillDown).toBeUndefined()
    expect(state.process.camDrillDown).toBe(2)
  })

  it('merges cmaPocket* from snapshot into camPocket* and strips typo keys', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: { processName: 'p' } as Record<string, unknown>,
      localOps: null as any,
    }
    expect(
      applySessionFieldToState(
        'process',
        {
          process: {
            processName: 'p',
            cmaPocketOutline: true,
            cmaPocketRefine: 11,
          } as Record<string, unknown>,
        },
        state,
      ).applied,
    ).toBe(true)
    expect(state.process.camPocketOutline).toBe(true)
    expect(state.process.camPocketRefine).toBe(11)
    expect((state.process as Record<string, unknown>).cmaPocketOutline).toBeUndefined()
    expect((state.process as Record<string, unknown>).cmaPocketRefine).toBeUndefined()
  })

  it('merges roughingDown-only snapshot into camRoughDown', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: { processName: 'p' } as Record<string, unknown>,
      localOps: null as any,
    }
    expect(
      applySessionFieldToState(
        'process',
        { process: { processName: 'p', roughingDown: 2.5 } as Record<string, unknown> },
        state,
      ).applied,
    ).toBe(true)
    expect(state.process.camRoughDown).toBe(2.5)
    expect((state.process as Record<string, unknown>).roughingDown).toBeUndefined()
  })

  it('clears localOps when process snapshot omits ops key', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: { camZBottom: 0 } as Record<string, unknown>,
      localOps: [{ type: 'rough' }] as any,
    }
    applySessionFieldToState('process', { process: { camZBottom: -1 } as Record<string, unknown> }, state)
    expect(state.localOps).toBeNull()
  })

  it('does not clear localOps when process snapshot includes ops key (even empty)', () => {
    const state = {
      device: {} as Record<string, unknown>,
      process: { camZBottom: 0 } as Record<string, unknown>,
      localOps: [{ type: 'rough' }] as any,
    }
    applySessionFieldToState(
      'process',
      { process: { camZBottom: -1, ops: [] } as Record<string, unknown> },
      state,
    )
    expect(state.localOps).toEqual([{ type: 'rough' }])
  })
})
