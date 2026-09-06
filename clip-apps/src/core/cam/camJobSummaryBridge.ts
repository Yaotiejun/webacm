import type { CamJobInputGeometry, CamJobSummary, CamOpStepSummary } from '@/types/camJob'
import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import { clonePlain } from '@/core/clonePlain'

/**
 * Legacy JSON keys → canonical `CamProcessConfig` (grip `conf.js` `renamed`; parity in **`camLegacyRenamedParity.spec.ts`** via line-regex parse, no eval). Copies only when the
 * canonical field is `undefined` so explicit `false` / `0` on canonical keys wins.
 */
export const LEGACY_CAM_PROCESS_FIELD_ALIASES: Readonly<Record<string, keyof CamProcessConfig>> = {
  camWideCutout: 'camOutlineWide',
  drillDown: 'camDrillDown',
  drillDownSpeed: 'camDrillDownSpeed',
  drillDwell: 'camDrillDwell',
  drillingOn: 'camDrillingOn',
  drillLift: 'camDrillLift',
  drillSpindle: 'camDrillSpindle',
  drillTool: 'camDrillTool',
  finishingDown: 'camOutlineDown',
  finishingOn: 'camOutlineOn',
  finishingOver: 'camContourOver',
  finishingPlunge: 'camOutlinePlunge',
  finishingSpeed: 'camOutlineSpeed',
  finishingSpindle: 'camOutlineSpindle',
  finishingTool: 'camOutlineTool',
  finishingXOn: 'camContourXOn',
  finishingYOn: 'camContourYOn',
  outputClockwise: 'camConventional',
  roughingDown: 'camRoughDown',
  roughingOn: 'camRoughOn',
  roughingOver: 'camRoughOver',
  roughingPlunge: 'camRoughPlunge',
  roughingPocket: 'camRoughVoid',
  roughingSpeed: 'camRoughSpeed',
  roughingSpindle: 'camRoughSpindle',
  roughingStock: 'camRoughStock',
  roughingTool: 'camRoughTool',
  /** Grip / device JSON typo (`Makera.Carvera.json`); bridge reads both in placeholder math. */
  cmaPocketOutline: 'camPocketOutline',
  cmaPocketRefine: 'camPocketRefine',
}

export function withLegacyCamProcessAliases(p: CamProcessConfig): CamProcessConfig {
  const raw = p as CamProcessConfig & Record<string, unknown>
  const out: CamProcessConfig = { ...p }
  const dst = out as Record<string, unknown>
  for (const [legacy, canon] of Object.entries(LEGACY_CAM_PROCESS_FIELD_ALIASES)) {
    if (out[canon] !== undefined) continue
    const v = raw[legacy]
    if (v !== undefined) {
      dst[String(canon)] = v
    }
  }
  return out
}

/**
 * Remove grip `conf.js` legacy keys when the canonical field is also present (e.g. after
 * `withLegacyCamProcessAliases`), so exported JSON avoids duplicate `drillDown` + `camDrillDown`.
 * Shallow copy; does not mutate `p`. Legacy-only payloads are unchanged.
 */
export function stripLegacyCamProcessKeys(p: CamProcessConfig): CamProcessConfig {
  const out = { ...(p as CamProcessConfig & Record<string, unknown>) } as Record<string, unknown>
  for (const [legacy, canon] of Object.entries(LEGACY_CAM_PROCESS_FIELD_ALIASES)) {
    const c = String(canon)
    if (legacy in out && c in out) {
      delete out[legacy]
    }
  }
  return out as CamProcessConfig
}

/** Deep clone + **`withLegacyCamProcessAliases`** + **`stripLegacyCamProcessKeys`** (Pinia, bundle, **`runCamJob`, workspace). */
export function canonicalizeCamProcessConfig(p: CamProcessConfig): CamProcessConfig {
  return stripLegacyCamProcessKeys(withLegacyCamProcessAliases(clonePlain(p) as CamProcessConfig))
}

function clampPositive(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Per-op climb vs conventional (grip **`ov_conv`** overrides **`camConventional`**). */
function opConventionalMilling(op: CamOperationInstance, process: CamProcessConfig): boolean {
  if (op.ov_conv === true) return true
  if (op.ov_conv === false) return false
  return process.camConventional === true
}

/** Per-op Z band **`ov_topz` − `ov_botz`** (grip rough / outline / trace / pocket overrides). */
function effectiveOpZOverrideSpan(op: CamOperationInstance, safeDz: number): number {
  const t = op.type
  if (t !== 'rough' && t !== 'outline' && t !== 'trace' && t !== 'pocket') return safeDz
  const zt = Number(op.ov_topz)
  const zb = Number(op.ov_botz)
  if (!Number.isFinite(zt) || !Number.isFinite(zb) || !(zt > zb)) return safeDz
  const band = zt - zb
  if (band < 1e-3) return safeDz
  return clampPositive(Math.min(safeDz, band), 1)
}

/** Distinct positive **`cam*Tool`** ids on **`CamProcessConfig`** (grip process JSON always carries tool numbers). */
function distinctProcessToolCount(process: CamProcessConfig): number {
  const keys: (keyof CamProcessConfig)[] = [
    'camRoughTool',
    'camLevelTool',
    'camOutlineTool',
    'camContourTool',
    'camTraceTool',
    'camPocketTool',
    'camDrillTool',
    'camHelicalTool',
    'camRegisterTool',
    'camLatheTool',
  ]
  const set = new Set<number>()
  for (const key of keys) {
    const t = Number(process[key])
    if (Number.isFinite(t) && t > 0) set.add(Math.round(t))
  }
  return set.size
}

function footprintXY(process: CamProcessConfig, bbox: CamJobInputGeometry['bbox']) {
  const dx = Math.abs(bbox.maxX - bbox.minX)
  const dy = Math.abs(bbox.maxY - bbox.minY)
  if (process.camStockOn === false) {
    return { fx: dx, fy: dy, dx, dy }
  }
  const sx = process.camStockX
  const sy = process.camStockY
  const hasSx = typeof sx === 'number' && sx > 0
  const hasSy = typeof sy === 'number' && sy > 0
  let fx = Math.max(dx, hasSx ? sx : dx)
  let fy = Math.max(dy, hasSy ? sy : dy)
  if (process.camStockClipTo === true && hasSx && hasSy) {
    const clipX = process.camStockOffset === true ? dx + sx : sx
    const clipY = process.camStockOffset === true ? dy + sy : sy
    fx = Math.min(fx, Math.max(clipX, 1e-9))
    fy = Math.min(fy, Math.max(clipY, 1e-9))
  }
  return { fx, fy, dx, dy }
}

/**
 * Extra path-complexity for trace vs grip `op-trace.js`: **`clear`** emits two parallel tool offsets
 * per contour pass; **`follow`** with **`inside`/`outside`** applies a lateral tool offset pass.
 */
function traceSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'trace') return 1
  const mode = String(op.mode ?? process.camTraceType ?? 'follow').toLowerCase()
  let m = 1
  if (mode === 'clear') m = 2
  else {
    const side = String(op.offset ?? process.camTraceOffset ?? 'none').toLowerCase()
    if (side === 'inside' || side === 'outside') m = 1.15
  }
  if (opConventionalMilling(op, process)) m *= 1.03
  const traceBottom =
    op.traceBottom === true || (op.traceBottom !== false && process.camTraceBottom === true)
  if (traceBottom) m *= 1.055
  if (process.camTraceLines === true || op.lines === true) m *= 1.12
  return m
}

/**
 * Follow + merge: grip `op-trace.js` unions nested open contours when **`!down && op.merge`** (fewer
 * separate loops). Placeholder applies only for **single Z pass** — stepped trace uses **`down`** and
 * skips that branch.
 */
function traceMergeScale(op: CamOperationInstance, process: CamProcessConfig, passes: number): number {
  if (op.type !== 'trace') return 1
  if (passes > 1) return 1
  if (!(op.merge ?? process.camTraceMerge)) return 1
  const mode = String(op.mode ?? process.camTraceType ?? 'follow').toLowerCase()
  if (mode !== 'follow') return 1
  return 0.9
}

