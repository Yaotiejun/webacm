export type CamToolType = 'endmill' | 'ballmill' | 'tapermill' | 'drill'

// Mirrors grip/grid-apps-master CAM device schema (kiri-cam-device.json)
export interface CamDeviceConfig {
  mode: 'CAM'
  deviceName: string
  bedHeight: number
  bedWidth: number
  bedDepth: number
  maxHeight: number
  originCenter: boolean
  spindleMax: number

  // Output formatting
  gcodeSpace: boolean
  gcodeStrip: boolean
  gcodeFExt?: string

  // G-code macros / templates
  gcodePre: string[]
  gcodePost: string[]
  gcodeDwell: string[]
  gcodeSpindle: string[]
  gcodeChange: string[]

  // Legacy fields observed in grip JSON
  noclone?: boolean
  internal?: number
  new?: boolean
}

// Mirrors grip/grid-apps-master CAM tool schema (kiri-cam-tools.json)
export interface CamTool {
  id: number
  number: number
  name: string
  type: CamToolType
  metric: boolean

  shaft_diam: number
  shaft_len: number
  flute_diam: number
  flute_len: number
  taper_tip: number
}

export type CamOperationType =
  | 'outline'
  | 'level'
  | 'rough'
  | 'contour'
  | 'register'
  | 'drill'
  | 'trace'
  | 'pocket'
  | 'gcode'
  | 'helical'
  /** Rotary / contour lathe path; grip `cl-ops.js` `lathe` popOp. */
  | 'lathe'
  | 'laser'
  /** Grip `cl-ops.js` laser popOp names (legacy `camops` / widget). */
  | 'laser on'
  | 'laser off'
  | 'indexed'
  /** Grip popOp name `index` (same placeholder semantics as `indexed`). */
  | 'index'
  /** Stock axis flip prep; grip `cl-ops.js` `flip` popOp. */
  | 'flip'

// Minimal common op instance; individual ops may include extra fields.
// Mirrors the per-op objects in kiri-cam-process.json "ops" array.
export interface CamOperationInstance {
  type: CamOperationType
  tool?: number
  spindle?: number

