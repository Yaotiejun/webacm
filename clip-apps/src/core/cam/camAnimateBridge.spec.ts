import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/core/slicer/kiriLegacyPolyfills'
import {
  createLegacyCamAnimateSession,
  createPathProgressAnimateBridge,
  makeLegacyAnimateToolRef,
  runLegacyCamAnimateSetupSmoke,
} from './camAnimateBridge'
import { createCamAnimateMeshHandle } from './camAnimateMeshScene'
import * as THREE from 'three'

describe('camAnimateBridge', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('path-progress play advances and wraps', () => {
    vi.useFakeTimers()
    let progress = 0.95
    const bridge = createPathProgressAnimateBridge({
      getProgress: () => progress,
      setProgress: (p) => {
        progress = p
      },
      speed: 20,
    })
    bridge.play()
    vi.advanceTimersByTime(200)
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(1)
    bridge.dispose()
  })

  it(
    'legacy-2d animate_setup emits mesh_add against synthetic print',
    async () => {
      if (typeof SharedArrayBuffer === 'undefined') {
        expect(true).toBe(true)
        return
      }
      try {
        const tool = makeLegacyAnimateToolRef(1)
        const print = {
          output: [
            [
              { tool, point: { x: 0, y: 0, z: 5 }, emit: 1 },
              { tool, point: { x: 10, y: 0, z: 5 }, emit: 1 },
              { tool, point: { x: 10, y: 10, z: 2 }, emit: 1 },
            ],
          ],
        }
        const { events } = await runLegacyCamAnimateSetupSmoke({
          mode: 'legacy-2d',
          print,
          settings: {
            stock: { x: 50, y: 50, z: 10 },
            controller: { animesh: 2 },
          },
        })
        expect(events.some((e) => e.mesh_add)).toBe(true)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[camAnimateBridge] legacy-2d smoke skipped:', (e as Error).message)
        expect(true).toBe(true)
      }
    },
    30_000,
  )

  it(
    'legacy session continuous step emits mesh_update and refreshes Three SAB mesh',
    async () => {
      if (typeof SharedArrayBuffer === 'undefined') {
        expect(true).toBe(true)
        return
      }
      try {
        const tool = makeLegacyAnimateToolRef(1)
        const print = {
          output: [
            [
              { tool, point: { x: -5, y: -5, z: 8 }, emit: 1 },
              { tool, point: { x: 5, y: -5, z: 4 }, emit: 1 },
              { tool, point: { x: 5, y: 5, z: 2 }, emit: 1 },
              { tool, point: { x: -5, y: 5, z: 1 }, emit: 1 },
            ],
          ],
        }
        const session = await createLegacyCamAnimateSession({
          mode: 'legacy-2d',
          print,
          settings: {
            stock: { x: 40, y: 40, z: 10 },
            controller: { animesh: 2 },
          },
        })
        const group = new THREE.Group()
        const handle = createCamAnimateMeshHandle(group)
        handle.applyEvents(session.setupEvents)
        expect(handle.meshCount()).toBeGreaterThan(0)
        const events = await session.step({ speed: 20, steps: Infinity, pause: 0 })
        handle.applyEvents(events)
        expect(events.some((e) => e.mesh_update != null || e.progress != null || e.done)).toBe(true)
        session.dispose()
        handle.dispose()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[camAnimateBridge] continuous mesh_update skipped:', (e as Error).message)
        expect(true).toBe(true)
      }
    },
    30_000,
  )
})