/** Dogbone corners add short extra segments (grip `addDogbones` in follow path). */
function traceDogboneScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'trace') return 1
  let m = 1
  if (op.dogbone ?? process.camTraceDogbone) m *= 1.08
  if (op.revbone === true) m *= 1.04
  return m
}

/**
 * Wide outline emits multiple concentric offset shells (grip **`cl-ops.js`** **`wide`** + **`steps`**).
 * Legacy **`camWideCutout`** is merged into **`camOutlineWide`** by **`withLegacyCamProcessAliases`**.
 * Per-op **`wide`** / **`dogbones`** / **`omitvoid`** / **`omitthru`** mirror saved process fields when set on the op.
 * Op inside/outside (or process **`camOutlineIn`** / **`camOutlineOut`**) nudge complexity vs grip **`op-outline.js`**
 * inner poly filter vs stock-side tshadow path.
 */
function outlineSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'outline') return 1
  let m = 1
  const outside = op.outside ?? process.camOutlineOut ?? true
  const inside = op.inside ?? process.camOutlineIn ?? false
  if (inside && outside) {
    m *= 1.02
  } else if (inside) {
    // grip `op-outline.js` inner offset filter (pocket-style polys) vs pure outside + tshadow
    m *= 1.048
  }
  const useWide =
    op.wide === true || (op.wide !== false && process.camOutlineWide === true)
  if (useWide) {
    const n = Number(op.steps ?? process.camOutlineOverCount)
    const shells = Number.isFinite(n) && n >= 1 ? Math.min(500, Math.floor(n)) : 1
    m *= shells
  }
  const useDogbones =
    op.dogbones === true || (op.dogbones !== false && process.camOutlineDogbone === true)
  if (useDogbones) m *= 1.08
  const omitVoid =
    op.omitvoid === true || (op.omitvoid !== false && process.camOutlineOmitVoid === true)
  if (omitVoid) m *= 0.94
  const omitThruOutline =
    op.omitthru === true || (op.omitthru !== false && process.camOutlineOmitThru === true)
  if (omitThruOutline) m *= 0.97
  if (opConventionalMilling(op, process)) m *= 1.035
  if (process.camOutlineOn === false) m *= 0.94
  return m
}

/**
 * Optional global Z window from **`camZTop` − `camZBottom`** when both finite and **`top > bottom`**;
 * shrinks placeholder **`safeDz`** (grip **`conf.js`** **`camZTop` / `camZBottom`**).
 */
function effectiveGlobalZSpan(process: CamProcessConfig, safeDz: number): number {
  const zt = Number(process.camZTop)
  const zb = Number(process.camZBottom)
  if (!Number.isFinite(zt) || !Number.isFinite(zb) || !(zt > zb)) return safeDz
  const band = zt - zb
  if (band < 1e-3) return safeDz
  return clampPositive(Math.min(safeDz, band), 1)
}

/** Stock Z anchor vs grip **`init-menu.js`** **`camZAnchor`** (skipped when **`camStockIndexed`**). */
function zAnchorStockSpanScale(process: CamProcessConfig): number {
  if (process.camStockIndexed === true) return 1
  const raw = process.camZAnchor
  const a = typeof raw === 'string' ? raw.toLowerCase() : 'middle'
  if (a === 'top' || a === 'bottom') return 1.012
  return 1
}

/**
 * Clip Z span driving **`ceil(zSpan / down)`** passes: trace uses **`camTraceZTop` − `camTraceZBottom`**;
 * pocket uses **`camPocketZTop` − `camPocketZBottom`** when both finite and **`top > bottom`** (grip **`conf.js`**).
 */
function effectiveZSpanForPasses(op: CamOperationInstance, process: CamProcessConfig, safeDz: number): number {
  if (op.type === 'trace') {
    const zt = Number(process.camTraceZTop)
    const zb = Number(process.camTraceZBottom)
    if (!Number.isFinite(zt) || !Number.isFinite(zb) || !(zt > zb)) return safeDz
    const band = zt - zb
    if (band < 1e-3) return safeDz
    return clampPositive(Math.min(safeDz, band), 1)
  }
  if (op.type === 'pocket') {
    const zt = Number(process.camPocketZTop)
    const zb = Number(process.camPocketZBottom)
    if (!Number.isFinite(zt) || !Number.isFinite(zb) || !(zt > zb)) return safeDz
    const band = zt - zb
    if (band < 1e-3) return safeDz
    return clampPositive(Math.min(safeDz, band), 1)
  }
  return safeDz
}

/**
 * Outline **clear top** inserts extra top slices (grip **`op-outline.js`** **`op.top`**); placeholder bumps
 * pass count by **×1.2** when **`op.top`** or **`camOutlineTop`** is true.
 */
function adjustedPassCount(
  op: CamOperationInstance,
  process: CamProcessConfig,
  zSpan: number,
  down: number,
): number {
  if (op.type === 'flip' || op.type === 'gcode' || op.type === 'laser off') return 1
  const d = Math.max(down, 1e-9)
  let passes = Math.max(1, Math.ceil(zSpan / d))
  if (op.type === 'outline' && (op.top === true || process.camOutlineTop === true)) {
    passes = Math.max(1, Math.round(passes * 1.2))
  }
  return passes
}

function stringOrStringArrayLineCount(v: string[] | string | undefined): number {
  if (v == null) return 0
  if (Array.isArray(v)) {
    let n = 0
    for (const item of v) {
      if (String(item).trim().length > 0) n += 1
    }
    return n
  }
  return String(v).split(/\r?\n/).reduce((acc, line) => acc + (line.trim().length > 0 ? 1 : 0), 0)
}

/** Contour mesh quality knobs vs grip **`cl-ops.js`** (reduce / flatness / tolerance / curves / bottom / bridging / axis). */
function contourSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'contour') return 1
  let m = 1
  const red = Number(op.reduction ?? process.camContourReduce)
  if (Number.isFinite(red) && red > 0) {
    const r = Math.min(10, Math.max(0, red))
    m *= Math.max(0.65, 1 - r * 0.035)
  }
  const flat = Number(op.flatness ?? process.camFlatness)
  if (Number.isFinite(flat) && flat > 0) {
    m *= Math.max(0.88, 1 - Math.min(1, flat * 15))
  }
  const tol = Number(op.tolerance ?? process.camTolerance)
  if (Number.isFinite(tol) && tol > 0) {
    m *= Math.max(0.75, 1 / (1 + tol * 0.04))
  }
  if (process.camContourCurves === false) m *= 0.92
  const useContourBottom =
    op.bottom === true || (op.bottom !== false && process.camContourBottom === true)
  if (useContourBottom) m *= 1.08
  const contourIn =
    op.inside === true || (op.inside !== false && process.camContourIn === true)
  if (contourIn) m *= 1.055
  const ax = String(op.axis ?? '').trim().toLowerCase()
  const xOn = process.camContourXOn === true
  const yOn = process.camContourYOn === true
  if (ax === 'x' || ax === 'y') {
    // Single wall family vs grip **`xyaxis`** select (still gated by process wall toggles).
    if (xOn && yOn) m *= 1.1
    else if (xOn || yOn) m *= 1.04
  } else {
    if (xOn && yOn) m *= 1.85
    else if (xOn || yOn) m *= 1.02
  }
  const bridge = Number(op.bridging ?? process.camContourBridge)
  if (Number.isFinite(bridge) && bridge > 0) {
    m *= Math.min(1.12, 1 + Math.min(bridge, 500) / 400)
  }
  const filterLines = stringOrStringArrayLineCount(process.camContourFilter)
  if (filterLines > 0) {
    m *= Math.min(1.14, 1 + filterLines * 0.012)
  }
  if (process.camContourCurves === true) {
    const ca = Number(process.camContourAngle)
    if (Number.isFinite(ca)) {
      const a = Math.min(90, Math.max(45, ca))
      m *= Math.min(1.12, 1 + ((90 - a) / 90) * 0.14)
    }
  }
  return m
}

