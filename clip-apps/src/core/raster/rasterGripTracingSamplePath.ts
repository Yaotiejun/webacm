/**
 * grip `path-tracing.js` `samplePath` — uniform step along segments (no corner densification).
 * shape_cam worker uses `sampleTracingPolyline` (adaptive corners); this is the parity baseline.
 */
export function sampleTracingPathGripStep(
  points: ReadonlyArray<readonly [number, number]>,
  step: number,
): Array<[number, number]> {
  if (points.length < 2) return points.map((p) => [p[0], p[1]] as [number, number])
  const safeStep = Math.max(1e-6, step)
  const out: Array<[number, number]> = [[points[0]![0], points[0]![1]]]

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i]!
    const [x2, y2] = points[i + 1]!
    const dx = x2 - x1
    const dy = y2 - y1
    const segmentLength = Math.hypot(dx, dy)
    if (segmentLength > safeStep) {
      const numSubmotion = Math.ceil(segmentLength / safeStep)
      for (let j = 1; j < numSubmotion; j += 1) {
        const t = j / numSubmotion
        out.push([x1 + t * dx, y1 + t * dy])
      }
    }
    out.push([x2, y2])
  }
  return out
}

export function countTracingPathPoints(paths: ReadonlyArray<ReadonlyArray<readonly [number, number]>>): number {
  let n = 0
  for (const p of paths) n += p.length
  return n
}
