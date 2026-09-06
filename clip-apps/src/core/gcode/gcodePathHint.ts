import type { GcodePathBuildResult } from './gcodePathPreview'

/** Human-readable path stats for workspace viewport overlays. */
export function buildGcodePathHint(built: GcodePathBuildResult): string {
  if (built.vertexCount < 2) {
    if (built.skippedArcs > 0 || built.linesScanned > 0) {
      return `无路径点（扫描 ${built.linesScanned} 行 · 未解析圆弧 ${built.skippedArcs}）`
    }
    return ''
  }
  const arcPart =
    built.tessellatedArcs > 0 || built.skippedArcs > 0
      ? ` · 圆弧 ${built.tessellatedArcs}（未解析 ${built.skippedArcs}）`
      : ''
  const movePart =
    built.rapidVertexCount > 0 || built.cutVertexCount > 0
      ? ` · G0 ${built.rapidVertexCount} · G1/G2/G3 ${built.cutVertexCount}`
      : ''
  return `刀路预览 ${built.vertexCount} 点${movePart}${arcPart} · 扫描行 ${built.linesScanned}`
}