/** Level stock mode and XY inset coverage vs grip `cl-ops.js` `stock` / `inset` → `camLevelStock` / `camLevelInset`. */
function levelSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'level') return 1
  let m = 1
  const useStock =
    op.stock === true || (op.stock !== false && process.camLevelStock === true)
  if (useStock) m *= 1.04
  const ins = Number(op.inset ?? process.camLevelInset)
  if (Number.isFinite(ins) && ins > 0) {
    m *= Math.min(1.07, 1 + ins / 120)
  }
  return m
}

/** Rough voids / flats / omit-thru / inside vs grip `cl-ops.js`; per-op `voids`, `flats`, `omitthru`, `inside` merge with process toggles. */
function roughSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'rough') return 1
  let m = 1
  const omitThruRough =
    op.omitthru === true || (op.omitthru !== false && process.camRoughOmitThru === true)
  if (omitThruRough) m *= 0.97
  const useVoid =
    op.voids === true || (op.voids !== false && process.camRoughVoid === true)
  if (useVoid) m *= 1.06
  const useFlat =
    op.flats === true || (op.flats !== false && process.camRoughFlat === true)
  if (useFlat) m *= 1.05
  if (process.camRoughAll === true || op.all === true) m *= 1.12
  const roughInside =
    op.inside === true || (op.inside !== false && process.camRoughIn !== false)
  if (!roughInside) m *= 1.038
  if (process.camRoughTop === true) m *= 1.042
  if (opConventionalMilling(op, process)) m *= 1.035
  if (process.camTrueShadow === true) m *= 1.05
  if (process.camRoughOn === false) m *= 0.94
  return m
}
function pocketSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'pocket') return 1
  let m = 1
  const ex = Number(op.expand ?? process.camPocketExpand)
  if (Number.isFinite(ex) && ex > 0) {
    m *= Math.min(1.22, 1 + Math.min(ex, 25) / 50)
  }
  const pContour =
    op.contour === true || (op.contour !== false && process.camPocketContour === true)
  if (pContour) m *= 1.38
  const pEngrave =
    op.engrave === true || (op.engrave !== false && process.camPocketEngrave === true)
  if (pEngrave) m *= 1.12
  const pOutline =
    op.outline === true ||
    (op.outline !== false && (process.camPocketOutline === true || process.cmaPocketOutline === true))
  if (pOutline) m *= 1.08
  const smooth = Number(op.smooth ?? process.camPocketSmooth)
  if (Number.isFinite(smooth) && smooth > 0) {
    m *= 1 + Math.min(20, smooth) * 0.02
  }
  const refine = Number(op.refine ?? process.camPocketRefine ?? process.cmaPocketRefine)
  if (Number.isFinite(refine) && refine > 0) {
    m *= 1 + Math.min(10, refine) * 0.035
  }
  const follow = Number(op.follow ?? process.camPocketFollow)
  if (Number.isFinite(follow) && follow > 0) {
    m *= Math.min(1.22, 1 + follow / 60)
  }
  if (opConventionalMilling(op, process)) m *= 1.035
  if (pContour) {
    const tol = Number(op.tolerance ?? process.camTolerance)
    if (Number.isFinite(tol) && tol > 0) {
      m *= Math.max(0.82, 1 / (1 + tol * 0.04))
    }
  }
  return m
}

/** Drill thru depth, precision, dwell/lift, mark-only vs grip **`op-drill.js`** / **`cl-ops.js`**. */
function drillSegmentScale(op: CamOperationInstance, process: CamProcessConfig, safeDz: number): number {
  if (op.type !== 'drill') return 1
  let m = 1
  const marking = op.mark === true || (op.mark !== false && process.camDrillMark === true)
  if (marking) {
    m *= 0.88
  } else {
    const drillThru = Number(op.thru ?? process.camDrillThru)
    if (Number.isFinite(drillThru) && drillThru > 0) {
      m *= Math.min(1.55, 1 + drillThru / Math.max(safeDz, 1))
    }
    const lift = Number(op.lift ?? process.camDrillLift)
    if (Number.isFinite(lift) && lift > 0) {
      m *= Math.min(1.12, 1 + lift / 45)
    }
    const dwell = Number(op.dwell ?? process.camDrillDwell)
    if (Number.isFinite(dwell) && dwell > 0) {
      m *= Math.min(1.08, 1 + dwell / 7500)
    }
    const pr = Number(op.precision ?? process.camDrillPrecision)
    if (Number.isFinite(pr) && pr > 0) {
      m *= 1 + Math.min(0.4, pr * 0.07)
    }
  }
  const drillFromTop =
    op.fromTop === true || (op.fromTop !== false && process.camDrillFromStockTop === true)
  if (drillFromTop && !marking) m *= 1.04
  if (process.camDrillingOn === false) m *= 0.94
  return m
}

/** Helical ramp knobs vs grip `cl-ops.js`; per-op `finish`, `entry`, `reverse`, `offOver`, `offset` (string preset), `startAng`, `forceStartAng`, `clockwise` merge with process fields. */
function helicalSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'helical') return 1
  let m = 1
  const bottomFinish =
    op.finish === true || (op.finish !== false && process.camHelicalBottomFinish === true)
  if (bottomFinish) m *= 1.06
  const entry = op.entry === true || (op.entry !== false && process.camHelicalEntry === true)
  if (entry) m *= 1.08
  const eo = Number(op.entryOffset ?? process.camHelicalEntryOffset)
  if (Number.isFinite(eo) && eo > 0) {
    m *= Math.min(1.12, 1 + eo / 40)
  }
  const rev = op.reverse === true || (op.reverse !== false && process.camHelicalReverse === true)
  if (rev) m *= 1.04
  const helixFromTop =
    op.fromTop === true || (op.fromTop !== false && process.camHelicalFromStockTop === true)
  if (helixFromTop) m *= 1.04
  const forceStart =
    op.forceStartAng === true ||
    (op.forceStartAng !== false && process.camHelicalForceStartAngle === true)
  const sa = Number(op.startAng ?? process.camHelicalStartAngle)
  if (forceStart || (Number.isFinite(sa) && Math.abs(sa) > 1e-6)) {
    m *= 1.02
  }
  const ovr = Number(op.offOver ?? process.camHelicalOffsetOverride)
  if (Number.isFinite(ovr) && ovr > 0) {
    m *= Math.min(1.1, 1 + ovr / 55)
  }
  const rawHo = op.offset
  const hOff =
    typeof rawHo === 'string' && rawHo.trim().length > 0
      ? rawHo.trim().toLowerCase()
      : String(process.camHelicalOffset ?? 'auto').trim().toLowerCase()
  if (hOff.length > 0 && hOff !== 'auto') m *= 1.03
  let ccwBump = false
  if (op.clockwise === false) ccwBump = true
  else if (op.clockwise !== true && process.camHelicalClockwise === false) ccwBump = true
  if (ccwBump) m *= 1.015
  return m
}

/**
 * Register face path (**`-`** / **`=`**) vs X/Y drilling slots vs grip **`op-register.js`**.
 * **`points`** **3** adds an extra vertical slot vs **2** on X/Y. Per-op **`offset`** (mm) / **`thru`** mirror **`camRegisterOffset`** / **`camRegisterThru`**.
 * Face register uses per-op **`feed`** with **`camRegisterSpeed`** (grip register popOp **`feed`**).
 */
function registerSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'register') return 1
  const ax = String(op.axis ?? '').trim().toLowerCase()
  if (ax === '' || ax === '-' || ax === '=') {
    let mf = 0.92
    const regFeed = Number(op.feed ?? process.camRegisterSpeed)
    if (Number.isFinite(regFeed) && regFeed > 0) {
      mf *= Math.min(1.055, 1 + regFeed / 25000)
    }
    return mf
  }
  if (ax !== 'x' && ax !== 'y') return 1.18
  let m = 1.18
  const pts = Number(op.points)
  if (pts === 3) m *= 1.14
  const lift = Number(op.lift ?? process.camDrillLift)
  if (Number.isFinite(lift) && lift > 0) {
    m *= Math.min(1.12, 1 + lift / 45)
  }
  const dwell = Number(op.dwell ?? process.camDrillDwell)
  if (Number.isFinite(dwell) && dwell > 0) {
    m *= Math.min(1.08, 1 + dwell / 7500)
  }
  const rawOff = op.offset
  const regOff =
    rawOff != null && rawOff !== ''
      ? Number(rawOff)
      : Number(process.camRegisterOffset)
  if (Number.isFinite(regOff) && regOff > 0) {
    m *= Math.min(1.1, 1 + regOff / 100)
  }
  const regThru = Number(op.thru ?? process.camRegisterThru)
  if (Number.isFinite(regThru) && regThru > 0) {
    m *= Math.min(1.14, 1 + regThru / 90)
  }
  return m
}

/**
 * Stock flip prep vs grip cl-flip.js: X/Y branches run pi rotation; other axis values skip selection.rotate.
 */
function flipSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'flip') return 1
  const ax = String(op.axis ?? process.camFlipAxis ?? 'X').trim().toUpperCase()
  let m = 1.06
  if (ax === 'Y') m *= 1.012
  if (ax !== 'X' && ax !== 'Y') m *= 0.965
  const flipInvert =
    op.invert === true || (op.invert !== false && process.camFlipInvert === true)
  if (flipInvert) m *= 1.02
  const other = String(process.camFlipOther ?? '').trim()
  if (other.length > 0) m *= Math.min(1.05, 1 + Math.min(other.length, 120) / 1200)
  return m
}

/** Laser raster placeholder: grip `laser on` popOp keys (`adapt`, `power`, `minp`, …) merged with `camLaser*`. */
function laserSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type === 'laser off') return 0.78
  if (op.type !== 'laser' && op.type !== 'laser on') return 1
  let m = 1
  const adapt =
    op.adapt === true || (op.adapt !== false && process.camLaserAdaptive === true)
  const adaptMod =
    op.adaptrp === true || (op.adaptrp !== false && process.camLaserAdaptMod === true)
  const flatten =
    op.flat === true || (op.flat !== false && process.camLaserFlatten === true)
  if (adapt) m *= 1.12
  if (adaptMod) m *= 1.04
  if (flatten) m *= 1.06
  const flatz = Number(op.flatz ?? process.camLaserFlatZ)
  if (flatten && Number.isFinite(flatz) && Math.abs(flatz) > 1e-6) m *= 1.02
  const zMin = Number(op.minz ?? process.camLaserZMin)
  const zMax = Number(op.maxz ?? process.camLaserZMax)
  if (Number.isFinite(zMin) && Number.isFinite(zMax) && zMax > zMin) {
    m *= Math.min(1.15, 1 + (zMax - zMin) / 200)
  }
  if (adapt) {
    const minp = Number(op.minp ?? process.camLaserPowerMin)
    const maxp = Number(op.maxp ?? process.camLaserPowerMax)
    if (Number.isFinite(minp) && Number.isFinite(maxp) && maxp > minp) {
      m *= Math.min(1.08, 1 + (maxp - minp) * 0.08)
    }
  } else {
    const pw = Number(op.power ?? process.camLaserPower)
    if (Number.isFinite(pw) && pw > 0) {
      m *= Math.min(1.06, 1 + pw * 0.055)
    }
  }
  const scriptLines =
    stringOrStringArrayLineCount(process.camLaserEnable) +
    stringOrStringArrayLineCount(process.camLaserOn) +
    stringOrStringArrayLineCount(process.camLaserOff) +
    stringOrStringArrayLineCount(process.camLaserDisable)
  if (scriptLines > 0) m *= Math.min(1.22, 1 + scriptLines * 0.008)
  return m
}

/** Lathe angular step / linear mode / stock offsets vs grip **`cl-ops.js`** `lathe` popOp. */
function latheSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'lathe') return 1
  let m = 1
  const ang = Number(op.angle ?? process.camLatheAngle)
  if (Number.isFinite(ang) && ang > 0) {
    // Smaller **`camLatheAngle`** / per-op **`angle`** ⇒ denser rotary sampling in placeholder totals.
    const bump = 0.55 / Math.max(ang, 0.2)
    m *= Math.min(1.34, 1 + Math.min(0.32, bump))
  }
  if (op.linear === true || process.camLatheLinear === true) m *= 0.94
  const os = Number(op.offStart ?? process.camLatheOffStart)
  const oe = Number(op.offEnd ?? process.camLatheOffEnd)
  if ((Number.isFinite(os) && os > 0) || (Number.isFinite(oe) && oe > 0)) m *= 1.05
  const tol = Number(op.tolerance ?? process.camTolerance)
  if (Number.isFinite(tol) && tol > 0) {
    m *= Math.min(1.1, 1 + tol * 0.45)
  }
  const lv = Number(op.leave ?? process.camContourLeave)
  if (Number.isFinite(lv) && lv > 0) {
    m *= Math.min(1.08, 1 + lv / 80)
  }
  const filterLines = stringOrStringArrayLineCount(process.camContourFilter)
  if (filterLines > 0) {
    m *= Math.min(1.12, 1 + filterLines * 0.01)
  }
  return m
}

/** Stock tabs add tabbing motion / bridges vs grip **`camTabs*`** process fields. */
function tabSegmentScale(process: CamProcessConfig): number {
  const w = Number(process.camTabsWidth)
  const h = Number(process.camTabsHeight)
  const d = Number(process.camTabsDepth)
  if (!(Number.isFinite(w) && w > 0)) return 1
  if (!(Number.isFinite(h) && h > 0)) return 1
  if (!(Number.isFinite(d) && d > 0)) return 1
  let m = 1
  m *= Math.min(1.14, 1 + Math.min(w, 100) / 350)
  m *= Math.min(1.08, 1 + Math.min(d, 50) / 180)
  if (process.camTabsMidline === true) m *= 1.03
  return m
}

/** Ease-down / ramp angle nudges link moves vs grip **`camEaseDown`** / **`camEaseAngle`**. */
function easeSegmentScale(process: CamProcessConfig): number {
  let m = 1
  if (process.camEaseDown === true) m *= 1.06
  const ang = Number(process.camEaseAngle)
  if (Number.isFinite(ang) && ang > 0) {
    m *= Math.min(1.06, 1 + Math.min(ang, 45) / 300)
  }
  return m
}

/**
 * **`camDepthFirst === false`** (width-first) adds lateral linking vs grip **`op-rough.js`** /
 * **`op-pocket.js`** when not indexed.
 */
function depthFirstSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  const t = op.type
  if (t !== 'rough' && t !== 'pocket' && t !== 'outline' && t !== 'contour') return 1
  if (process.camDepthFirst !== false) return 1
  return 1.055
}

/** Expert fast mode nudges totals down vs grip **`camExpertFast`**. */
function expertSegmentScale(process: CamProcessConfig): number {
  return process.camExpertFast === true ? 0.97 : 1
}

/**
 * Arc-to-line segment density vs grip **`prepare.js`** (**`camArcEnabled`**, **`camArcTolerance`**, **`camArcResolution`** deg).
 */
function arcFitSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  const t = op.type
  if (
    t !== 'trace' &&
    t !== 'outline' &&
    t !== 'contour' &&
    t !== 'rough' &&
    t !== 'pocket' &&
    t !== 'helical' &&
    t !== 'level' &&
    t !== 'lathe'
  ) {
    return 1
  }
  if (process.camArcEnabled !== true) return 1
  const tol = Number(process.camArcTolerance)
  const resDeg = Number(process.camArcResolution)
  if (!Number.isFinite(tol) || tol <= 0 || !Number.isFinite(resDeg) || resDeg <= 0) return 1
  const tolBump = Math.min(1.18, 1 + 0.012 * Math.sqrt(0.01 / Math.max(tol, 1e-6)))
  const resBump = Math.min(1.12, 1 + 0.024 * Math.sqrt(10 / Math.max(resDeg, 0.5)))
  return Math.min(1.35, tolBump * resBump)
}