  // Common numeric knobs used across ops
  down?: number
  step?: number
  over?: number
  rate?: number
  speed?: number
  plunge?: number
  leave?: number
  /** Leveling XY inset / offset (mm); grip maps `inset` → `camLevelInset`. */
  inset?: number
  /** Level stock-aware mode; grip `level` popOp `stock` → `camLevelStock` on save. */
  stock?: boolean
  /** Trace offset overlap (mm); grip maps `offover` → `camTraceOffOver` on process. */
  offover?: number
  /** Trace stock-through (mm); grip maps `thru` → `camTraceThru` on process. */
  thru?: number
  /** Rough indexed “clear all”; grip maps `all` → `camRoughAll`. */
  all?: boolean
  /** Pocket follow (mm); grip maps `follow` → `camPocketFollow`. */
  follow?: number
  /** Pocket XY expand (mm); grip `expand` → `camPocketExpand`; per-op **`expand`** scales **`pocketSegmentScale`** (offset shells), while process **`camPocketExpand`** still adds to default step-over resolution. */
  expand?: number
  /** Drill dwell; grip `dwell` → `camDrillDwell`. */
  dwell?: number
  /** Drill peck lift (mm); grip `lift` → `camDrillLift`. */
  lift?: number
  /** Drill mark-only; grip `mark` → `camDrillMark`. */
  mark?: boolean
  /** Level Z step (mm); grip maps `stepz` → `camLevelStepZ`. */
  stepz?: number
  /** Rough Z stock / leave (mm); grip maps `leavez` → `camRoughStockZ`. */
  leavez?: number
  /** Register axis (`-`, `X`, …); flip op uses same field → **`camFlipAxis`** (grip **`cl-ops.js`**). */
  axis?: string
  /** Register X/Y slot count: **2** straight, **3** with corner jog (grip register **`points`** / **`regpoints`**). */
  points?: number
  /** Trace mode: `follow` | `clear` (grip `mode` → `camTraceType`). */
  mode?: string
  /** Trace offset side: `none` | `inside` | `outside` (grip `offset` → `camTraceOffset`). Helical: preset string → **`camHelicalOffset`**. Register X/Y: slot offset (mm) → **`camRegisterOffset`**. */
  offset?: string | number
  /** Outline wide shell count (grip `steps` → `camOutlineOverCount`). */
  steps?: number
  /** Outline wide shell mode; grip **`wide` → `camOutlineWide`**. */
  wide?: boolean
  /** Outline corner dogbones; grip **`dogbones` → `camOutlineDogbone`**. */
  dogbones?: boolean
  /** Outline omit void regions; grip **`omitvoid` → `camOutlineOmitVoid`**. */
  omitvoid?: boolean
  /** Omit through-holes in rough shadow or outline; grip **`omitthru`** → **`camRoughOmitThru`** / **`camOutlineOmitThru`** (by op **`type`**). */
  omitthru?: boolean
  /** Trace follow merge (union overlaps); grip maps `merge` → `camTraceMerge`. */
  merge?: boolean
  /** Trace dogbone corners; grip maps `dogbone` → `camTraceDogbone`. */
  dogbone?: boolean
  /** Trace reverse dogbone (grip `revbone` UI; maps to process field in grip). */
  revbone?: boolean
  /** Trace bottom pass (process `camTraceBottom`); per-op override for merged / hand-edited ops. */
  traceBottom?: boolean
  /** Per-op Z override top (mm); grip expand **`ov_topz`** on rough / outline / trace / pocket. */
  ov_topz?: number
  /** Per-op Z override bottom (mm); grip **`ov_botz`**. */
  ov_botz?: number
  /** Per-op climb vs conventional; grip **`ov_conv`** (overrides **`camConventional`** when set). */
  ov_conv?: boolean
  /** Contour / pocket-contour mesh tolerance (mm); grip maps popOp **`tolerance` → `camTolerance`** (per-widget override). */
  tolerance?: number
  /** Contour flatness (0–1); grip contour **`flatness` → `camFlatness`**. */
  flatness?: number
  /** Contour decimation steps; grip **`reduction` → `camContourReduce`**. */
  reduction?: number
  /** Contour mesh bottom pass; grip contour **`bottom` → `camContourBottom`**. */
  bottom?: boolean
  /** Contour bridge width (mm); grip contour **`bridging` → `camContourBridge`**. */
  bridging?: number
  /** Lathe step angle (deg); grip `lathe` popOp `angle` → `camLatheAngle`. */
  angle?: number
  /** Lathe linear vs rotary stepping; grip `linear` → `camLatheLinear`. */
  linear?: boolean
  /** Lathe stock offset start (mm); grip `offStart` → `camLatheOffStart`. */
  offStart?: number
  /** Lathe stock offset end (mm); grip `offEnd` → `camLatheOffEnd`. */
  offEnd?: number

