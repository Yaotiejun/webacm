import { describe, expect, it } from 'vitest'
import { runLegacyFdmSliceBridge } from './kiriLegacyBridge'

describe('slicer.kiriLegacyBridge', () => {
  it('runs bridge and restores worker scope', async () => {
    const scope: any = { kiri_worker: { old: true } }
    const out = await runLegacyFdmSliceBridge({
      settings: {},
      vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
      points: [{ x: 0, y: 0, z: 0 }],
      fdmSliceImpl: (_settings, widget, _onupdate, ondone) => {
        widget.slices = [
          {
            z: 0.2,
            tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }] }] }],
          },
        ]
        ondone(null)
      },
      workerScope: scope,
    })
    // Bounds come from slice paths (+ Kiri-style pad), not mesh AABB.
    expect(out.bounds.maxX).toBe(10.5)
    expect(out.layers.length).toBe(1)
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('propagates async slice failure and still restores worker scope', async () => {
    const scope: any = { kiri_worker: { old: true } }
    await expect(
      runLegacyFdmSliceBridge({
        settings: {},
        vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
        points: [{ x: 0, y: 0, z: 0 }],
        fdmSliceImpl: (_settings, _widget, _onupdate, ondone) => {
          ondone(new Error('slice failed'))
        },
        workerScope: scope,
      }),
    ).rejects.toThrow('slice failed')
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('propagates sync throw from slice implementation and restores worker scope', async () => {
    const scope: any = { kiri_worker: { old: true } }
    await expect(
      runLegacyFdmSliceBridge({
        settings: {},
        vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
        points: [{ x: 0, y: 0, z: 0 }],
        fdmSliceImpl: () => {
          throw new Error('sync failure')
        },
        workerScope: scope,
      }),
    ).rejects.toThrow('sync failure')
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('fails fast on slice timeout and restores worker scope', async () => {
    const scope: any = { kiri_worker: { old: true } }
    await expect(
      runLegacyFdmSliceBridge({
        settings: {},
        vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
        points: [{ x: 0, y: 0, z: 0 }],
        fdmSliceImpl: () => {
          // Intentionally never calls ondone.
        },
        workerScope: scope,
        timeoutMs: 50,
      }),
    ).rejects.toThrow('legacy slice timeout')
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('treats repeated ondone calls as idempotent and keeps first completion', async () => {
    const scope: any = { kiri_worker: { old: true } }
    const out = await runLegacyFdmSliceBridge({
      settings: {},
      vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
      points: [{ x: 0, y: 0, z: 0 }],
      fdmSliceImpl: (_settings, widget, _onupdate, ondone) => {
        widget.slices = [
          {
            z: 0.2,
            tops: [{ shells: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }] }] }],
          },
        ]
        ondone(null)
        // Simulate buggy legacy implementation double-calling completion.
        ondone(new Error('late failure should be ignored'))
      },
      workerScope: scope,
    })
    expect(out.layers.length).toBe(1)
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('normalizes non-Error ondone failure and restores worker scope', async () => {
    const scope: any = { kiri_worker: { old: true } }
    await expect(
      runLegacyFdmSliceBridge({
        settings: {},
        vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
        points: [{ x: 0, y: 0, z: 0 }],
        fdmSliceImpl: (_settings, _widget, _onupdate, ondone) => {
          ondone('plain failure')
        },
        workerScope: scope,
      }),
    ).rejects.toThrow('plain failure')
    expect(scope.kiri_worker).toEqual({ old: true })
  })

  it('merges device extruders when settings omit them', async () => {
    const scope: any = { kiri_worker: { old: true } }
    let seenDevice: unknown
    await runLegacyFdmSliceBridge({
      settings: {
        process: {
          processName: 't',
          sliceHeight: 0.2,
          firstSliceHeight: 0.2,
          sliceLineWidth: 0.4,
          sliceFillType: 'linear',
        },
        device: { bedWidth: 100 },
      },
      vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 2 },
      points: [{ x: 0, y: 0, z: 0 }],
      fdmSliceImpl: (settings, widget, _onupdate, ondone) => {
        seenDevice = settings.device
        widget.slices = []
        ondone(null)
      },
      workerScope: scope,
    })
    expect((seenDevice as { extruders: unknown[] }).extruders.length).toBeGreaterThan(0)
  })

  it('clamps timeout lower bound to 50ms', async () => {
    const scope: any = { kiri_worker: { old: true } }
    await expect(
      runLegacyFdmSliceBridge({
        settings: {},
        vb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
        points: [{ x: 0, y: 0, z: 0 }],
        fdmSliceImpl: () => {},
        workerScope: scope,
        timeoutMs: 1,
      }),
    ).rejects.toThrow('50ms')
    expect(scope.kiri_worker).toEqual({ old: true })
  })
})