/** 4th-axis / indexed stock wrap slightly increases swept coverage vs grip **`slice.js`** **`camStockIndexed`**. */
function stockIndexedSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (process.camStockIndexed !== true || process.camStockOn === false) return 1
  const t = op.type
  if (
    t !== 'rough' &&
    t !== 'outline' &&
    t !== 'contour' &&
    t !== 'pocket' &&
    t !== 'drill' &&
    t !== 'helical' &&
    t !== 'lathe' &&
    t !== 'trace'
  ) {
    return 1
  }
  let m = 1.032
  if (process.camStockIndexGrid === true) m *= 1.012
  return m
}

/** Tool-init preamble, ramp **full engage**, origin shifts vs grip **`init-menu.js`** / **`cl-origin.js`**. */
function processOutputExtrasSegmentScale(process: CamProcessConfig): number {
  let m = 1
  if (process.camToolInit === false) m *= 0.985
  else if (process.camToolInit === true) m *= 1.015
  const fe = Number(process.camFullEngage)
  if (Number.isFinite(fe) && fe > 0 && fe < 1) {
    m *= Math.min(1.08, 1 + (1 - fe) * 0.07)
  }
  if (process.camOriginCenter === true || process.ctOriginCenter === true) m *= 1.012
  if (process.camOriginTop === true) m *= 1.01
  if (process.outputInvertX === true) m *= 1.014
  if (process.outputInvertY === true) m *= 1.014
  const zc = Number(process.camZClearance)
  if (Number.isFinite(zc) && zc > 0) {
    m *= Math.min(1.042, 1 + zc / 100)
  }
  const zo = Number(process.camZOffset)
  if (Number.isFinite(zo) && Math.abs(zo) > 1e-6) {
    m *= Math.min(1.035, 1 + Math.abs(zo) / 250)
  }
  let shift = 0
  for (const k of ['camOriginOffX', 'camOriginOffY', 'camOriginOffZ'] as const) {
    const v = Number(process[k])
    if (Number.isFinite(v)) shift += Math.abs(v)
  }
  if (shift > 1e-6) m *= Math.min(1.06, 1 + shift / 400)
  if (process.ctOriginBounds === true) {
    m *= 1.008
    const bx = Number(process.ctOriginOffX)
    const by = Number(process.ctOriginOffY)
    const bs = (Number.isFinite(bx) ? Math.abs(bx) : 0) + (Number.isFinite(by) ? Math.abs(by) : 0)
    if (bs > 1e-6) m *= Math.min(1.035, 1 + bs / 450)
  }
  return m
}

/**
 * Stock boundary options beyond raw `footprintXY` sizing: clip-to-stock and stock-offset
 * add margin and boundary handling in grip post; applied only when stock is enabled.
 */
function stockOptionsSegmentScale(process: CamProcessConfig): number {
  if (process.camStockOn === false) return 1
  let m = 1
  if (process.camStockClipTo === true) m *= 1.008
  if (process.camStockOffset === true) m *= 1.012
  return m
}

/** Z / pocket ordering flags vs grip **`prepare.js`** / **`init-menu.js`** (**`camForceZMax`**, **`camFirstZMax`**, **`camInnerFirst`**). */
function zOrderingSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  const t = op.type
  if (
    t !== 'rough' &&
    t !== 'pocket' &&
    t !== 'outline' &&
    t !== 'contour' &&
    t !== 'trace' &&
    t !== 'helical' &&
    t !== 'level'
  ) {
    return 1
  }
  let m = 1
  if (process.camForceZMax === true) m *= 1.028
  if (process.camFirstZMax === true) m *= 1.018
  if (process.camInnerFirst === true && (t === 'pocket' || t === 'rough')) m *= 1.032
  return m
}

/** Indexed rotation / absolute mode nudges path complexity vs grip **`cl-ops.js`**. */
function indexedSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'indexed' && op.type !== 'index') return 1
  let m = 1
  if (op.absolute === true || (op.absolute !== false && process.camIndexAbs === true)) m *= 1.02
  const deg = Number(op.degrees ?? process.camIndexAxis)
  if (Number.isFinite(deg) && Math.abs(deg) > 1e-6) {
    m *= Math.min(1.18, 1 + (Math.min(Math.abs(deg), 360) / 360) * 0.2)
  }
  return m
}

function gcodeTextLineCount(g: string[] | string | undefined | null): number {
  if (g == null) return 0
  const lines = Array.isArray(g) ? g : String(g).split(/\r?\n/)
  let n = 0
  for (const line of lines) {
    if (line.trim().length > 0) n += 1
  }
  return n
}

function customGcodeLineCount(process: CamProcessConfig): number {
  return gcodeTextLineCount(process.camCustomGcode)
}

/** Custom **`gcode`** op lines vs grip **`camCustomGcode`** or per-op **`gcode`**. */
function gcodeSegmentScale(op: CamOperationInstance, process: CamProcessConfig): number {
  if (op.type !== 'gcode') return 1
  const n =
    op.gcode !== undefined && op.gcode !== null
      ? gcodeTextLineCount(op.gcode)
      : customGcodeLineCount(process)
  if (n <= 0) return 1
  return Math.min(1.45, 1 + n * 0.025)
}

/** Resolve XY step/over from op fields, then process-level defaults by op type (grip-style knobs). */
function resolveOpStepOver(op: CamOperationInstance, process: CamProcessConfig): number {
  const direct = Number(op.step ?? op.over)
  if (Number.isFinite(direct) && direct > 0) return clampPositive(direct, 0.05)

  switch (op.type) {
    case 'rough': {
      const opLeave = Number(op.leave)
      const procStock = Number(process.camRoughStock)
      const leaveExtra = Number.isFinite(opLeave) && opLeave > 0
        ? opLeave
        : Number.isFinite(procStock) && procStock > 0
          ? procStock
          : 0
      const base = Number(process.camRoughOver ?? 1)
      return clampPositive(base + leaveExtra, 0.05)
    }
    case 'level': {
      const opInset = Number(op.inset)
      const procInset = Number(process.camLevelInset)
      const insetExtra = Number.isFinite(opInset) && opInset > 0
        ? opInset
        : Number.isFinite(procInset) && procInset > 0
          ? procInset
          : 0
      const base = Number(process.camLevelOver ?? 1)
      return clampPositive(base + insetExtra, 0.05)
    }
    case 'outline':
      return clampPositive(Number(process.camOutlineOver ?? 1), 0.05)
    case 'contour': {
      const opLeave = Number(op.leave)
      const procLeave = Number(process.camContourLeave)
      const leaveExtra = Number.isFinite(opLeave) && opLeave > 0
        ? opLeave
        : Number.isFinite(procLeave) && procLeave > 0
          ? procLeave
          : 0
      const base = Number(process.camContourOver ?? process.camRoughOver ?? process.camLevelOver ?? 1)
      return clampPositive(base + leaveExtra, 0.05)
    }
    case 'trace': {
      const opOff = Number(op.offover)
      const procOff = Number(process.camTraceOffOver)
      const bump = Number.isFinite(opOff) && opOff > 0
        ? opOff
        : Number.isFinite(procOff) && procOff > 0
          ? procOff
          : 0
      const base = Number(process.camTraceOver ?? 1)
      return clampPositive(base + bump, 0.05)
    }
    case 'pocket': {
      const base = Number(process.camPocketOver ?? process.camRoughOver ?? process.camLevelOver ?? 1)
      const expand = Number(op.expand ?? process.camPocketExpand)
      const bump = Number.isFinite(expand) && expand > 0 ? expand : 0
      return clampPositive(base + bump, 0.05)
    }
    case 'drill':
      return clampPositive(Number(op.step ?? op.over ?? 0.2), 0.05)
    case 'helical': {
      // **`camHelicalDown`** is Z depth (grip **`cl-ops.js`** / process JSON), not XY step.
      const ov = Number(op.offOver ?? process.camHelicalOffsetOverride)
      if (Number.isFinite(ov) && ov > 0) return clampPositive(ov, 0.05)
      return clampPositive(Number(process.camRoughOver ?? process.camLevelOver ?? 1), 0.05)
    }
    case 'lathe': {
      const base = Number(process.camLatheOver ?? process.camContourOver ?? process.camRoughOver ?? 0.1)
      const opLeave = Number(op.leave)
      const procLeave = Number(process.camContourLeave)
      const leaveExtra = Number.isFinite(opLeave) && opLeave > 0
        ? opLeave
        : Number.isFinite(procLeave) && procLeave > 0
          ? procLeave
          : 0
      return clampPositive(base + leaveExtra, 0.05)
    }
    case 'register':
      return clampPositive(
        Number(op.step ?? op.over ?? process.camRegisterOffset ?? process.camTraceOver ?? 0.5),
        0.05,
      )
    case 'laser':
    case 'laser on':
    case 'laser off':
      return clampPositive(Number(op.step ?? op.over ?? process.camTraceOver ?? 0.15), 0.05)
    case 'indexed':
    case 'index':
      return clampPositive(Number(process.camRoughOver ?? process.camLevelOver ?? 1), 0.05)
    case 'gcode':
      return 1
    case 'flip':
      return 1
    default:
      return 1
  }
}