  // Common boolean toggles
  /** Outline / rough / contour inner semantics: outline **`camOutlineIn`**, rough **`camRoughIn`**, contour mesh-inside (**`camContourIn`**, grip **`topo3`**). */
  inside?: boolean
  /** Outline stock-side cut vs inner-only (grip **`camOutlineOut`** / **`camOutlineIn`**). */
  outside?: boolean
  top?: boolean
  /** Rough void clearing; grip **`voids` → `camRoughVoid`**. */
  voids?: boolean
  /** Rough flat regions pass; grip **`flats` → `camRoughFlat`**. */
  flats?: boolean
  /** Trace as line segments vs curves; grip `lines: 'camTraceLines'`. */
  lines?: boolean
  /** Index rotation (deg); grip `index` popOp `degrees` → `camIndexAxis` on process when saved. */
  degrees?: number
  /** Index absolute vs incremental; grip `absolute` → `camIndexAbs`. */
  absolute?: boolean
  /** Custom G-code for `gcode` op; grip `gcode` → `camCustomGcode` (string or line array). */
  gcode?: string | string[]
  /** Pocket contour pocket (mesh); grip `contour` → `camPocketContour`. */
  contour?: boolean
  /** Pocket engrave; grip `engrave` → `camPocketEngrave`. */
  engrave?: boolean
  /** Pocket outline shell; grip `outline` → `camPocketOutline`. */
  outline?: boolean
  /** Pocket smooth passes; grip **`smooth` → `camPocketSmooth`**. */
  smooth?: number
  /** Pocket contour refine passes; grip **`refine` → `camPocketRefine`**. */
  refine?: number
  /** Drill peck precision; grip **`precision` → `camDrillPrecision`**. */
  precision?: number
  /** Drill or helical start from stock top; grip **`fromTop`** → **`camDrillFromStockTop`** / **`camHelicalFromStockTop`**. */
  fromTop?: boolean
  /** Flip invert other-axis hint; grip **`invert` → `camFlipInvert`**. */
  invert?: boolean
  /** Helical bottom finish pass; grip **`finish` → `camHelicalBottomFinish`**. */
  finish?: boolean
  /** Helical tangential entry; grip **`entry` → `camHelicalEntry`**. */
  entry?: boolean
  /** Helical entry offset (mm); grip **`entryOffset` → `camHelicalEntryOffset`**. */
  entryOffset?: number
  /** Helical reverse cut direction; grip **`reverse` → `camHelicalReverse`**. */
  reverse?: boolean
  /** Helical clockwise vs CCW; grip **`clockwise` → `camHelicalClockwise`**. */
  clockwise?: boolean
  /** Helical start angle (deg); grip **`startAng` → `camHelicalStartAngle`**. */
  startAng?: number
  /** Force helical start angle; grip **`forceStartAng` → `camHelicalForceStartAngle`**. */
  forceStartAng?: boolean
  /** Helical offset override (mm); grip **`offOver` → `camHelicalOffsetOverride`**. */
  offOver?: number
  /** Register face cutting feed (mm/min, axis **`-`**); grip **`feed` → `camRegisterSpeed`**. */
  feed?: number
  /** Laser adaptive power; grip laser **`adapt` → `camLaserAdaptive`**. */
  adapt?: boolean
  /** Laser adaptive ramp mod; grip **`adaptrp` → `camLaserAdaptMod`**. */
  adaptrp?: boolean
  /** Laser Z flatten pass; grip **`flat` → `camLaserFlatten`** (use only on laser ops). */
  flat?: boolean
  /** Laser flatten Z (mm); grip **`flatz` → `camLaserFlatZ`**. */
  flatz?: number
  /** Laser adaptive power min (0–1); grip **`minp` → `camLaserPowerMin`**. */
  minp?: number
  /** Laser adaptive power max (0–1); grip **`maxp` → `camLaserPowerMax`**. */
  maxp?: number
  /** Laser Z band min (mm); grip **`minz` → `camLaserZMin`**. */
  minz?: number
  /** Laser Z band max (mm); grip **`maxz` → `camLaserZMax`**. */
  maxz?: number
  /** Laser power 0–1 when not adaptive; grip **`power` → `camLaserPower`**. */
  power?: number

  // Freeform for op-specific parameters (keeps early migration flexible)
  [key: string]: any
}

export type CamZAnchor = 'top' | 'middle' | 'bottom'

// Mirrors grip/grid-apps-master CAM process schema (kiri-cam-process.json)
export interface CamProcessConfig {
  processName: string

  // Operation defaults (selected highlights; grip contains many more)
  camLevelTool?: number
  camLevelSpindle?: number
  camLevelOver?: number
  camLevelSpeed?: number
  camLevelDown?: number
  /** Z step between level passes (mm); grip `cl-ops.js` `stepz: 'camLevelStepZ'`. */
  camLevelStepZ?: number
  /** Stock-aware leveling mode; grip `stock: 'camLevelStock'`. */
  camLevelStock?: boolean
  /** XY inset for level passes (mm); grip `cl-ops.js` `inset: 'camLevelInset'`. */
  camLevelInset?: number

