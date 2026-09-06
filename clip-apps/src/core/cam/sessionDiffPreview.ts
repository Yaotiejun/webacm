import { getRiskLevelForKey } from './riskRules'

export function summarizePreviewValue(v: unknown): string {
  if (v == null) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'string') return v.length > 32 ? `${v.slice(0, 29)}...` : v
  if (Array.isArray(v)) return `[array:${v.length}]`
  if (typeof v === 'object') return '[object]'
  return String(v)
}

export function buildChangedKeyDiffLines(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  keys: string[],
  limit: number,
): string[] {
  const sortedKeys = [...keys].sort((a, b) => {
    const weight = (k: string) => {
      const level = getRiskLevelForKey(k)
      if (level === 'high') return 0
      if (level === 'medium') return 1
      return 2
    }
    const wa = weight(a)
    const wb = weight(b)
    if (wa !== wb) return wa - wb
    return a.localeCompare(b)
  })
  return sortedKeys.slice(0, limit).map((key) => {
    const a = summarizePreviewValue(current[key])
    const b = summarizePreviewValue(incoming[key])
    const riskLevel = getRiskLevelForKey(key)
    const riskTag = riskLevel === 'high' ? ' !!' : riskLevel === 'medium' ? ' !' : ''
    return `${key}${riskTag}: ${a} -> ${b}`
  })
}

export function formatRiskStatsLine(highRiskCount: number, mediumRiskCount: number): string {
  return `风险统计: 🟥高风险=${highRiskCount}, 🟧中风险=${mediumRiskCount}`
}

export function formatRemainingRiskBreakdown(keys: string[], shownCount: number): string {
  const remainingKeys = keys.slice(shownCount)
  if (!remainingKeys.length) return ''
  const high = remainingKeys.filter((k) => getRiskLevelForKey(k) === 'high').length
  const medium = remainingKeys.filter((k) => getRiskLevelForKey(k) === 'medium').length
  const low = remainingKeys.length - high - medium
  return `\n... +${remainingKeys.length} 项（🟥${high}/🟧${medium}/低${low}）`
}

export function buildOpsApplyDiffPreviewLine(currentOpsLength: number, nextOpsLength: number): string {
  return `ops !!: [array:${currentOpsLength}] -> [array:${nextOpsLength}]`
}

export function countRiskLevels(keys: string[]): { high: number; medium: number; low: number } {
  const high = keys.filter((k) => getRiskLevelForKey(k) === 'high').length
  const medium = keys.filter((k) => getRiskLevelForKey(k) === 'medium').length
  const low = keys.length - high - medium
  return { high, medium, low }
}

export function buildApplyConfirmMessage(field: 'device' | 'process' | 'ops', changeCount: number, changedKeys: string[], diffLines: string[]): string {
  const keyPreview = diffLines.length ? diffLines.join('\n') : '无'
  const riskCounts = countRiskLevels(changedKeys)
  const riskStatsLine = formatRiskStatsLine(riskCounts.high, riskCounts.medium)
  const remainLine = formatRemainingRiskBreakdown(changedKeys, diffLines.length)
  return `即将应用会话包字段: ${field}\n预计影响字段数: ${changeCount}\n${riskStatsLine}\n变更预览:\n${keyPreview}${remainLine}\n是否继续？`
}
