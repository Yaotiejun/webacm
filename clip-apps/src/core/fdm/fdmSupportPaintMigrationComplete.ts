/**
 * Fast FDM support-paint migration gate (no legacy slice).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendPaintIfSpaced,
  clonePaintPoints,
  erasePaintNear,
  paintStrokeSpacing,
  type FdmPaintPoint,
} from '@/core/fdm/fdmSupportPaint'

export interface FdmSupportPaintMigrationCompleteResult {
  ok: boolean
  checks: {
    api: boolean
    densify: boolean
    workspaceWired: boolean
  }
  errors: string[]
}

function clipAppsRoot(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    // src/core/fdm → clip-apps
    return resolve(here, '../../..')
  } catch {
    return process.cwd()
  }
}

function resolveFdmWorkspacePath(): string {
  const candidates = [
    resolve(process.cwd(), 'src/views/fdm/FdmWorkspaceView.vue'),
    resolve(clipAppsRoot(), 'src/views/fdm/FdmWorkspaceView.vue'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]!
}

export function evaluateFdmSupportPaintMigrationComplete(): FdmSupportPaintMigrationCompleteResult {
  const errors: string[] = []

  let api = false
  try {
    const list: FdmPaintPoint[] = [{ point: { x: 0, y: 0, z: 0 }, radius: 2 }]
    const cloned = clonePaintPoints(list)
    const appended = appendPaintIfSpaced(cloned, { x: 10, y: 0, z: 0 }, 2)
    const erased = erasePaintNear(cloned, { x: 0, y: 0, z: 0 }, 2)
    api = appended === true && erased.length === 1 && erased[0]!.point.x === 10
    if (!api) errors.push('fdmSupportPaint api (append/erase/clone) failed')
  } catch (e) {
    errors.push(`fdmSupportPaint api threw: ${e instanceof Error ? e.message : String(e)}`)
  }

  let densify = false
  try {
    const list: FdmPaintPoint[] = []
    const r = 2.5
    const sp = paintStrokeSpacing(r)
    appendPaintIfSpaced(list, { x: 0, y: 0, z: 0 }, r, sp)
    appendPaintIfSpaced(list, { x: sp * 1.5, y: 0, z: 0 }, r, sp)
    appendPaintIfSpaced(list, { x: sp * 3, y: 0, z: 0 }, r, sp)
    densify = list.length >= 3
    if (!densify) errors.push(`densify expected >=3 points, got ${list.length}`)
  } catch (e) {
    errors.push(`densify threw: ${e instanceof Error ? e.message : String(e)}`)
  }

  let workspaceWired = false
  try {
    const path = resolveFdmWorkspacePath()
    const src = readFileSync(path, 'utf8')
    const hasMode = src.includes('supportPaintMode')
    const hasPaintToSlice =
      src.includes('paint: clonePaintPoints') ||
      (/paint:\s*/.test(src) && src.includes('clonePaintPoints(m.paint)'))
    workspaceWired = hasMode && hasPaintToSlice
    if (!workspaceWired) {
      errors.push(
        `FdmWorkspaceView wiring missing (supportPaintMode=${hasMode}, paintSlice=${hasPaintToSlice})`,
      )
    }
  } catch (e) {
    errors.push(`workspaceWired failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    ok: errors.length === 0,
    checks: { api, densify, workspaceWired },
    errors,
  }
}