  camRoughTool?: number
  camRoughSpindle?: number
  camRoughDown?: number
  camRoughOver?: number
  camRoughSpeed?: number
  camRoughPlunge?: number
  camRoughStock?: number
  /** Extra Z stock allowance (mm); grip `leavez: 'camRoughStockZ'`. */
  camRoughStockZ?: number
  /** Omit through-holes in rough shadow; grip `omitthru: 'camRoughOmitThru'`. */
  camRoughOmitThru?: boolean
  camRoughVoid?: boolean
  camRoughFlat?: boolean
  /** Clear stock above part top in rough; grip **`init-menu.js`** / process **`camRoughTop`**. */
  camRoughTop?: boolean
  camRoughIn?: boolean
  /** Master roughing enabled (grip **`conf.js`** `roughingOn`); placeholder nudges down when **`false`**. */
  camRoughOn?: boolean
  /** Indexed rough “clear all”; grip `all: 'camRoughAll'`. */
  camRoughAll?: boolean

  camOutlineTool?: number
  camOutlineSpindle?: number
  camOutlineDown?: number
  camOutlineOver?: number
  /** Wide outline offset pass count (grip `cl-ops.js` `steps: 'camOutlineOverCount'`). */
  camOutlineOverCount?: number
  camOutlineSpeed?: number
  camOutlinePlunge?: number
  camOutlineWide?: boolean
  /** Legacy wide-outline flag; merged into `camOutlineWide` when canonical is absent (`withLegacyCamProcessAliases`). Grip `conf.js` `renamed.camWideCutout`. */
  camWideCutout?: boolean
  camOutlineDogbone?: boolean
  camOutlineOmitVoid?: boolean
  camOutlineOmitThru?: boolean
  camOutlineOut?: boolean
  camOutlineIn?: boolean
  /** Master outline/finishing enabled (grip **`conf.js`** `finishingOn`); placeholder nudges down when **`false`**. */
  camOutlineOn?: boolean
  /** Clear top stock pass (grip `cl-ops.js` `top: 'camOutlineTop'`). */
  camOutlineTop?: boolean

  camContourTool?: number
  camContourSpindle?: number
  camContourOver?: number
  /** Stock / wall leave (mm); grip `cl-ops.js` maps contour `leave` → `camContourLeave`. */
  camContourLeave?: number
  camContourSpeed?: number
  camContourAngle?: number
  camContourCurves?: boolean
  /** Mesh contour clip inside part shadow vs expanded shell; grip `inside` → `camContourIn` (see **`topo3.js`**). */
  camContourIn?: boolean
  camContourXOn?: boolean
  camContourYOn?: boolean
  camContourBottom?: boolean
  camContourBridge?: number
  /** Layer / mesh filter scripts (contour + lathe popOp); grip `cl-ops.js` `filter: 'camContourFilter'`. */
  camContourFilter?: string[] | string
  /** Path simplification level (0–10); grip `cl-ops.js` `reduction: 'camContourReduce'`. */
  camContourReduce?: number

  camTraceTool?: number
  camTraceSpindle?: number
  camTraceType?: string
  /** `none` | `inside` | `outside` — grip `cl-ops.js` maps trace `offset` → this. */
  camTraceOffset?: string
  camTraceOver?: number
  camTraceDown?: number
  /** Stock / extra cut-through depth (mm); grip `cl-ops.js` maps `thru` → this. */
  camTraceThru?: number
  camTraceSpeed?: number
  camTracePlunge?: number
  /** Offset overlap (mm); grip `cl-ops.js` maps `offover` → this. */
  camTraceOffOver?: number
  /** Optional Z band (mm) for trace pass count; grip process `camTraceZTop` / `camTraceZBottom` (delta when both set). */
  camTraceZTop?: number
  camTraceZBottom?: number
  camTraceLines?: boolean
  camTraceBottom?: boolean
  /** Follow-mode union of overlapping traces; grip `cl-ops.js` maps `merge` → this. */
  camTraceMerge?: boolean
  /** Corner dogbones on trace; grip maps `dogbone` → this. */
  camTraceDogbone?: boolean

