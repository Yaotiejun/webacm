import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  buildSlaLayerVolumeMesh,
  buildSlaSliceOverlay,
  closeSlaPoly,
  countDrawableSlaFills,
  createSlaSliceStack,
  inferSlaOverlayLayerHeight,
} from '@/core/sla/slaSliceOverlay'
import type { SlaLayer } from '@/core/sla/slaLayers'

const sampleLayers: SlaLayer[] = [
  {
    z: 0.5,
    fills: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    ],
  },
  {
    z: 1.5,
    fills: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    ],
  },
  {
    z: 2.5,
    fills: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    ],
  },
]

describe('slaSliceOverlay (Kiri-like stack)', () => {
  it('closes open rings', () => {
    const closed = closeSlaPoly([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ])
    expect(closed.length).toBe(5)
    expect(closed[0]).toEqual(closed[closed.length - 1])
  })

  it('extrudes volume with Three Y = WCS z and Z = WCS y (same as arrange mesh)', () => {
    const mesh = buildSlaLayerVolumeMesh(
      [
        { x: -5, y: -4 },
        { x: 5, y: -4 },
        { x: 5, y: 4 },
        { x: -5, y: 4 },
      ],
      3,
      1,
      0xfcba03,
      0.8,
    )
    expect(mesh).toBeTruthy()
    mesh!.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(mesh!)
    expect(box.min.x).toBeCloseTo(-5, 3)
    expect(box.max.x).toBeCloseTo(5, 3)
    expect(box.min.y).toBeCloseTo(2.5, 3)
    expect(box.max.y).toBeCloseTo(3.5, 3)
    expect(box.min.z).toBeCloseTo(-4, 3)
    expect(box.max.z).toBeCloseTo(4, 3)
  })

  it('builds overlay children for active layer window', () => {
    expect(inferSlaOverlayLayerHeight(sampleLayers)).toBeCloseTo(1, 6)
    expect(countDrawableSlaFills(sampleLayers)).toBe(3)
    const group = new THREE.Group()
    buildSlaSliceOverlay(group, sampleLayers, 1, 1)
    expect(group.children.length).toBeGreaterThan(0)
  })

  it('createSlaSliceStack setRange toggles visibility without rebuild', () => {
    const root = new THREE.Group()
    const stack = createSlaSliceStack(root, sampleLayers, 1)
    stack.setRange(0, 0)
    expect(root.children.filter((c) => c.visible).length).toBe(1)
    stack.setRange(0, 2)
    expect(root.children.filter((c) => c.visible).length).toBe(3)
    stack.setRange(0, 1)
    expect(root.children.filter((c) => c.visible).length).toBe(2)
    // cached: still 3 layer groups under root
    expect(root.children.length).toBe(3)
    stack.dispose()
    expect(root.children.length).toBe(0)
  })
})