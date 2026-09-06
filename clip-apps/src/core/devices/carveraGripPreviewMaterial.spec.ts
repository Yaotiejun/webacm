import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  createCarveraGripMatcapMaterial,
  isCarveraGripTransparentMesh,
} from './carveraGripPreviewMaterial'

describe('carveraGripPreviewMaterial', () => {
  it('matches carve-control matcap options', () => {
    const mat = createCarveraGripMatcapMaterial(0xdddddd)
    expect(mat).toBeInstanceOf(THREE.MeshMatcapMaterial)
    expect(mat.flatShading).toBe(true)
    expect(mat.side).toBe(THREE.DoubleSide)
    expect(mat.color.getHex()).toBe(0xdddddd)
  })

  it('flags corner/fourth as transparent overlays', () => {
    expect(isCarveraGripTransparentMesh('corner')).toBe(true)
    expect(isCarveraGripTransparentMesh('base')).toBe(false)
  })
})