  /** Laser / marking feed cap (mm/min); seen on grip device templates (e.g. Carvera). */
  camLaserSpeed?: number
  /** Grip `cl-ops.js` laser on popOp — adaptive power/Z band. */
  camLaserAdaptive?: boolean
  camLaserAdaptMod?: boolean
  camLaserFlatten?: boolean
  camLaserFlatZ?: number
  camLaserZMin?: number
  camLaserZMax?: number
  camLaserPower?: number
  camLaserPowerMin?: number
  camLaserPowerMax?: number
  camLaserEnable?: string[] | string
  camLaserOn?: string[] | string
  camLaserOff?: string[] | string
  camLaserDisable?: string[] | string

  /** Lathe mode tool / feed (grip `conf.js`); counted in distinct process tools and feed cap. */
  camLatheTool?: number
  camLatheSpindle?: number
  camLatheSpeed?: number
  /** Lathe step-over (mm); grip `cl-ops.js` `step` → `camLatheOver`. */
  camLatheOver?: number
  /** Lathe angular step (deg); grip `angle` → `camLatheAngle`. */
  camLatheAngle?: number
  camLatheLinear?: boolean
  camLatheOffStart?: number
  camLatheOffEnd?: number

  camDrillTool?: number
  camDrillSpindle?: number
  camDrillDownSpeed?: number
  camDrillDown?: number
  camDrillDwell?: number
  camDrillLift?: number
  /** Master drilling enabled (grip **`conf.js`** `drillingOn`); placeholder nudges down when **`false`**. */
  camDrillingOn?: boolean
  camDrillMark?: boolean
  /** Extra drill-through depth (mm); grip `thru: 'camDrillThru'` (per-op `thru` on drill rows). */
  camDrillThru?: number
  /** Drill precision / peck factor; grip `precision: 'camDrillPrecision'`. */
  camDrillPrecision?: number
  /** Drill from stock top; grip `fromTop: 'camDrillFromStockTop'`. */
  camDrillFromStockTop?: boolean

  camRegisterTool?: number
  camRegisterSpeed?: number
  camRegisterThru?: number
  camRegisterOffset?: number

  camHelicalTool?: number
  camHelicalSpindle?: number
  camHelicalDownSpeed?: number
  camHelicalSpeed?: number
  camHelicalDown?: number
  camHelicalBottomFinish?: boolean
  camHelicalThru?: number
  camHelicalOffset?: string
  camHelicalForceStartAngle?: boolean
  camHelicalStartAngle?: number
  camHelicalOffsetOverride?: number
  camHelicalEntry?: boolean
  camHelicalEntryOffset?: number
  camHelicalReverse?: boolean
  camHelicalClockwise?: boolean
  /** Helical entry from stock top; grip `fromTop: 'camHelicalFromStockTop'`. */
  camHelicalFromStockTop?: boolean

  /** Flip rotation axis (`X`, `Y`, …); grip `flip` popOp `axis` → `camFlipAxis`. */
  camFlipAxis?: string
  /** Optional flip note / secondary axis hint (grip **`camFlipOther`** string). */
  camFlipOther?: string
  /** Flip other-axis hint; grip `invert: 'camFlipInvert'`. */
  camFlipInvert?: boolean
  /** Index rotation (deg); grip `degrees: 'camIndexAxis'`. */
  camIndexAxis?: number
  /** Index absolute vs incremental; grip `absolute: 'camIndexAbs'`. */
  camIndexAbs?: boolean
  /** Custom G-code lines for `gcode` op; grip `gcode: 'camCustomGcode'`. */
  camCustomGcode?: string[] | string

  camPocketSpindle?: number
  camPocketTool?: number
  camPocketOver?: number
  camPocketDown?: number
  /** Pocket Z band top (mm); with **`camPocketZBottom`**, clips placeholder pocket pass span (grip **`conf.js`**). */
  camPocketZTop?: number
  /** Pocket Z band bottom (mm); see **`camPocketZTop`**. */
  camPocketZBottom?: number
  camPocketSpeed?: number
  camPocketPlunge?: number
  camPocketExpand?: number
  /** Pocket follow distance (mm); grip `follow: 'camPocketFollow'`. */
  camPocketFollow?: number
  camPocketSmooth?: number
  camPocketContour?: boolean
  camPocketEngrave?: boolean
  /** Pocket outline shell; grip `outline: 'camPocketOutline'` (legacy typo `cmaPocketOutline` still read in bridge). */
  camPocketOutline?: boolean
  cmaPocketOutline?: boolean
  /** Contour-pocket refine passes; grip `refine: 'camPocketRefine'`. */
  camPocketRefine?: number
  cmaPocketRefine?: number