function resolveOpDown(op: CamOperationInstance, process: CamProcessConfig, safeDz: number): number {
  const direct = Number(op.down)
  if (Number.isFinite(direct) && direct > 0) return clampPositive(direct, safeDz)

  switch (op.type) {
    case 'rough': {
      const base = Number(process.camRoughDown ?? safeDz)
      const lz = Number(op.leavez ?? process.camRoughStockZ)
      const extra = Number.isFinite(lz) && lz > 0 ? lz : 0
      return clampPositive(base + extra, safeDz)
    }
    case 'level': {
      const stepZ = Number(op.stepz ?? process.camLevelStepZ)
      if (Number.isFinite(stepZ) && stepZ > 0) return clampPositive(stepZ, safeDz)
      return clampPositive(Number(process.camLevelDown ?? safeDz), safeDz)
    }
    case 'outline':
      return clampPositive(Number(process.camOutlineDown ?? safeDz), safeDz)
    case 'trace': {
      const base = Number(process.camTraceDown ?? safeDz)
      const opThru = Number(op.thru)
      const procThru = Number(process.camTraceThru)
      const extra = Number.isFinite(opThru) && opThru > 0
        ? opThru
        : Number.isFinite(procThru) && procThru > 0
          ? procThru
          : 0
      return clampPositive(base + extra, safeDz)
    }
    case 'contour':
      return clampPositive(
        Number(process.camLevelDown ?? process.camRoughDown ?? safeDz),
        safeDz,
      )
    case 'pocket':
      return clampPositive(
        Number(process.camPocketDown ?? process.camRoughDown ?? safeDz),
        safeDz,
      )
    case 'drill':
      return clampPositive(
        Number(process.camDrillDown ?? process.camTraceDown ?? Math.min(safeDz, 2)),
        safeDz,
      )
    case 'helical': {
      const base = Number(process.camHelicalDown ?? process.camRoughDown ?? safeDz)
      const opThru = Number(op.thru)
      const procThru = Number(process.camHelicalThru)
      const extra = Number.isFinite(opThru) && opThru > 0
        ? opThru
        : Number.isFinite(procThru) && procThru > 0
          ? procThru
          : 0
      return clampPositive(base + extra, safeDz)
    }
    case 'lathe':
      return clampPositive(
        Number(process.camLevelDown ?? process.camRoughDown ?? Math.min(safeDz * 0.15, 0.8)),
        Math.min(safeDz, 3),
      )
    case 'register':
      return clampPositive(
        Number(process.camRegisterThru ?? process.camLevelDown ?? Math.min(safeDz, 0.5)),
        Math.min(safeDz, 5),
      )
    case 'laser':
    case 'laser on':
    case 'laser off':
      return clampPositive(
        Number(op.down ?? process.camTraceDown ?? Math.min(safeDz, 0.3)),
        Math.min(safeDz, 1),
      )
    case 'indexed':
    case 'index':
      return clampPositive(Number(process.camRoughDown ?? process.camLevelDown ?? safeDz), safeDz)
    case 'gcode':
      return clampPositive(Number(op.down ?? 0.05), Math.min(safeDz, 1))
    case 'flip':
      return clampPositive(Number(op.down ?? 0.2), Math.min(safeDz, 1))
    default:
      return clampPositive(safeDz, 1)
  }
}

/** Rough cut-length (mm) heuristic: perimeter-dominated term + capped pocket/raster term. */
function estimateCutLengthMmPerPass(footprintX: number, footprintY: number, step: number): number {
  const s = Math.max(0.05, step)
  const linearSweep = (footprintX + footprintY) / s
  const rawAreaTerm = (footprintX * footprintY) / Math.max(s * s * 6, 1e-3)
  const areaSweep = Math.min(rawAreaTerm, linearSweep * 60)
  return Math.max(4 * s, linearSweep * s + areaSweep * s * 0.08)
}

/**
 * Min positive **`op.rate`** (mm/min) across ops (grip CAM op field for per-op feed). **`op.speed`**
 * is intentionally ignored here (often spindle RPM in device/op JSON).
 */
function minPerOpRateFromProcessOps(process: CamProcessConfig): number | undefined {
  let out: number | undefined
  for (const op of process.ops ?? []) {
    const r = Number(op.rate)
    if (!Number.isFinite(r) || r <= 0) continue
    out = out === undefined ? r : Math.min(out, r)
  }
  return out
}

function minPerOpRateFromCamops(camops: Array<{ op?: CamOperationInstance }>): number | undefined {
  let out: number | undefined
  for (const row of camops) {
    const r = Number(row?.op?.rate)
    if (!Number.isFinite(r) || r <= 0) continue
    out = out === undefined ? r : Math.min(out, r)
  }
  return out
}

/** Min positive **`op.plunge`** (mm/min) across **`process.ops`** (grip default ops carry plunge with rate). */
function minPerOpPlungeFromProcessOps(process: CamProcessConfig): number | undefined {
  let out: number | undefined
  for (const op of process.ops ?? []) {
    const p = Number(op.plunge)
    if (!Number.isFinite(p) || p <= 0) continue
    out = out === undefined ? p : Math.min(out, p)
  }
  return out
}

function minPerOpPlungeFromCamops(camops: Array<{ op?: CamOperationInstance }>): number | undefined {
  let out: number | undefined
  for (const row of camops) {
    const p = Number(row?.op?.plunge)
    if (!Number.isFinite(p) || p <= 0) continue
    out = out === undefined ? p : Math.min(out, p)
  }
  return out
}

/**
 * Conservative blended feed (mm/min): **`min(camFastFeed, camFastFeedZ?, XY speed knobs?, plunge knobs?,
 * per-op rate?, per-op plunge?)`** — single scalar for placeholder path-length / minutes (grip-style conservative).
 */
function effectiveCamMachiningFeed(
  process: CamProcessConfig,
  camops?: Array<{ op?: CamOperationInstance }>,
): number {
  const fast = clampPositive(Number(process.camFastFeed), 2000)
  let eff = fast
  const zFast = Number(process.camFastFeedZ)
  if (Number.isFinite(zFast) && zFast > 0) eff = Math.min(eff, zFast)
  const keys: (keyof CamProcessConfig)[] = [
    'camRoughSpeed',
    'camLevelSpeed',
    'camOutlineSpeed',
    'camContourSpeed',
    'camTraceSpeed',
    'camPocketSpeed',
    'camHelicalSpeed',
    'camHelicalDownSpeed',
    'camRegisterSpeed',
    'camDrillDownSpeed',
    'camLaserSpeed',
    'camLatheSpeed',
    'camRoughPlunge',
    'camOutlinePlunge',
    'camTracePlunge',
    'camPocketPlunge',
  ]
  for (const key of keys) {
    const n = Number(process[key])
    if (Number.isFinite(n) && n > 0) eff = Math.min(eff, n)
  }
  const fromProfileOps = minPerOpRateFromProcessOps(process)
  if (fromProfileOps != null) eff = Math.min(eff, fromProfileOps)
  const fromProfilePlunge = minPerOpPlungeFromProcessOps(process)
  if (fromProfilePlunge != null) eff = Math.min(eff, fromProfilePlunge)
  if (camops?.length) {
    const fromWidget = minPerOpRateFromCamops(camops)
    if (fromWidget != null) eff = Math.min(eff, fromWidget)
    const fromWidgetPlunge = minPerOpPlungeFromCamops(camops)
    if (fromWidgetPlunge != null) eff = Math.min(eff, fromWidgetPlunge)
  }
  return clampPositive(eff, 1)
}

