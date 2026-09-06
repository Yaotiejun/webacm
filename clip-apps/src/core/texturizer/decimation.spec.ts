import { describe, expect, it } from 'vitest'
import {
  decimateTrianglesClustered,
  decimateTrianglesClusteredDetailed,
  resolveAdaptiveSearchConfig,
} from './decimation'

function buildGridTriangles(nx: number, ny: number): Float32Array {
  const out: number[] = []
  for (let y = 0; y < ny - 1; y += 1) {
    for (let x = 0; x < nx - 1; x += 1) {
      const x0 = x
      const y0 = y
      const x1 = x + 1
      const y1 = y + 1
      out.push(
        x0, y0, 0,
        x1, y0, 0,
        x1, y1, 0,
        x0, y0, 0,
        x1, y1, 0,
        x0, y1, 0,
      )
    }
  }
  return new Float32Array(out)
}

describe('resolveAdaptiveSearchConfig', () => {
  it('lowers stagnation-retry triangle floor as mesh grows (easier to qualify on large meshes)', () => {
    const small = resolveAdaptiveSearchConfig(1600, 0.5)
    const large = resolveAdaptiveSearchConfig(8000, 0.5)
    expect(large.stagnationRetryMinTri).toBeLessThanOrEqual(small.stagnationRetryMinTri)
  })

  it('raises stagnation-retry relative gap floor when decimation is milder (higher ratio)', () => {
    const aggressive = resolveAdaptiveSearchConfig(4000, 0.12)
    const mild = resolveAdaptiveSearchConfig(4000, 0.95)
    expect(mild.stagnationRetryMinRelMiss).toBeGreaterThan(aggressive.stagnationRetryMinRelMiss)
  })
})

describe('decimateTrianglesClustered', () => {
  it('returns original mesh near ratio=1', () => {
    const mesh = buildGridTriangles(6, 6)
    const out = decimateTrianglesClustered(mesh, 1)
    expect(out.length).toBe(mesh.length)
  })

  it('reduces triangle count for lower ratio', () => {
    const mesh = buildGridTriangles(12, 12)
    const triBefore = Math.floor(mesh.length / 9)
    const out = decimateTrianglesClustered(mesh, 0.4)
    const triAfter = Math.floor(out.length / 9)
    expect(triAfter).toBeLessThan(triBefore)
    expect(triAfter).toBeGreaterThan(0)
  })

  it('roughly approaches target count', () => {
    const mesh = buildGridTriangles(20, 20)
    const triBefore = Math.floor(mesh.length / 9)
    const ratio = 0.3
    const target = Math.max(1, Math.floor(triBefore * ratio))
    const out = decimateTrianglesClustered(mesh, ratio)
    const triAfter = Math.floor(out.length / 9)
    expect(Math.abs(triAfter - target)).toBeLessThanOrEqual(Math.ceil(target * 0.2))
  })

  it('caps overshoot with distributed downsample fallback', () => {
    const mesh = buildGridTriangles(32, 32)
    const triBefore = Math.floor(mesh.length / 9)
    const ratio = 0.12
    const target = Math.max(1, Math.floor(triBefore * ratio))
    const out = decimateTrianglesClustered(mesh, ratio)
    const triAfter = Math.floor(out.length / 9)
    expect(triAfter).toBeLessThanOrEqual(Math.ceil(target * 1.12))
  })

  it('keeps low-ratio target approximation stable on larger meshes', () => {
    const mesh = buildGridTriangles(48, 48)
    const triBefore = Math.floor(mesh.length / 9)
    const ratio = 0.08
    const target = Math.max(1, Math.floor(triBefore * ratio))
    const out = decimateTrianglesClustered(mesh, ratio)
    const triAfter = Math.floor(out.length / 9)
    expect(triAfter).toBeGreaterThan(0)
    expect(Math.abs(triAfter - target)).toBeLessThanOrEqual(Math.ceil(target * 0.35))
  })

  it('reports monotonic progress and reaches completion with adaptive early-stop', () => {
    const mesh = buildGridTriangles(40, 40)
    const progress: number[] = []
    decimateTrianglesClustered(mesh, 0.1, (p) => {
      progress.push(p)
    })
    expect(progress.length).toBeGreaterThan(0)
    for (let i = 1; i < progress.length; i += 1) {
      expect((progress[i] ?? 0) + 1e-9).toBeGreaterThanOrEqual(progress[i - 1] ?? 0)
    }
    expect(progress[progress.length - 1]).toBe(1)
  })

  it('runs qem-lite path on small meshes', () => {
    const mesh = buildGridTriangles(8, 8)
    const before = Math.floor(mesh.length / 9)
    const out = decimateTrianglesClustered(mesh, 0.6)
    const after = Math.floor(out.length / 9)
    expect(after).toBeGreaterThan(0)
    expect(after).toBeLessThan(before)
  })

  it('emits search meta for clustered path', () => {
    const mesh = buildGridTriangles(36, 36)
    const triBefore = Math.floor(mesh.length / 9)
    const ratio = 0.14
    const target = Math.max(1, Math.floor(triBefore * ratio))
    const out = decimateTrianglesClusteredDetailed(mesh, ratio)
    expect(out.searchMeta).toBeDefined()
    expect((out.searchMeta?.binaryItersExecuted ?? 0)).toBeGreaterThanOrEqual(0)
    expect((out.searchMeta?.binaryItersExecuted ?? 0)).toBeLessThanOrEqual(out.searchMeta?.binaryItersPlanned ?? 0)
    expect(['target-close', 'stagnation', 'stagnation-retry', 'max-iters', 'not-applicable']).toContain(
      out.searchMeta?.earlyStopReason
    )
    expect((out.searchMeta?.finalDiff ?? Infinity)).toBeLessThanOrEqual(Math.ceil(target * 0.4))
  })
})
