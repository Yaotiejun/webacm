import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import { camProcessFieldsEqual } from './camProcessFieldsEqual'
import { getRiskLevelForKey } from './riskRules'
import type { DiffKey } from './sessionDiffApply'
import { stableJsonEqual } from '@/core/stableJson'
import { canonicalizeCamProcessConfig } from './camJobSummaryBridge'

export interface DiffItem {
  key: DiffKey
  label: string
  riskLevel?: 'high' | 'medium' | 'low'
  current: string
  snapshot: string
}

export interface SessionSnapshotDiffInput {
  current: {
    deviceName?: string
    process: CamProcessConfig
    localOps: CamOperationInstance[] | null
  }
  snapshot: {
    deviceName?: string
    process: CamProcessConfig
  }
}

function formatProcessFieldValue(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v)
      return s.length > 200 ? `${s.slice(0, 197)}…` : s
    } catch {
      return String(v)
    }
  }
  return String(v)
}

export function buildSessionSnapshotDiffItems(input: SessionSnapshotDiffInput): DiffItem[] {
  const items: DiffItem[] = []
  const cur = input.current
  const snap = input.snapshot

  const cmpVal = (label: DiffKey, a: unknown, b: unknown) => {
    if (a !== b) {
      items.push({
        key: label,
        label,
        riskLevel: getRiskLevelForKey(label),
        current: String(a ?? '—'),
        snapshot: String(b ?? '—'),
      })
    }
  }

  cmpVal('deviceName', cur.deviceName, snap.deviceName)
  const curP = canonicalizeCamProcessConfig(cur.process)
  const snapP = canonicalizeCamProcessConfig(snap.process)
  const curRec = curP as Record<string, unknown>
  const snapRec = snapP as Record<string, unknown>
  const keys = [...new Set([...Object.keys(curRec), ...Object.keys(snapRec)])]
    .filter((k) => k !== 'ops' && k !== 'deviceName')
    .sort()
  for (const label of keys) {
    const a = curRec[label]
    const b = snapRec[label]
    if (a === undefined && b === undefined) continue
    if (camProcessFieldsEqual(a, b)) continue
    items.push({
      key: label,
      label,
      riskLevel: getRiskLevelForKey(label),
      current: formatProcessFieldValue(a),
      snapshot: formatProcessFieldValue(b),
    })
  }

  const curOps = cur.localOps ?? cur.process.ops ?? []
  const snapOps = snapP.ops ?? []
  if (curOps.length !== snapOps.length) {
    items.push({
      key: 'ops',
      label: 'ops.length',
      riskLevel: getRiskLevelForKey('ops'),
      current: String(curOps.length),
      snapshot: String(snapOps.length),
    })
  }
  const curTypes = curOps.map((o) => o.type).join('>')
  const snapTypes = snapOps.map((o) => o.type).join('>')
  if (curTypes !== snapTypes) {
    items.push({
      key: 'ops',
      label: 'ops.types',
      riskLevel: getRiskLevelForKey('ops'),
      current: curTypes || '—',
      snapshot: snapTypes || '—',
    })
  }
  if (curOps.length === snapOps.length && curTypes === snapTypes) {
    let changedOps = 0
    for (let i = 0; i < curOps.length; i += 1) {
      if (!stableJsonEqual(curOps[i], snapOps[i])) changedOps += 1
    }
    if (changedOps > 0) {
      items.push({
        key: 'ops',
        label: 'ops.detail',
        riskLevel: getRiskLevelForKey('ops'),
        current: `${changedOps} changed`,
        snapshot: 'baseline',
      })
    }
  }
  return items
}