/**
 * Σ (**`estimatedPathSegments × resolveOpStepOver(op)`**): per row prefer **`process.ops[row.opIndex]`**;
 * when **`camops.length === perOp.length`**, fall back to **`camops[i]?.op`** by index (enrich may **append**
 * synthetic **`perOp`** rows so extra **`widget.camops`** beyond profile **`ops`** still contribute).
 */
function nominalPathLengthFromPerOp(
  process: CamProcessConfig,
  perOp: CamOpStepSummary[],
  camops: Array<{ op?: CamOperationInstance }>,
): number | undefined {
  if (!perOp.length) return undefined
  const ops = process.ops ?? []
  const alignCamops = camops.length > 0 && camops.length === perOp.length
  let sum = 0
  let used = 0
  for (let i = 0; i < perOp.length; i++) {
    const row = perOp[i]!
    const profileOp = ops[row.opIndex]
    const cop = alignCamops ? camops[i]?.op : undefined
    const op = profileOp ?? cop
    if (!op) continue
    sum += row.estimatedPathSegments * resolveOpStepOver(op, process)
    used += 1
  }
  return used > 0 ? sum : undefined
}

function recalcMachiningMinutes(
  summary: CamJobSummary,
  process: CamProcessConfig,
  nominalPathLengthMm?: number,
  camops?: Array<{ op?: CamOperationInstance }>,
): CamJobSummary {
  const feed = effectiveCamMachiningFeed(process, camops)
  const pathMm = nominalPathLengthMm != null ? nominalPathLengthMm : summary.estimatedTotalPathSegments * 1.5
  const minutes = pathMm / feed / 60
  return { ...summary, estimatedMachiningTimeMinutes: minutes }
}

/**
 * Bbox + stock + ops based estimate when legacy CAM is unavailable (aligned with camEngine placeholder).
 * Z stock span uses **`max(|Δz| part bbox, camStockZ)`** when **`camStockZ`** is set (grip stock-on-bed height).
 */
export function estimateCamPlaceholderSummary(
  process: CamProcessConfig,
  geometry: CamJobInputGeometry,
): { summary: CamJobSummary; perOp: CamOpStepSummary[] } {
  process = withLegacyCamProcessAliases(process)
  const bbox = geometry.bbox
  const rawDz = Math.abs(bbox.maxZ - bbox.minZ)
  const stockZ = Number(process.camStockZ)
  const zThru = Number(process.camZThru)
  const thruExtra = Number.isFinite(zThru) && zThru > 0 ? zThru : 0
  const rawSafeDz = clampPositive(
    (process.camStockOn !== false && Number.isFinite(stockZ) && stockZ > 0
      ? Math.max(rawDz, stockZ)
      : rawDz) *
      zAnchorStockSpanScale(process) +
      thruExtra,
    1,
  )
  const safeDz = effectiveGlobalZSpan(process, rawSafeDz)
  const { fx, fy } = footprintXY(process, bbox)
  const ops = process.ops ?? []

  if (!ops.length) {
    const roughOver = Number(process.camRoughOver)
    const pocketOver = Number(process.camPocketOver)
    const levelOver = Number(process.camLevelOver)
    const outlineOver = Number(process.camOutlineOver)
    const contourOver = Number(process.camContourOver)
    const traceOver = Number(process.camTraceOver)
    const latheOver = Number(process.camLatheOver)
    const implicitStep = clampPositive(
      Number.isFinite(roughOver) && roughOver > 0
        ? roughOver
        : Number.isFinite(pocketOver) && pocketOver > 0
          ? pocketOver
          : Number.isFinite(levelOver) && levelOver > 0
            ? levelOver
            : Number.isFinite(outlineOver) && outlineOver > 0
              ? outlineOver
              : Number.isFinite(contourOver) && contourOver > 0
                ? contourOver
                : Number.isFinite(traceOver) && traceOver > 0
                  ? traceOver
                  : Number.isFinite(latheOver) && latheOver > 0
                    ? latheOver
                    : Math.min(fx, fy) / 20,
      0.3,
    )
    const roughDown = Number(process.camRoughDown)
    const roughStockZ = Number(process.camRoughStockZ)
    const levelDown = Number(process.camLevelDown)
    const levelStepZ = Number(process.camLevelStepZ)
    const pocketDown = Number(process.camPocketDown)
    const outlineDown = Number(process.camOutlineDown)
    const traceDown = Number(process.camTraceDown)
    const traceThru = Number(process.camTraceThru)
    const helicalDown = Number(process.camHelicalDown)
    const helicalThru = Number(process.camHelicalThru)
    const drillDown = Number(process.camDrillDown)
    const registerThru = Number(process.camRegisterThru)
    const implicitDown = clampPositive(
      Number.isFinite(roughDown) && roughDown > 0
        ? Math.min(
            roughDown + (Number.isFinite(roughStockZ) && roughStockZ > 0 ? roughStockZ : 0),
            safeDz,
          )
        : Number.isFinite(pocketDown) && pocketDown > 0
          ? Math.min(pocketDown, safeDz)
          : Number.isFinite(levelStepZ) && levelStepZ > 0
            ? Math.min(levelStepZ, safeDz)
            : Number.isFinite(levelDown) && levelDown > 0
              ? Math.min(levelDown, safeDz)
            : Number.isFinite(outlineDown) && outlineDown > 0
              ? Math.min(outlineDown, safeDz)
              : Number.isFinite(traceDown) && traceDown > 0
                ? Math.min(
                    traceDown + (Number.isFinite(traceThru) && traceThru > 0 ? traceThru : 0),
                    safeDz,
                  )
                : Number.isFinite(helicalDown) && helicalDown > 0
                  ? Math.min(
                      helicalDown + (Number.isFinite(helicalThru) && helicalThru > 0 ? helicalThru : 0),
                      safeDz,
                    )
                  : Number.isFinite(drillDown) && drillDown > 0
                    ? Math.min(drillDown, safeDz)
                    : Number.isFinite(registerThru) && registerThru > 0
                      ? Math.min(registerThru, safeDz)
                      : safeDz,
      1,
    )
    const passes = Math.max(1, Math.ceil(safeDz / implicitDown))
    const cutLenPerPass = estimateCutLengthMmPerPass(fx, fy, implicitStep)
    const tabEase =
      tabSegmentScale(process) *
      easeSegmentScale(process) *
      expertSegmentScale(process) *
      arcFitSegmentScale({ type: 'rough' } as CamOperationInstance, process) *
      processOutputExtrasSegmentScale(process) *
      stockOptionsSegmentScale(process)
    const depthW = depthFirstSegmentScale({ type: 'rough' } as CamOperationInstance, process)
    const segments = Math.max(
      8,
      Math.round(
        ((passes * cutLenPerPass) / Math.max(implicitStep, 0.05)) *
          tabEase *
          depthW *
          stockIndexedSegmentScale({ type: 'rough' } as CamOperationInstance, process) *
          zOrderingSegmentScale({ type: 'rough' } as CamOperationInstance, process),
      ),
    )
    const nominalPathLengthMm = segments * implicitStep
    const summary = recalcMachiningMinutes(
      {
        opCount: 0,
        toolCountUsed: distinctProcessToolCount(process),
        estimatedTotalPasses: passes,
        estimatedTotalPathSegments: segments,
        estimatedMachiningTimeMinutes: 0,
      },
      process,
      nominalPathLengthMm,
    )
    return { summary, perOp: [] }
  }

  const usedTools = new Set<number>()
  let totalPasses = 0
  let totalSegments = 0
  let nominalPathLengthMm = 0

  const perOp: CamOpStepSummary[] = ops.map((op, idx) => {
    const step = resolveOpStepOver(op, process)
    const down = resolveOpDown(op, process, safeDz)
    const zSpan = effectiveZSpanForPasses(op, process, effectiveOpZOverrideSpan(op, safeDz))
    const passes = adjustedPassCount(op, process, zSpan, down)
    const cutLenPerPass = estimateCutLengthMmPerPass(fx, fy, step)
    const innerSeg = Math.max(4, Math.round(cutLenPerPass / Math.max(step, 0.05)))
    const tabEase =
      tabSegmentScale(process) *
      easeSegmentScale(process) *
      expertSegmentScale(process) *
      arcFitSegmentScale(op, process) *
      processOutputExtrasSegmentScale(process) *
      stockOptionsSegmentScale(process)
    const segments = Math.max(
      4,
      Math.round(
        passes *
          innerSeg *
          tabEase *
          depthFirstSegmentScale(op, process) *
          traceSegmentScale(op, process) *
          traceMergeScale(op, process, passes) *
          traceDogboneScale(op, process) *
          outlineSegmentScale(op, process) *
          contourSegmentScale(op, process) *
          levelSegmentScale(op, process) *
          roughSegmentScale(op, process) *
          pocketSegmentScale(op, process) *
          drillSegmentScale(op, process, safeDz) *
          helicalSegmentScale(op, process) *
          registerSegmentScale(op, process) *
          flipSegmentScale(op, process) *
          indexedSegmentScale(op, process) *
          gcodeSegmentScale(op, process) *
          laserSegmentScale(op, process) *
          latheSegmentScale(op, process) *
          stockIndexedSegmentScale(op, process) *
          zOrderingSegmentScale(op, process),
      ),
    )
    totalPasses += passes
    totalSegments += segments
    nominalPathLengthMm += segments * step
    const toolId = typeof op.tool === 'number' ? op.tool : null
    if (toolId != null) usedTools.add(toolId)
    return {
      opIndex: idx,
      type: op.type,
      toolId,
      estimatedPasses: passes,
      estimatedPathSegments: segments,
    }
  })

  const summary = recalcMachiningMinutes(
    {
      opCount: ops.length,
      toolCountUsed: usedTools.size,
      estimatedTotalPasses: totalPasses,
      estimatedTotalPathSegments: totalSegments,
      estimatedMachiningTimeMinutes: 0,
    },
    process,
    nominalPathLengthMm,
  )

  return { summary, perOp }
}