  // Tabs
  camTabsWidth?: number
  camTabsHeight?: number
  camTabsDepth?: number
  camTabsMidline?: boolean

  // Z/limits
  camDepthFirst?: boolean
  camEaseDown?: boolean
  /** Ramp entry angle (deg); grip `conf.js` `camEaseAngle`. */
  camEaseAngle?: number
  /** Pocket/shell inside-first ordering; grip `init-menu.js` `camInnerFirst`. */
  camInnerFirst?: boolean
  /** Emit tool-init / preamble in post; grip `camToolInit`. */
  camToolInit?: boolean
  /** Prefer top Z levels first; grip `camFirstZMax`. */
  camFirstZMax?: boolean
  /** Force Z-max path semantics in prepare; grip `camForceZMax`. */
  camForceZMax?: boolean
  /** Ramp full-engage ratio (0–1); grip `camFullEngage` — lower ⇒ longer ramp motion. */
  camFullEngage?: number
  /** Z origin at stock top; grip **`cl-origin.js`** / export **`camOriginTop`**. */
  camOriginTop?: boolean
  /** Origin XY at center vs corner; grip `camOriginCenter`. */
  camOriginCenter?: boolean
  /** Manual origin offsets (mm); grip `camOriginOffX` / `OffY` / `OffZ`. */
  camOriginOffX?: number
  camOriginOffY?: number
  camOriginOffZ?: number
  camZAnchor?: CamZAnchor
  camZOffset?: number
  /** Global Z top bound (mm); grip `camZTop` with `camZBottom` clips placeholder stock span when both set. */
  camZTop?: number
  camZBottom?: number
  camZClearance?: number
  camZThru?: number
  camFastFeed?: number
  camFastFeedZ?: number

  // Stock
  camStockX?: number
  camStockY?: number
  camStockZ?: number
  /** When clipping, expand clip box by part XY size (`dx+sx`, `dy+sy`); grip stock offset. */
  camStockOffset?: boolean
  /** Clip effective stock XY to the stock box; grip `camStockClipTo` (see `footprintXY`). */
  camStockClipTo?: boolean
  camStockOn?: boolean
  /** Indexed stock / 4th-axis stock mode; grip `init-menu.js` `camStockIndexed`. */
  camStockIndexed?: boolean
  /** Show index grid when indexed; grip `camStockIndexGrid`. */
  camStockIndexGrid?: boolean

  // Output/expert
  /** Mesh / curve flatness (0–1); grip `cl-ops.js` contour `flatness: 'camFlatness'`. */
  camFlatness?: number
  camTolerance?: number
  /** Climb vs conventional on rough/outline overrides; grip rough `ov_conv: '~camConventional'`. */
  camConventional?: boolean
  /** Device/process bed origin at center; grip `init.js` / `platform.js` `ctOriginCenter`. */
  ctOriginCenter?: boolean
  /** Origin relative to machine bounds (2D/WEDM paths); grip `platform.js` `ctOriginBounds`. */
  ctOriginBounds?: boolean
  ctOriginOffX?: number
  ctOriginOffY?: number
  outputInvertX?: boolean
  outputInvertY?: boolean
  camExpertFast?: boolean
  camTrueShadow?: boolean
  /** Arc fitting in post (grip `prepare.js`); when true with positive tol/res, paths gain G2/G3 line approximations. */
  camArcEnabled?: boolean
  camArcTolerance?: number
  camArcResolution?: number

  // Ops array (sequence)
  ops?: CamOperationInstance[]

  // Allow forward-compatible fields while migrating.
  [key: string]: any
}