/**
 * After `cam_slice` fills `widget.slices` / `widget.camops`, align UI-facing summary with legacy output
 * instead of leaving zeros on the kiri-cam path.
 */
export function enrichCamJobSummaryFromPostSliceWidget(
  widget: { slices?: unknown[]; camops?: Array<{ op?: CamOperationInstance }> } | null | undefined,
  process: CamProcessConfig,
  base: { summary: CamJobSummary; perOp: CamOpStepSummary[] },
): { summary: CamJobSummary; perOp: CamOpStepSummary[] } {
  process = withLegacyCamProcessAliases(process)
  const slices = Array.isArray(widget?.slices) ? widget!.slices! : []
  const camops = Array.isArray(widget?.camops) ? widget!.camops! : []
  const slicePlanes = slices.length

  const toolsFromCamops = new Set<number>()
  for (const cop of camops) {
    const t = cop?.op?.tool
    if (typeof t === 'number' && Number.isFinite(t)) toolsFromCamops.add(t)
  }

  /** Legacy `camops` can be longer than `process.ops` rows in `perOp`; slice spread uses this denominator. */
  const opCountForHeuristics = Math.max(base.perOp.length, camops.length, 1)

  let summary = { ...base.summary }
  if (toolsFromCamops.size > 0) {
    summary.toolCountUsed = Math.max(summary.toolCountUsed, toolsFromCamops.size)
  }
  if (camops.length > 0) {
    summary.opCount = Math.max(summary.opCount, camops.length)
  }
  if (slicePlanes > 0) {
    summary.estimatedTotalPasses = Math.max(summary.estimatedTotalPasses, slicePlanes)
    const boost = slicePlanes * Math.max(8, Math.round(Math.max(1, opCountForHeuristics) * 6))
    summary.estimatedTotalPathSegments = Math.max(summary.estimatedTotalPathSegments, boost)
  }

  let nextPerOp: CamOpStepSummary[]
  if (base.perOp.length > 0) {
    nextPerOp = base.perOp.map((row, i) => {
      const cop = camops[i]
      const op = cop?.op
      if (!op) return row
      const toolId = typeof op.tool === 'number' ? op.tool : row.toolId
      const passes =
        slicePlanes > 0
          ? Math.max(row.estimatedPasses, Math.ceil(slicePlanes / opCountForHeuristics))
          : row.estimatedPasses
      return {
        ...row,
        type: (op.type as CamOpStepSummary['type']) ?? row.type,
        toolId,
        estimatedPasses: passes,
      }
    })
    if (camops.length > nextPerOp.length) {
      for (let i = nextPerOp.length; i < camops.length; i++) {
        const cop = camops[i]
        const op = cop?.op
        const toolId = typeof op?.tool === 'number' ? op.tool : null
        const passes =
          slicePlanes > 0 ? Math.max(1, Math.ceil(slicePlanes / opCountForHeuristics)) : 1
        nextPerOp.push({
          opIndex: i,
          type: (op?.type as CamOpStepSummary['type']) ?? 'rough',
          toolId,
          estimatedPasses: passes,
          estimatedPathSegments: 0,
        })
      }
    }
  } else if (slicePlanes > 0 && camops.length > 0) {
    const n = camops.length
    const passesEach = Math.max(1, Math.ceil(slicePlanes / n))
    const totalSeg = summary.estimatedTotalPathSegments
    const q = Math.floor(totalSeg / n)
    const r = totalSeg % n
    nextPerOp = camops.map((cop, idx) => {
      const op = cop?.op
      const toolId = typeof op?.tool === 'number' ? op.tool : null
      const segs = idx < r ? q + 1 : q
      return {
        opIndex: idx,
        type: (op?.type as CamOpStepSummary['type']) ?? 'rough',
        toolId,
        estimatedPasses: passesEach,
        estimatedPathSegments: Math.max(0, segs),
      }
    })
  } else if (slicePlanes > 0) {
    nextPerOp = [
      {
        opIndex: 0,
        type: 'rough',
        toolId: null,
        estimatedPasses: slicePlanes,
        estimatedPathSegments: Math.max(1, summary.estimatedTotalPathSegments),
      },
    ]
  } else {
    nextPerOp = []
  }

  const segSum = nextPerOp.reduce((a, r) => a + r.estimatedPathSegments, 0)
  const targetSeg = summary.estimatedTotalPathSegments
  if (slicePlanes > 0 && segSum > 0 && targetSeg > segSum) {
    const ratio = targetSeg / segSum
    const scaled = nextPerOp.map((row) => ({
      ...row,
      estimatedPathSegments:
        row.estimatedPathSegments <= 0
          ? 0
          : Math.max(1, Math.round(row.estimatedPathSegments * ratio)),
    }))
    const running = scaled.reduce((a, r) => a + r.estimatedPathSegments, 0)
    const diff = targetSeg - running
    if (diff !== 0 && scaled.length) {
      const li = scaled.length - 1
      const last = scaled[li]!
      scaled[li] = {
        ...last,
        estimatedPathSegments: Math.max(1, last.estimatedPathSegments + diff),
      }
    }
    nextPerOp = scaled
  }

  summary = recalcMachiningMinutes(
    summary,
    process,
    nominalPathLengthFromPerOp(process, nextPerOp, camops),
    camops,
  )
  return { summary, perOp: nextPerOp }
}
