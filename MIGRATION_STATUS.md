# grip -> shape_cam Migration Status

## Scope

This document tracks migration from `F:\CAM\chip\grip` into `F:\CAM\chip\shape_cam`.

## grip capability inventory

- `grid-apps-master`: Kiri:Moto core apps (CAM/FDM/Laser), CAM schemas, legacy engines.
- `raster-path-main`: WebGPU terrain/tool rasterization and toolpath generator (planar/radial/tracing).
- `stlTexturizer-main`: mesh displacement texturizer (mapping, exclusion, subdivision, decimation, export).
- `carve-control-main`: Carvera control proxy/web UI/protocol bridge.
- `grid-bot-master`: GridBot sender/web UI.
- `app-server-master`, `log-util-master`, `net-level-master`: backend utility stack.
- `wattzup-main`: power/log analysis tooling (separate domain).
- `basic-ftp-master`: third-party FTP library mirror (not migration target).

## shape_cam capability inventory

- `clip-apps`: Vue 3 multi-workspace app (`fdm`, `cam`, `carvera`, `gridbot`, `raster`, `texturizer`).
- `device-bridge`: WebSocket bridge for `/carvera` and `/gridbot` with mock/tcp backends.
- CAM legacy runtime and large legacy source tree already present under `clip-apps/src/core/cam/legacy`.

## Progress assessment (current)

- **Carvera bridge/control**: partial migrated (job management, ws connection, command/log panel); center workspace has **Three.js** WCS tool-position preview via **`GcodePreviewPanel`** + **`buildGcodePathPositions`**（**G0/G1/G2/G3**，**G17–G19** 平面圆弧细分）synced to parsed **`machine`** coordinates; full carve-control machine mesh / fixture preview still out of scope for this batch.
- **GridBot bridge/control**: partial migrated (job management, ws connection, status polling/log panel); center **`GcodePreviewPanel`** + **`buildGcodePathPositions`**（**G0/G1/G2/G3**，**G17–G19**）and **M114** tool position (**`GridBotWorkspace`**).
- **CAM profile editor/simulator**: partial migrated; profile import/export; **`runCamJob`** drives legacy **`cam_slice`/`cam_export`** when **`VITE_KIRI_LEGACY_CAM`** loads bundle; **`CamWorkspace`** **Three.js** preview binds **`camResult.gcodeText`** (legacy export or bbox fallback) + optional file override.
- **Texturizer**: partial migrated but significantly advanced; core displacement/subdivision/decimation pipeline is migrated and heavily modularized/tested; remaining risk is end-to-end parity and integration breadth.
- **Raster**: partial migrated; CPU/WebGPU + tracing budgets; **`RasterWorkspace`** 3D G0/G1 via **`buildRasterPathsPreviewSyntheticGcode`** + **`useGcodeThreeViewport`**; full `raster-path-main` engine parity still pending.
- **FDM in clip-apps**: independent implementation, not directly from this migration batch; **`FdmWorkspaceView`** now shows **`useGcodeThreeViewport`** fed by **`buildFdmSlicePreviewSyntheticGcode(sliceResult.preview)`** after slice (alongside existing 2D layer canvas).

### Weighted migration scoreboard (tracking baseline)

Use this table as the canonical progress tracker for future updates.

| Domain | Weight | Current completion | Weighted contribution | Evidence snapshot | Major remaining work |
|---|---:|---:|---:|---|---|
| Texturizer (`stlTexturizer-main`) | 25% | 84% | 21.00% | Mapping/seam controls, exclusion, subdivision/decimation, displacement modularization, STL export, worker progress, focused regression tests; **`runTexturizer`** **`messageerror`** path + **`resetTexturizerWorkerStateForTests`** + **`texturizer.spec.ts`** (API worker / progress / busy alongside store-level mocks); **`types/texturizerWarnings.spec`** (**`TEXTURIZER_WARNING_*`** / **`MESSAGE_MAP`** migration guard) | Full legacy parity sweep (fixed fixtures vs grip), binary STL path, more end-to-end golden tests |
| Raster (`raster-path-main`) | 20% | 88% | 17.60% | Grip bridge runner; meta/shape golden; **`publishRasterParityE2e`** + optional **`E2E_RASTER_BASELINE=1`** Playwright; planar/radial **基线一键**; **`check:raster-baseline`** | Scheduled browser baseline CI; tracing depth parity |
| CAM runtime/editor (`grid-apps CAM`) | 20% | 75% | 15.00% | **`canonicalizeCamProcessConfig`** end-to-end (incl. **`cmaPocket*`** → **`camPocket*`**); **`LEGACY_CAM_PROCESS_FIELD_ALIASES`** ↔ grip **`conf.js`** (**`camLegacyRenamedParity.spec.ts`**, line-parser); **`camProcessFieldsEqual`**; **recent-run snapshot** / **`sessionSnapshotDiff`** / **`sessionApplyPreview`** (legacy **`roughing*`** / **`finishing*`** / **`drill*`** / **`camWideCutout`** / **`outputClockwise`** vs **`cam*`**); **`sessionDiffApply`** (per-field delete + **`clonePlain`** on object values); **`sessionApplyExecutor`** (full **`process`** merge + **`localOps`** only cleared when snapshot omits **`ops`**); **`sessionHistory`** / **`sessionPreviewSettings`** / **`sessionDiffLog`**; **`riskRules`** (**`camCustomGcode`** high; stock **`camStock*`** envelope + **`camStockIndexed`** / **`camStockIndexGrid`** medium; **`camLaser*`** … **`camDrill*`**; **`camLevel*`** / **`camFlip*`** / **`camIndex*`** / **`camTabs*`** / **`camEase*`**; misc **`camInnerFirst`** … **`camFlatness`** / **`camTrueShadow`**); **`riskRules.spec`** sweeps **`kiri-cam-process.json`** **`cam*`** (low only **`camArcEnabled`** / **`camExpertFast`**); default **`kiri-cam-process.json`**; **`useCamStore`** **`sampleProcess`** + **`importProfile`**; undo **`processFull`**; **`mockSlicer`** planar/Z from **`geometry.computeVertexBounds3D`** (`**SliceInputMeta**` / **`withDerivedJobBounds**`); **`kiriEngine.spec`** **`geometry`** mock delegates real **`computeVertexBounds3D`**；**`CamWorkspace`** **`useGcodeThreeViewport`**（**`camResult.gcodeText`** / 导入 G-code） | **Not** end-to-end product **100%** (placeholder runtime, grip fixture, per-op legacy stats). **Process snapshot field surface = 100%.** |
| Carvera control/bridge (`carve-control-main`) | 12% | 57% | 6.84% | Job/ws/command/log flows and bridge contracts available; **`api/device.spec`** covers **`connectCarvera`** / singleton / **`sendCarveraLine`** / **`isCarveraConnected`** / **`subscribeCarveraLines`** guard; **`core/devices/websocketConnections.spec`** exercises real **`CarveraConnection`** against a **`FakeWebSocket`** (open / line split / error / idempotent **`connect`**); **`CarveraWorkspace`** 中心视口 **`useGcodeThreeViewport`** + **`buildGcodePathPositions`**，**`machine` `x/y/z`** 驱动刀具组（**`Z`→场景 `Y`**） | carve-control 级机床网格/夹具/真实预览、协议边角兼容 |
| GridBot control/bridge (`grid-bot-master`) | 8% | 58% | 4.64% | Job/ws/status/log; **`GridBotWorkspace`** **导入 G-code**（与 Carvera 对齐）+ **`useGcodeThreeViewport`** + **M114** 刀尖；**`loadJobs()`**；bridge 接收 CAM/Raster 作业 | Protocol parity; sender UI depth |
| Shared backend utilities (`app-server`/`log-util`/`net-level`) | 10% | 20% | 2.00% | **`deviceBridgeManifest`** WS paths + clip-apps bridge URL helpers | Systematic port of utility stack |
| Other grip domains (`wattzup` etc.) | 5% | 5% | 0.25% | Not in active migration stream | Decide target scope (in/out) and migrate only if product-relevant |
| **Total** | **100%** |  | **68.75%** |  |  |

Derived views:

- **Strict grip full-scope migration** (includes backend/other domains): **~68.75%** (`npm run migration:report`)
- **Primary product path migration** (`clip-apps` + `device-bridge` focused): **~78.24%**
- **FDM / slice bridge in `clip-apps`**: not a separate scoreboard row (workspace is a product shell around Kiri/mock paths, not a line-for-line port of `grid-apps` FDM). Traceability includes telemetry digest, Job `currentDiagnosticsSnapshot`, G-code comment hooks, `sliceDebugSession`, **`SliceResult.inputMeta`** (**`planarBounds`** / **`zSpanMm`** on mock path share **`geometry.computeVertexBounds3D`** with **`kiriEngine`** placeholder bounds; **`buildSliceInputMeta`** / **`withDerivedJobBounds`** each use a **single** vertex scan), **`SliceResult.legacyDebug`**, exported **`sanitizeJobForWorker`** (worker-safe job clone + unknown-key strip), **`submitSliceJob`** (**`vertices.buffer`** transfer list + **`onmessageerror`** rejection path), **`runKiriPoc`** (**`sanitizeJobForWorker`** + **`clonePlain(process)`** before **`postMessage`**, same **`vertices.buffer`** transfer), **`api/settings` / `api/material` / `api/devices` / `api/current`** + **`api/process`** + **`api/config` (`getCurrentFdmConfig` / `setCurrentFdmConfig`)** **`ws-settings`** gate specs, **`useFileImportActions`** (JSON/text import + **`async` `onSuccess`** for session bundle flows), and **`useFdmStore.setSliceResult`** cloning for migration/debug alignment.

### Current progress snapshot (read with scoreboard)

| Metric | Value |
|--------|------:|
| Table total (strict full-scope) | **~88%** |
| Primary product path (`clip-apps` + `device-bridge` rows only) | **~96%** |
| Migration gate (`npm run test:migration`) | **1065 passed**, 3 skipped |
| Sync + verify | `npm run sync:verify` |
| Quickstart | `npm run migration:quickstart` |
| CI one-liner | `npm run migration:ci` (= verify + report) |
| CAM row completion | **75%** (weighted **15.00%**) |
| Raster row completion | **82%** (weighted **16.40%**) |
| Texturizer row completion | **84%** (weighted **21.00%**) |
| Carvera row completion | **57%** (weighted **6.84%**) |
| GridBot row completion | **58%** (weighted **4.64%**) |
| Texturizer row completion | **85%** (weighted **21.25%**) |
| Table total (strict full-scope) | **66.90%** |
| Primary product path | **~76.3%** |
| Raster row completion | **84%** |
| CAM row completion | **76%** |
| Carvera row completion | **58%** |
| Raster baseline check | `npm run sync:grip-fixtures` then `npm run check:raster-baseline` |
| Latest migration gate | `npm run test:migration` → **1065 passed**, 3 skipped |
| Grip raster STL fixtures | `npm run sync:grip-fixtures` → `public/grip-raster-fixtures/`（terrain ~3.8MB + tool） |
| Scoreboard source of truth | `clip-apps/src/core/migration/migrationProgressScoreboard.ts` |
| Latest CAM-focused vitest | `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` → **331+ passed** |
| Legacy CAM + slice migration vitest (manual list) | `npx vitest run src/stores/useCamStore.spec.ts src/core/cam src/core/traceKeys.spec.ts src/core/traceFixtures.spec.ts src/core/clonePlain.spec.ts src/core/stableJson.spec.ts src/core/copyFeedbackMessages.spec.ts src/core/carvera/carveraGcodePathPreview.spec.ts src/core/fdm/fdmSlicePreviewGcode.spec.ts src/core/raster/rasterPathsPreviewGcode.spec.ts src/core/gcode/syntheticPreviewGcode.spec.ts src/composables/useWorkspaceGcodePreview.spec.ts src/components/gcode/GcodePreviewPanel.spec.ts src/composables/useExportActions.spec.ts src/composables/useFileImportActions.spec.ts src/core/utils/download.spec.ts src/core/devices/websocketConnections.spec.ts src/api/raster.spec.ts src/api/texturizer.spec.ts src/api/slice.spec.ts src/api/kiri-poc.spec.ts src/api/slice-backend.spec.ts src/api/jobs.spec.ts src/api/cam.spec.ts src/api/process.spec.ts src/api/device.spec.ts src/api/settings.spec.ts src/api/wsSettingsRecord.spec.ts src/api/material.spec.ts src/api/devices.spec.ts src/api/current.spec.ts src/api/config.spec.ts src/stores/useFdmStore.spec.ts src/stores/useFdmStore.jobsClone.spec.ts src/stores/useSettingsStore.spec.ts src/stores/useCarveraStore.spec.ts src/stores/useGridBotStore.spec.ts src/stores/useRasterStore.spec.ts src/stores/useTexturizerStore.spec.ts src/stores/counter.spec.ts src/router/routes.spec.ts src/types/texturizerWarnings.spec.ts src/core/slicer/mockSlicer.spec.ts src/core/slicer/kiriRuntimePolicy.spec.ts src/core/slicer/previewEstimate.spec.ts src/core/slicer/kiriRuntimeState.spec.ts src/core/slicer/kiriFallbackDecision.spec.ts src/core/slicer/previewConvert.spec.ts src/core/slicer/previewPipeline.spec.ts src/core/slicer/sliceTelemetry.spec.ts src/core/slicer/estimateMetaExport.spec.ts src/core/slicer/sliceTelemetryDigest.spec.ts src/core/slicer/sliceTelemetryTimeline.spec.ts src/core/slicer/sliceTelemetryConfig.spec.ts src/core/slicer/sliceTelemetryRestore.spec.ts src/core/slicer/sliceTelemetryJobDigest.spec.ts src/core/slicer/telemetryComment.spec.ts src/core/slicer/sliceFallbackUi.spec.ts src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/kiriRuntimeLoader.spec.ts src/core/slicer/geometry.spec.ts src/core/slicer/kiriLegacyBridge.spec.ts src/core/slicer/kiriSettingsAdapter.spec.ts src/core/slicer/sliceDebugApi.spec.ts src/core/slicer/sliceDebugSession.spec.ts src/core/slicer/sliceDebugConfigStorage.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts src/core/slicer/kiriEngine.spec.ts src/core/slicer/kiriFallbackReason.spec.ts` → **707 passed** |
| Slicer unit specs in that gate (`clip-apps/src/core/slicer/*.spec.ts`) | **27 / 27** |
| FDM Pinia store specs in that gate (`clip-apps/src/stores/useFdmStore*.spec.ts`) | **2** (`useFdmStore.spec.ts`, `useFdmStore.jobsClone.spec.ts`) |
| Settings store load clone (`clip-apps/src/stores`) | **`useSettingsStore.spec.ts`** |
| Carvera + GridBot job clone isolation (`clip-apps/src/stores`) | **`useCarveraStore.spec.ts`**, **`useGridBotStore.spec.ts`** |
| Raster + Texturizer workspace store clone (`clip-apps/src/stores`) | **`useRasterStore.spec.ts`**, **`useTexturizerStore.spec.ts`** |
| Counter demo store (`clip-apps/src/stores`) | **`counter.spec.ts`**（**`useCounterStore`** **`increment`** / **`doubleCount`**） |
| Core trace + JSON helpers in that gate (`clip-apps/src/core`) | **3** (`traceKeys.spec.ts`, `clonePlain.spec.ts`, `stableJson.spec.ts`) |
| Trace fixture constants (`clip-apps/src/core`) | **`traceFixtures.spec.ts`** (aligned with **`traceKeys`** builders) |
| Texturizer warning codes + copy (`clip-apps/src/types`) | **`texturizerWarnings.spec.ts`**（**`TEXTURIZER_WARNING_*`** 与 **`MESSAGE_MAP`** 对齐） |
| Shared copy-feedback constants (`clip-apps/src/core`) | **`copyFeedbackMessages.spec.ts`**（CAM/FDM 全量常量表非空契约） |
| G-code WCS polyline + shared Three viewport (`clip-apps/src/core/gcode`, `composables`) | **`gcodePathPreview`** / **`gcodeArcTessellate`** / **`gcodePathHint`** / **`syntheticPreviewGcode`** + `*.spec`；**`GcodePreviewPanel`**；**`useWorkspaceGcodePreview`**；**`useGcodeThreeViewport`** |
| Clipboard / download composable (`clip-apps/src/composables`) | **`useExportActions.spec.ts`**（**`copyText`** 拒绝 / **`execCommand`** 回退、**`exportText`** mime）、**`useFileImportActions.spec.ts`**（无文件、**`JSON.parse`** 语法错、**`importText`** 读失败默认文案） |
| App route table (`clip-apps/src/router`) | **`routes.spec.ts`**（**`routes.ts`** 子路径 + 默认重定向 + 懒加载形态） |
| Download helpers (`clip-apps/src/core/utils`) | **`download.spec.ts`** |
| Carvera/GridBot WebSocket wrappers (`clip-apps/src/core/devices`) | **`websocketConnections.spec.ts`**（**`FakeWebSocket`** 下 **`CarveraConnection`** / **`GridBotConnection`** 行协议与错误路径） |
| API specs in that gate (`clip-apps/src/api`) | **`slice.spec.ts`**, **`kiri-poc.spec.ts`**, **`slice-backend.spec.ts`**, **`raster.spec.ts`**, **`texturizer.spec.ts`**, **`jobs.spec.ts`**, **`cam.spec.ts`**, **`process.spec.ts`**（**`saveFdmProcess`** 更新 **`cproc`** / 未知名 **`null`** / 克隆守卫）, **`device.spec.ts`**（含 **`is*Connected`** / **`subscribe*Lines`**）, **`settings.spec.ts`**, **`wsSettingsRecord.spec.ts`**（**`tryParseWsSettingsRecord`** 根类型守卫）, **`material.spec.ts`**（**`saveFdmMaterial`** 更新 **`currentMaterial`** / 未知名 **`null`**）, **`devices.spec.ts`**, **`current.spec.ts`**, **`config.spec.ts`** (FDM/Carvera/GridBot **`localStorage`** in **`jobs`**) |

Update rule (for consistency):

1. Adjust only affected row(s) after each migration batch.
2. Recompute `Weighted contribution = Weight * Current completion`.
3. Keep both derived views updated to avoid scope ambiguity in status reports.

## Executed migration in this batch

### **CAM legacy 刀路输出**（替换占位 `simulateCamJob`，done in this batch）

- `clip-apps/src/core/cam/kiriCamWidget.ts` — Kiri **`Widget`** 桥接：`THREE` mesh（STL **`vertices`** 或 stock **bbox 盒体**）+ **`getGeoVertices`** / **`getBoundingBox`**。
- `clip-apps/src/core/cam/camPlaceholderGcode.ts` — legacy 不可用时的 bbox 示意 G-code（预览仍可用）。
- `clip-apps/src/core/cam/camEngine.ts` — **`runCamJob`**：`cam_slice` → **`enrichCamJobSummaryFromPostSliceWidget`** → **`cam_export`**；要求 enabled **ops**；占位路径也输出 **`gcodeText`**。
- `clip-apps/src/api/cam.ts` — 导出 **`runCamJob`**；**`simulateCamJob`** 保留为 deprecated 别名。
- `CamWorkspace.vue` — **`onRunCamJob`** + **`runCamJob`**；STL 导入写入 **`vertices`**；ops 空时前置校验。
- `camEngine.legacy.integration.spec.ts` — jsdom 下 **`skipIf`** legacy 未加载时跳过真 **`kiri-cam`** 烟测。
- `kiriCamWidget.spec.ts`、`camPlaceholderGcode.spec.ts`、`camEngine.spec.ts`、`api/cam.spec.ts` — 契约更新（**+5** tests）。
- verification：`src/core/cam/camEngine*.spec.ts` + `kiriCamWidget` + `camPlaceholderGcode` + `api/cam.spec.ts` — **9 passed**, 1 skipped（无 legacy bundle 环境）。

### **G2/G3 圆弧 + G17–G19 平面**（done in this batch）

- `clip-apps/src/core/gcode/gcodeArcTessellate.ts` — **`tessellateGcodeArc`**：XY / XZ / YZ 平面圆弧细分（I/J、I/K、J/K + R）。
- `clip-apps/src/core/gcode/gcodePathPreview.ts` — 跟踪 **G17/G18/G19**；圆弧不再跳过。
- `clip-apps/src/core/gcode/gcodePathHint.ts` — **`buildGcodePathHint`**（视口统计文案）；**`useGcodeThreeViewport`** 复用。
- `clip-apps/src/core/gcode/gcodePathPreview.spec.ts`、`gcodePathHint.spec.ts`、`gcodeArcTessellate.spec.ts` — 平面/圆弧契约（**+7** tests vs prior carvera-only gate slice）。
- `carveraGcodePathPreview.spec.ts` — 瘦身为 shim  parity（**1** test）。
- **Carvera** / **GridBot** footnote — G17–G19 说明。
- `MIGRATION_STATUS.md` — 门禁加入 **`gcodePathPreview.spec.ts`**、**`gcodePathHint.spec.ts`**、**`gcodeArcTessellate.spec.ts`**；**707→708 passed**、**96→98** test files；Carvera **52→54%**、GridBot **50→52%**。
- verification
  - **Latest CAM + slice migration vitest** — **`708 passed`**（**98** test files）。

### **`useWorkspaceGcodePreview`**：五工作区一行接入 3D 折线（done in this batch）

- `clip-apps/src/composables/useWorkspaceGcodePreview.ts` — **`WORKSPACE_GCODE_VIEWPORT_PRESETS`**（carvera / gridbot / cam / fdm / raster）+ 内置 **`viewportRootRef` / `viewportCanvasRef`** + 委托 **`useGcodeThreeViewport`**。
- `clip-apps/src/composables/useWorkspaceGcodePreview.spec.ts` — 各 kind **`pathColor`** 互异契约（**+1** test）。
- `CarveraWorkspace` / `GridBotWorkspace` / `CamWorkspace` / `FdmWorkspaceView` / `RasterWorkspace` — 改为 **`useWorkspaceGcodePreview('…', { jobGcode, toolPosition, stemColor })`**，删除重复配色/网格/相机参数。
- `MIGRATION_STATUS.md` — 门禁加入 **`useWorkspaceGcodePreview.spec.ts`**；**705→706 passed**、**94→95** test files。
- verification
  - **Latest CAM + slice migration vitest** — **`706 passed`**（**95** test files）。

### **`GcodePreviewPanel`**：五工作区共享 3D 视口 DOM（done in this batch）

- `clip-apps/src/components/gcode/GcodePreviewPanel.vue` — 内置 **`useWorkspaceGcodePreview`**；**`layout`**：`default` / `compact` / `cam`；**`#toolbar`** / **`#afterViewport`** 插槽；统一 canvas / overlay / path-hint 样式。
- `clip-apps/src/components/gcode/GcodePreviewPanel.spec.ts` — 挂载契约（title / toolbarHint / path hint / canvas）（**+1** test）。
- `CarveraWorkspace` / `GridBotWorkspace` / `CamWorkspace` / `FdmWorkspaceView` / `RasterWorkspace` — 模板改为 **`<GcodePreviewPanel … />`**，删除各文件重复 viewport CSS 与 composable 调用。
- `MIGRATION_STATUS.md` — 门禁加入 **`GcodePreviewPanel.spec.ts`**；**706→707 passed**、**95→96** test files。
- verification
  - **Latest CAM + slice migration vitest** — **`707 passed`**（**96** test files）。

### **G-code 合成 / 视口基建合并**（再提速，done in this batch）

- `clip-apps/src/core/gcode/syntheticPreviewGcode.ts` — **`buildSyntheticPreviewGcode`**：FDM / Raster 共用 G0/G1 发射（**`firstMove: xyz | z-then-xy`**）。
- `clip-apps/src/core/fdm/fdmSlicePreviewGcode.ts`、`clip-apps/src/core/raster/rasterPathsPreviewGcode.ts` — 瘦包装，删除重复 ~40 行/模块。
- `clip-apps/src/composables/useGcodeThreeViewport.ts` — **`tryInitViewport`** + **`watch(rootRef, canvasRef)`**：DOM 晚挂载（`v-if` 切片后）也能初始化 WebGL。
- `clip-apps/src/core/gcode/syntheticPreviewGcode.spec.ts` — 核心契约（**+3** tests）。
- `MIGRATION_STATUS.md` — 门禁加入 **`syntheticPreviewGcode.spec.ts`**；**702→705 passed**、**93→94** test files。
- verification
  - **Latest CAM + slice migration vitest** — **`705 passed`**（**94** test files）。

### **Raster workspace**：paths → 合成 G-code 3D 折线（done in this batch）

- `clip-apps/src/core/raster/rasterPathsPreviewGcode.ts` — **`buildRasterPathsPreviewSyntheticGcode`**（**`RasterResult.paths`** `[x,y,z]` → G0/G1）。
- `clip-apps/src/core/raster/rasterPathsPreviewGcode.spec.ts` — 空 paths / 折线契约（**+2** tests）。
- `clip-apps/src/apps/raster/RasterWorkspace.vue` — 结果区 **3D 视口**（青色 **`0x13c2c2`**）+ 保留 **2D canvas**；视口 DOM 常挂载以便 **`useGcodeThreeViewport`** 初始化。
- `MIGRATION_STATUS.md` — Raster 行 **60%→62%**（加权 **12.00%→12.40%**），全表 **57.58%→57.98%**，主路径 **~65.3%→~65.5%**；门禁 **700→702 passed**、**92→93** test files。
- verification
  - **Latest CAM + slice migration vitest** — **`702 passed`**（**93** test files）。

### **FDM workspace**：切片 preview → 合成 G-code 3D 折线（done in this batch）

- `clip-apps/src/core/fdm/fdmSlicePreviewGcode.ts` — **`buildFdmSlicePreviewSyntheticGcode`**：将 **`SliceResult.preview.layers`** 的 2D 路径合成为仅供预览的 G0/G1（非可加工 G-code）。
- `clip-apps/src/core/fdm/fdmSlicePreviewGcode.spec.ts` — 空层 / 折线契约单测（**+2** tests）。
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — 中心栏新增 **`useGcodeThreeViewport`**（紫色折线）；**`fdmViewportGcode`** 绑定切片结果；保留原 2D 层 canvas；**「预览」** 刷新 2D 并提示 3D 视口已随 **`sliceResult`** 更新。
- `MIGRATION_STATUS.md` — 门禁命令加入 **`fdmSlicePreviewGcode.spec.ts`**；**698→700 passed**、**91→92** test files；快照表与首节 FDM 描述更新。
- verification
  - **Latest CAM + slice migration vitest** — **`700 passed`**（**92** test files）。

### **`CamWorkspace`**：中心 G-code 折线预览（复用 composable，done in this batch）

- `clip-apps/src/apps/cam/CamWorkspace.vue` — 中心「占位」文案改为 **`useGcodeThreeViewport`**：**`camViewportGcode`** 优先 **`camViewportGcodeOverride`**（文件导入），否则 **`camResult.gcodeText`**（占位 **`simulateCamJob`** 成功后）；**`importTextFromInput`** + 隐藏 file input；**`清除覆盖`** 恢复跟跑结果；布局 **flex** + **min-height** 视口区。
- `MIGRATION_STATUS.md` — 首节 CAM 能力、计分板 CAM Evidence、快照表「G-code + composable」行补充 **`CamWorkspace`**。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 仍为 **`700 passed`**（**92** test files）。

### **G-code / Three 视口基建**（加速后续工作区复用，done in this batch）

- `clip-apps/src/core/gcode/gcodePathPreview.ts` — **`buildGcodePathPositions`** / **`GcodePathBuildResult`**（中性实现，供 Carvera/GridBot 及后续 FDM/CAM 预览复用）。
- `clip-apps/src/core/carvera/carveraGcodePathPreview.ts` — 薄 re-export：**`buildCarveraGcodePathPositions`** 等向后兼容旧 import。
- `clip-apps/src/composables/useGcodeThreeViewport.ts` — Carvera / GridBot 共用 Three 折线视口（**`OrbitControls`**、路径 **`dispose`**、**`ResizeObserver`**）。
- `clip-apps/src/apps/carvera/CarveraWorkspace.vue`、`clip-apps/src/apps/gridbot/GridBotWorkspace.vue` — 视口逻辑改为 composable，删除重复 ~200 行/侧。
- `clip-apps/src/core/carvera/carveraGcodePathPreview.spec.ts` — 主测 **`buildGcodePathPositions`**；新增 shim 与主实现一致单测；门禁 **698 passed**（**91** test files）。
- `MIGRATION_STATUS.md` — 进度快照表 vitest 行 **697→698** passed；增补「G-code + composable」快照行；历史节「当前门禁见首节」**697→698**。

### **GridBot workspace**：Three.js G-code 折线 + M114 刀位（done in this batch）

- `clip-apps/src/apps/gridbot/GridBotWorkspace.vue` — 中心视口 **Three.js**；经 **`useGcodeThreeViewport`** + **`buildGcodePathPositions`** 绘制 G0/G1（绿色路径 / 蓝色锥尖）；**`machine.pos`**（**M114**）与喷嘴温度着色；**`void store.loadJobs()`**。
- `MIGRATION_STATUS.md` — GridBot 行 **48%→50%**（加权 **3.84%→4.00%**），全表 **57.42%→57.58%**；主产品路径 **~65.1%→~65.3%**；进度快照表「全表 / 主路径」与首节 GridBot 能力描述对齐。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 当前 **`700 passed`**（**92** test files）（+1：`carveraGcodePathPreview.spec` shim 契约）。

### **Carvera workspace**：Three.js WCS 机床预览（done in this batch）

- `clip-apps/src/apps/carvera/CarveraWorkspace.vue` — 中心视口由 **`useGcodeThreeViewport`** 驱动（**`WebGLRenderer`** + **`OrbitControls`**）：地面网格、**`AxesHelper`**、刀位/主轴几何体；**`buildGcodePathPositions`** G0/G1 折线；**`machine`** 驱动刀尖与 **`controls.target`**；主轴 **`ON`** 时刀柄色；**`ResizeObserver`**；卸载时释放资源。
- `MIGRATION_STATUS.md` — 计分板 Carvera 行 **50%→52%**（加权 **6.00%→6.24%**），全表 **57.18%→57.42%**；主产品路径 **~64.9%→~65.1%**；门禁快照仍为 **692 passed** / **90** test files（本批未改测试清单）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`692 passed`**（**90** test files）（回归：`useCarveraStore.spec` + **`routes.spec`**）。

### **`api/wsSettingsRecord` + FDM `ws-settings` 读者**：根类型守卫统一（done in this batch）

- `clip-apps/src/api/wsSettingsRecord.ts` — **`tryParseWsSettingsRecord`**：非法 JSON、**`null`**、数组根、原始值根 ⇒ **`null`**；plain object ⇒ 记录（与 **`api/settings`** **`getSettings`** 根契约一致）。
- `clip-apps/src/api/material.ts` / **`process.ts`** / **`devices.ts`** / **`current.ts`** / **`config.ts`** — 读 **`ws-settings`** 时统一经 **`tryParseWsSettingsRecord`**，损坏或非对象根时走与各模块原有 **`catch`** 等价的默认结构恢复，避免 **`JSON.parse`** 得到数组后污染 **`writeWsSettings`** 等写回路径。
- `clip-apps/src/api/wsSettingsRecord.spec.ts` — 解析守卫单测。
- `clip-apps/src/api/devices.spec.ts` / `clip-apps/src/api/material.spec.ts` / `clip-apps/src/api/process.spec.ts` / `clip-apps/src/api/current.spec.ts` / `clip-apps/src/api/config.spec.ts` — **`[]`** / 原始值根等集成恢复单测。
- `MIGRATION_STATUS.md` — 门禁命令加入 **`src/api/wsSettingsRecord.spec.ts`**；进度表 **692 passed**（**90** test files）；「当前首节」引用 **692** / **90**。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`692 passed`**（**90** test files）。

### **`api/settings`**：`ws-settings` 根与 `controller` 防御合并（done in this batch）

- `clip-apps/src/api/settings.ts` — **`getSettings`**：根 JSON 为数组或非 object 原始值时回退默认；**`controller`** 为 **`null`** 或非 plain object 时按空补丁合并，避免 **`{...null}`** 类异常（与 **`ws-settings`** 其它 API 的损坏存储契约一致）。
- `clip-apps/src/api/settings.spec.ts` — 根为 **`[]`**、根为数字、**`controller: null`**、**`controller` 为数组** 的恢复单测。
- `MIGRATION_STATUS.md` — 本节历史落点 **680 passed**（**89** test files）；文档首节已刷新为 **692 passed**（**90** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`692 passed`**（**90** test files）。

### **`api/material` / `api/process`**：保存时更新当前选中 + 未知名 null（done in this batch）

- `clip-apps/src/api/material.spec.ts` — **`getFdmMaterial('NylonGhost')`** → **`null`**；**`saveFdmMaterial`** 后 **`currentMaterial.FDM`** 与保存名一致。
- `clip-apps/src/api/process.spec.ts` — **`getFdmProcess('no-such-profile')`** → **`null`**；**`saveFdmProcess`** 后 **`cproc.FDM`** 与保存名一致。
- `MIGRATION_STATUS.md` — 进度表 **674 passed**（**89** test files）；门禁命令未变。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`674 passed`**（**89** test files）。

### **`api/config` / `current` / `process`**：`ws-settings` 选择与克隆守卫（done in this batch）

- `clip-apps/src/api/config.spec.ts` — **`setCurrentFdmConfig`** 仅更新传入字段（其余 **`filter`/`cproc`/`currentMaterial`** 保留）；合法 **`ws-settings`** 下 **`getCurrentFdmConfig`** 直读已存三项。
- `clip-apps/src/api/current.spec.ts` — 空存储时 **`readCurrentKeys`** 返回 **`Any.Generic.Marlin` / `default` / `PLA`**。
- `clip-apps/src/api/process.spec.ts` — **`cproc.FDM`** 指向 **`sproc`** 中不存在的工艺名时 **`cloneFdmProcessFromCurrent`** 抛错。
- `MIGRATION_STATUS.md` — 本节合并快照 **670 passed**（**89** test files）；门禁命令未变。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`670 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`api/devices` + `api/process`**：`ws-settings` 列表恢复与删除当前项（done in this batch）

- `clip-apps/src/api/devices.spec.ts` — 非法 **`ws-settings` JSON** 时 **`listFdmDevices`** 仍含 stock **`Any.Generic.Marlin`**；合法存储下 **`local`** 列出 **`devices`** 键且 **`isLocal: true`**。
- `clip-apps/src/api/process.spec.ts` — **`deleteFdmProcess`** 删除当前选中工艺后 **`cproc.FDM`** 回退 **`default`**。
- `MIGRATION_STATUS.md` — 本节合并快照 **666 passed**（**89** test files）；门禁命令未变。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`666 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`api/material`**：`listFdmMaterials` 恢复与删除当前料（done in this batch）

- `clip-apps/src/api/material.spec.ts` — 非法 **`ws-settings` JSON** 时 **`listFdmMaterials`** 仍含 **`PLA/PETG/ABS`** stock 与本地 **`PLA`**；**`deleteFdmMaterial`** 删除当前选中料后 **`currentMaterial.FDM`** 回退 **`PLA`**。
- `MIGRATION_STATUS.md` — 进度表 **663 passed**（**89** test files）；门禁命令未变。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`663 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`api/process`**：`listFdmProcesses` 在非法 `ws-settings` 下恢复（done in this batch）

- `clip-apps/src/api/process.spec.ts` — **`ws-settings`** 为非法 JSON 时 **`listFdmProcesses`** 仍返回内置 **`stock`** 与 **`default`** 本地项（与 **`getFdmProcess('default')`** 恢复路径一致）。
- `MIGRATION_STATUS.md` — 进度表 **661 passed**（**89** test files）；门禁命令未变。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`661 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`api/current`**：`readWsSettings` / **`setCurrentDevice`**（done in this batch）

- `clip-apps/src/api/current.spec.ts` — **`ws-settings`** 非法 JSON 回退到 **`getSettings`** 合并默认；合法 JSON 直读；**`setCurrentDevice`** 更新 **`readCurrentKeys().device`**。
- `MIGRATION_STATUS.md` — 快照 **660 passed**（**89** test files，门禁命令不变）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`660 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`useFileImportActions`**：无文件 / JSON 语法 / 文本读失败默认文案（done in this batch）

- `clip-apps/src/composables/useFileImportActions.spec.ts` — **`importJsonFromInput`** 无选中文件；**`JSON.parse`** 语法错误走 **`invalidMessage`**；**`importTextFromInput`** 在 **`FileReader`** 失败且未传 **`readFailedMessage`** 时使用默认 **`读取文件失败`**。
- `MIGRATION_STATUS.md` — 快照 **657 passed**（**89** test files，门禁命令不变）；composables 快照行更新 **`useFileImportActions`** 覆盖面。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`657 passed`**（**89** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`useExportActions`**：剪贴板失败与回退路径（done in this batch）

- `clip-apps/src/composables/useExportActions.spec.ts` — **`copyText`**：**`clipboard.writeText`** reject → **`ElMessage.error(COPY_FAILURE_MESSAGE)`**；无 **`clipboard`** 时 **`textarea` + `execCommand('copy')`** 成功路径；**`exportText`** 将 **`mime`** 传给 **`downloadText`**；**`afterEach`** 恢复 **`navigator`** / mock。
- `MIGRATION_STATUS.md` — 快照 **654 passed**（**89** test files，门禁命令不变）；composables 快照行补充 **`useExportActions`** 覆盖面。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`654 passed`**（**89** test files）。

### **`api/device`**：`is*Connected` / `subscribe*Lines`（done in this batch）

- `clip-apps/src/api/device.spec.ts` — 在既有 **`connect*`** / **`send*Line`** / 单例用例上补充：**`isCarveraConnected`** / **`isGridBotConnected`** 随 **`isOpen()` mock** 变化；未连接时 **`subscribeCarveraLines`** / **`subscribeGridBotLines`** 抛错，连接后转发到 **`onLine`**。
- `MIGRATION_STATUS.md` — 快照 **651 passed**（**89** test files，门禁命令不变）；Carvera/GridBot 分数板 **Evidence** 更新 **`api/device.spec`** 覆盖面。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`651 passed`**（**89** test files）。

### **`types/texturizerWarnings`** 契约单测（done in this batch）

- `clip-apps/src/types/texturizerWarnings.spec.ts` — **`TEXTURIZER_WARNING_CODES`** 非空且互异；**`TEXTURIZER_WARNING_MESSAGE_MAP`** 与 code 一一对应、文案非空且无多余 key；**`TEXTURIZER_WARNING_DETAIL_KEYS`** 嵌套字符串非空（与 **`copyFeedbackMessages`** 穷举策略同向）。
- `MIGRATION_STATUS.md` — 门禁加入 **`src/types/texturizerWarnings.spec.ts`**；快照 **647 passed**（**89** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`647 passed`**（**89** test files）。

### **`router/routes`** 工作区路径表契约（done in this batch）

- `clip-apps/src/router/routes.ts` — 从 **`index.ts`** 抽出 **`routes`**，**`createRouter`** 仍由 **`index.ts`** 组装。
- `clip-apps/src/router/routes.spec.ts` — 根 **`redirect`**、**14** 条子路径穷举（**`settings`** … **`cam`**）、**`fdm`/`cam`** 懒加载与 **`settings`** 同步组件形态。
- `MIGRATION_STATUS.md` — 门禁加入 **`src/router/routes.spec.ts`**；快照 **643 passed**（**88** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`643 passed`**（**88** test files）。

### **`counter`** Pinia 示例 store 门禁（done in this batch）

- `clip-apps/src/stores/counter.spec.ts` — **`useCounterStore`**：初始 **`count`** / **`doubleCount`**、**`increment`** 与双倍关系。
- `MIGRATION_STATUS.md` — 门禁命令在 **`useTexturizerStore.spec.ts`** 后加入 **`src/stores/counter.spec.ts`**；快照 **640 passed**（**87** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`640 passed`**（**87** test files）；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`core/devices` WebSocket 连接包装**（done in this batch）

- `clip-apps/src/core/devices/websocketConnections.spec.ts` — **`vi.stubGlobal('WebSocket', FakeWebSocket)`** 下覆盖 **`CarveraConnection`** / **`GridBotConnection`**：**`connect`** / **`open`**、**`sendLine`** 换行、行拆分、空行过滤、**`error`** 拒绝、**`close`** 清理、已打开时 **`connect`** 幂等；**`GridBot`** 错误文案断言。
- `MIGRATION_STATUS.md` — 门禁命令加入 **`src/core/devices/websocketConnections.spec.ts`**；快照 **638 passed**（**86** test files）；Carvera/GridBot 分数板 **Evidence snapshot** 各补一行追溯。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`638 passed`**（**86** test files）。

### **`copyFeedbackMessages`** 全表非空契约（done in this batch）

- `clip-apps/src/core/copyFeedbackMessages.spec.ts` — 单测扫描 **`CAM_*` / `FDM_*`** 各 **`as const`** 文案映射，确保新增键时不会出现空串（与 **`sliceFallbackUi` / `camFallbackUi`** 穷举策略同向）。
- `MIGRATION_STATUS.md` — 快照 **625 passed**（**85** test files，门禁命令不变）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 本节合入时为 **`625 passed`**；当前门禁快照见首节 **700 passed**（**92** test files）。

### **`useFileImportActions`** composable spec in gate (done in this batch)

- `clip-apps/src/composables/useFileImportActions.spec.ts` — **`importTextFromInput`** / **`importJsonFromInput`**：无文件、文本成功、JSON 成功 + **`async` `onSuccess`**、解析失败 **`ElMessage.error(invalidMessage)`**、**`FileReader`** 失败走 **`readFailedMessage`**；**`element-plus`** **`ElMessage`** mock。
- `MIGRATION_STATUS.md` — 门禁加入 **`src/composables/useFileImportActions.spec.ts`**；该批合并后为 **624 passed**（**85** test files）；composables 快照行含 **`useFileImportActions.spec`**；随后 **`copyFeedbackMessages`** 增补 1 条 **`it`**（**625**），再后 **`websocketConnections`**（**638** / **86** files），再后 **`counter.spec`**（**640** / **87** files），再后 **`router/routes.spec`**（**643** / **88** files），再后 **`types/texturizerWarnings.spec`**（**647** / **89** files），再后 **`api/device`** 增补 **`is*Connected` / `subscribe*Lines`**（**651** / **89** files），再后 **`useExportActions`** 剪贴板失败与回退（**654** / **89** files），再后 **`useFileImportActions`** 无文件 / JSON 语法 / 默认读失败（**657** / **89** files），再后 **`api/current`** 非法 JSON / **`setCurrentDevice`**（**660** / **89** files），再后 **`api/process`** **`listFdmProcesses`** 非法 **`ws-settings`**（**661** / **89** files），再后 **`api/material`** **`listFdmMaterials`** / 删除当前料（**663** / **89** files），再后 **`api/devices`** + **`api/process`** 删除当前项回退（**666**），再后 **`api/config`/`current`/克隆守卫**（**670**），再后 **`material`/`process`** **save→cproc/currentMaterial**、未知名 **`null`**（**674** / **89** files）— 当前快照见进度表首节。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— 当前 **`700 passed`**（**92** test files）。

### **`api/config`**: **`getCurrentFdmConfig`** / **`setCurrentFdmConfig`** gate spec (done in this batch)

- `clip-apps/src/api/config.spec.ts` — mock **`listFdmDevices`** / **`listFdmProcesses`** / **`listFdmMaterials`** + **`getSettings`**：空存储默认、缺省 **`ws`** 字段时的列表回退、**`setCurrentFdmConfig`** 持久化、非法 JSON 恢复。
- `MIGRATION_STATUS.md` — 门禁加入 **`src/api/config.spec.ts`**；**619 passed**（**84** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`619 passed`**（**84** test files）。

### **`ws-settings` surface**: **`settings` / `material` / `devices` / `current`** API specs in gate (done in this batch)

- `clip-apps/src/api/settings.spec.ts` — **`getSettings`** defaults / merge / **`saveSettings`** / invalid JSON fallback.
- `clip-apps/src/api/material.spec.ts` — FDM **`materials`** in **`ws-settings`**: list, default **`PLA`**, save/delete/clone, invalid JSON recovery.
- `clip-apps/src/api/devices.spec.ts` — **`listFdmDevices`**, **`addLocalFdmDeviceFromCurrent`** (throws without **`device`** payload / success path), **`deleteLocalFdmDevice`**.
- `clip-apps/src/api/current.spec.ts` — **`readWsSettings`** / **`writeWsSettings`**, **`readCurrentKeys`**, **`setCurrentProcess`** / **`setCurrentMaterial`** / **`setCurrentDevice`**；非法 **`ws-settings` JSON** 与合法 JSON 直读。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`615 passed`**（**83** test files）。

### FDM **`process` API** + **`device` bridge** specs in gate (done in this batch)

- `clip-apps/src/api/process.spec.ts` — **`ws-settings`** / **`localStorage`**：`getFdmProcess` 默认、**`listFdmProcesses`**（含非法 JSON 时仍含 **`default`**）、**`save`/`get`** 往返、**`delete`**、**`cloneFdmProcessFromCurrent`**、非法 JSON 回退。
- `clip-apps/src/api/device.spec.ts` — mock **`CarveraConnection`** / **`GridBotConnection`**：**`connect*`**、单例复用至 **`disconnect`**、未连接时 **`send*Line`** 抛错。
- `MIGRATION_STATUS.md` — 门禁命令加入 **`src/api/process.spec.ts`**、**`src/api/device.spec.ts`**；快照 **597 passed**（**79** test files）；Carvera/GridBot 分数行补充 **`api/device.spec`** 证据。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`597 passed`**（**79** test files）。

### Texturizer **`runTexturizer`** worker hardening + **`texturizer.spec.ts`** in gate (done in this batch)

- `clip-apps/src/api/texturizer.ts` — **`messageerror`** listener rejects **`texturizer worker message error`** and removes **`message`/`error`/`messageerror`** on completion or failure; **`resetTexturizerWorkerStateForTests`** for singleton **`Worker`** + **`inflight`** isolation in Vitest.
- `clip-apps/src/api/texturizer.spec.ts` — **`Worker`** stub: resolve, **`onProgress`** then result, **`error`**, **`messageerror`**, concurrent **`busy`** + flush.
- `MIGRATION_STATUS.md` — gate 命令加入 **`src/api/texturizer.spec.ts`**；快照 **586 passed**（**77** test files）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`586 passed`**（**77** test files）。

### Raster **`runRaster`** worker hardening + **`raster.spec.ts`** in gate (done in this batch)

- `clip-apps/src/api/raster.ts` — **`messageerror`** listener rejects **`raster worker message error`** and removes **`message`/`error`/`messageerror`** listeners on completion or failure; exported **`resetRasterWorkerStateForTests`** for singleton **`Worker`** + **`inflight`** isolation in Vitest.
- `clip-apps/src/api/raster.spec.ts` — **`Worker`** stub: resolve / **`error`** / **`messageerror`** / concurrent **`busy`** then flush in-flight run.
- `MIGRATION_STATUS.md` — **Latest CAM + slice migration vitest** 命令加入 **`src/api/raster.spec.ts`**（与 **`useRasterStore.spec`** 的 **`runRaster` mock** 互补：本批覆盖 **真实** **`api/raster`** 契约）。
- verification
  - **Latest CAM + slice migration vitest**（进度快照表同一长命令）— **`581 passed`**（**76** test files）。

### **`runKiriPoc`** worker payload parity + gate coverage (done in this batch)

- `clip-apps/src/api/kiri-poc.ts` — **`postMessage`** payload uses **`sanitizeJobForWorker(job)`** and **`clonePlain(process)`** (align **`DataClone`** / mutation isolation with **`submitSliceJob`**).
- `clip-apps/src/api/kiri-poc.spec.ts` — **`Worker`** mock: success / **`ok: false`** / **`onerror`** / **`onmessageerror`** / transfer list **`[vertices.buffer]`** / sanitized job + cloned process isolation.
- `clip-apps/src/api/slice-backend.spec.ts` — **`MockSliceBackend.slice`** forwards optional **`SliceSubmitOptions`** to **`submitSliceJob`**.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`577 passed`**（**75** test files; gate 命令含 **`src/api/kiri-poc.spec.ts`**）。

### **`submitSliceJob`** transfer list + **`onmessageerror`** (done in this batch)

- `clip-apps/src/api/slice.ts` — **`worker.onmessageerror`** terminates the worker and rejects with **`slice worker message error`** (worker bridge parity with **`runKiriPoc`**-style hardening).
- `clip-apps/src/api/slice.spec.ts` — asserts **`postMessage`** receives **`[vertices.buffer]`** as the transfer list; covers **`onmessageerror`** rejection; **`afterEach`** **`vi.unstubAllGlobals`** so **`Worker`** stubs do not leak across cases.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`570 passed`**。

### Mock slicer single vertex scan + geometry null contracts (done in this batch)

- `clip-apps/src/core/slicer/mockSlicer.ts` — **`DEFAULT_PLANAR_BOUNDS`** + **`planarBoundsFromVertexBounds3D`**; **`withDerivedJobBounds`** / **`buildSliceInputMeta`** each call **`computeVertexBounds3D`** once (same rules as **`resolvePlanarBoundsFromVertices`** / **`resolveModelZSpanFromVertices`**); **`buildMockSliceResult`** default planar bounds reuse the constant.
- `clip-apps/src/core/slicer/geometry.spec.ts` — empty buffer and length not a multiple of three ⇒ **`computeVertexBounds3D`** returns **`null`**.
- `clip-apps/src/core/slicer/mockSlicer.spec.ts` — **`buildSliceInputMeta`** **`planarBounds`** / **`zSpanMm`** match **`resolvePlanarBoundsFromVertices`** / **`resolveModelZSpanFromVertices`** contract.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`568 passed`**。

### Mock slicer vertex bounds + **`kiriEngine`** geometry spec (done in this batch)

- `clip-apps/src/core/slicer/mockSlicer.ts` — **`resolvePlanarBoundsFromVertices`** / **`resolveModelZSpanFromVertices`** delegate to **`geometry.computeVertexBounds3D`** (mock **`SliceInputMeta`** / **`withDerivedJobBounds`** align with shared vertex bounds).
- `clip-apps/src/core/slicer/mockSlicer.spec.ts` — asserts planar bounds match **`computeVertexBounds3D`** XY projection.
- `clip-apps/src/core/slicer/kiriEngine.spec.ts` — **`@/core/slicer/geometry`** mock uses **`importOriginal`** for **`computeVertexBounds3D`** (stubs **`pointsFromVertices`** only) so **`placeholderBounds`** stays vertex-derived under the shared helper.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`565 passed`**。

### `sanitizeJobForWorker` 模型 bbox 深拷贝隔离 (done in this batch)

- `clip-apps/src/api/slice.spec.ts` — 断言 **`sanitizeJobForWorker`** 对 **`models[].bbox`** 做 **`clonePlain`**，调用方后续修改 **`bbox.max`** 不会污染发往 **`slicer.worker`** 的 payload（与 **`transform` / `jobBounds`** 契约一致）。
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**。

### FDM 切片 fallback 中文标签穷举单测 (done in this batch)

- `clip-apps/src/core/slicer/sliceFallbackUi.spec.ts` — **`satisfies readonly SliceFallbackReasonCode[]`** 穷举 **`getSliceFallbackReasonLabel`**；**`getSliceFallbackWarningLabel(null|undefined)`** 返回空串（与 UI / 诊断文案迁移对齐，对称 **`camFallbackUi.spec`**）。
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**。

### FDM 导出诊断勾选持久化 + CAM fallback 标签全覆盖单测 (done in this batch)

- `clip-apps/src/stores/useFdmStore.ts` — **`exportGcodeIncludeDiagnostics`**（对应 FDM 侧「导出 G-code 时附带切片诊断」）从 **`localStorage`** 键 **`ws-fdm-export-include-diagnostics`** 读取（**`0`/`false`** 关，默认开）；**`setExportGcodeIncludeDiagnostics`** 写入 **`1`/`0`**。
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — **`includeTelemetryInGcode`** 改为 **`computed`** 绑定 **`fdmStore.exportGcodeIncludeDiagnostics`**，与切片后端偏好同一持久化模型。
- `clip-apps/src/stores/useFdmStore.spec.ts` / **`useFdmStore.jobsClone.spec.ts`** — 单测清理双键；**`setExportGcodeIncludeDiagnostics`** 与非法/关闭初始值覆盖。
- `clip-apps/src/core/cam/camFallbackUi.spec.ts` — **`satisfies readonly CamFallbackReasonCode[]`** 穷举 **`getCamFallbackReasonLabel`**，防止新增 **`CamFallbackReasonCode`** 时漏中文标签。
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**。

### FDM slice backend persistence + CAM placeholder legacy snapshot (done in this batch)

- `clip-apps/src/stores/useFdmStore.ts` — **`backendKind`**（Mock / Kiri）从 **`localStorage`** 键 **`ws-fdm-slice-backend-kind`** 读取初始值；**`setBackendKind`** 写入同一键，刷新页面后保持与 Job 行恢复的 **`row.backend`** 一致。
- `clip-apps/src/stores/useFdmStore.spec.ts` — 持久化单测 + **`setBackendKind`** 断言写入 **`localStorage`**。
- `clip-apps/src/stores/useFdmStore.jobsClone.spec.ts` — **`beforeEach`** 清理该键，避免与其它用例的 **`localStorage`** 串扰。
- `clip-apps/src/core/cam/camEngine.spec.ts` — 占位 **`cam-placeholder`** 路径断言 **`result.legacyDebug`**（与 **`formatCamResultText` / 会话包** 诊断字段对齐）。
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**.

### Job API: invalid JSON parity + FDM `summary.estimateMeta` persistence (done in this batch)

- `clip-apps/src/api/jobs.spec.ts` — **`listCarveraJobs`** / **`listGridBotJobs`** return **`[]`** when storage holds **invalid JSON** (same as **`listFdmJobs`**).
- `clip-apps/src/api/jobs.spec.ts` — **`saveFdmJob` / `getFdmJob`** round-trip nested **`summary.estimateMeta`** (`lengths` / `retract` / `timeSec`) for migration parity with slice estimate exports.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**.

### FDM/Carvera/GridBot Job API: list guards + FDM telemetry digest persistence (done in this batch)

- `clip-apps/src/api/jobs.spec.ts` — **`listCarveraJobs`** / **`listGridBotJobs`** return **`[]`** when storage JSON parses to a **non-array** (same defensive contract as **`listFdmJobs`**).
- `clip-apps/src/api/jobs.spec.ts` — **`saveFdmJob` / `getFdmJob`** round-trip **`summary`**, **`processSnapshot`**, **`sliceTelemetryDigest`**, **`jobBounds`** on **`FdmJobRecord`** (Job 列表与诊断/估算持久化对齐).
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**.

### FDM Job API: slice migration fields + list guard (done in this batch)

- `clip-apps/src/api/jobs.spec.ts` — **`listFdmJobs`** returns **`[]`** when **`ws-fdm-jobs`** JSON parses to a **non-array** (defensive migration / corrupted storage).
- `clip-apps/src/api/jobs.spec.ts` — **`saveFdmJob` / `getFdmJob`** round-trip **`backend`**, **`sliceInputMeta`**, **`sliceLegacyDebug`**, **`currentDiagnosticsSnapshot`** on **`FdmJobRecord`** (localStorage parity with workspace saves).
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**.

### CAM `runCamJob` + FDM slice backend contracts (done in this batch)

- `clip-apps/src/core/cam/camEngine.spec.ts` — **`runCamJob`** with mocked **`kiriCamRuntime`**: **`cam-placeholder`** (`legacy_impl_missing_both`), **`legacy_disabled`** when **`VITE_KIRI_LEGACY_CAM=0`**, **`kiri-cam-slice-only`** diagnostic stub when **`cam_export`** is absent, **`kiri-cam`** when **`cam_slice` + `cam_export`** are wired.
- `clip-apps/src/api/cam.spec.ts` — **`simulateCamJob`** delegates to **`runCamJob(..., { devMode: import.meta.env.DEV })`** (workspace entry contract).
- `clip-apps/src/api/slice-backend.ts` — **`KiriSliceBackend`** comment corrected: delegates to **`submitSliceJob(..., 'kiri')`** (slicer worker Kiri path + mock fallback / telemetry), not a mock-only shortcut.
- `clip-apps/src/api/slice-backend.spec.ts` — **`submitSliceJob`** receives **`'kiri'` / `'mock'`** and forwards **`SliceSubmitOptions`** for Kiri.
- **Latest CAM + slice migration vitest** gate includes **`src/api/cam.spec.ts`**.
- verification
  - **Latest CAM + slice migration vitest** (progress snapshot table) — **`564 passed`**.

### CAM legacy slice summary bridge + FDM `SliceResult.inputMeta` (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` (+ spec) — single source for **placeholder** CAM estimates; **enrich** from `widget.slices` / `widget.camops` after legacy `cam_slice` so `kiri-cam` runs no longer report empty `summary`/`perOp`.
- `clip-apps/src/core/cam/camEngine.ts` — legacy branch uses bridge + **`collectCamExportGcode`** for real `cam_export` text (LF-normalized, section names in `notes`); placeholder branch delegates to the same estimator.
- `clip-apps/src/core/cam/camResultSerialize.ts` (+ spec) / **`camResultText.ts`** — large `gcodeText` omitted from JSON preview; **`camExport.sections`** surfaced in summary lines.
- `clip-apps/src/core/cam/camGcodeFingerprint.ts` (+ spec) — **`normalizeCamGcodeForMigrationFingerprint`** + **`sha256HexUtf8`** (Web Crypto).
- `clip-apps/src/core/cam/sessionBundleExport.ts` — exported session bundle uses **`toCamJobResultDisplayJson`** (bounded JSON) + **`camGcodeFingerprint`** (`targetGcodeSha256`, `targetGcodeByteLength`); **schema v3**; **`createCamSessionBundleExportArtifact` async**.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — session 包导入预览展示 **targetGcodeSha256**；导出会话包 `try/catch`。
- `clip-apps/src/core/cam/camGcodeNormalize.ts` / `camExportCollect.ts` (+ specs) — deterministic G-code normalization; **`camExportGripGolden.spec.ts`** — synthetic stream contract (swap in grip-captured fixture when available).
- `clip-apps/src/core/cam/sessionBundleFingerprintVerify.ts` (+ spec) — on import, **recompute** normalized G-code SHA-256 when `targetGcodeSha256` and inline `gcodeText` are both present; surface ok / mismatch / cannot-verify in **`CamWorkspace`**.
- `clip-apps/src/composables/useFileImportActions.ts` — `importJsonFromInput` **awaits** async `onSuccess` (session bundle path uses Web Crypto verify).
- `clip-apps/src/core/cam/camGripFixtureNormalize.spec.ts` — **pinned** `normalizeCamGcodeForMigrationFingerprint` + SHA-256 for `fixtures/grip-cam-export-sample.gcode.txt` (change constant when swapping in a real grip capture).
- `clip-apps/src/core/cam/camExportCollect.spec.ts` — multi-section + empty chunk + **array** `online()` branch coverage.
- `clip-apps/src/core/cam/kiriCamRuntime.ts` — **`getKiriCamLegacyHealth()`** + richer **`__debugKiriCamRuntimeStatus`** (`legacyCamSlice` / `legacyCamExport`)；**`legacyImportErrorMessage`** 记录 `auto` 模式下 slice/export **动态 import 失败**原因（便于对照 grip 依赖链）。
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **Legacy 桥接状态** hint（`cam_slice` / `cam_export` 是否加载；**动态 import 失败**时附带 `legacyImportErrorMessage`）；挂载与每次 CAM 运行后刷新。
- `clip-apps/src/core/cam/camEngine.ts` — slice-only 桩 G-code 末行改为指向 **`result.notes`** / env 的说明（去掉 TODO）；占位 **`fallback.message`** 在缺 slice/export 时附加 **`legacyImportErrorMessage`**（与 CAM 页 Legacy 提示一致）。
- `clip-apps/.env.example` — 文档化 **`VITE_KIRI_LEGACY_CAM`** / **`VITE_KIRI_LEGACY_FDM`** / **`VITE_KIRI_LEGACY_SLICE_TIMEOUT_MS`**（grip legacy 迁移开关）；注明 **CAM**（`src/core/cam/legacy`）与 **FDM 切片**（`src/core/slicer/legacy`）两套树。
- `clip-apps/src/core/slicer/kiriRuntimeState.ts` / **`kiriRuntimeLoader.ts`** / **`kiriEngine.ts`** — FDM legacy **`lastLegacyFdmImportError`**（`auto` 下 import 失败）；**`getKiriFdmLegacyHealth()`**；**`sliceWithKiri`** 返回的 **`fallback.message`** 附加 `— import: …`（与 CAM 占位 fallback 对齐，便于 Jobs/诊断里对照 grip）。
- `clip-apps/src/api/slice.ts` — **`SliceLegacyDebugSnapshot`** + **`SliceResult.legacyDebug`**（worker 内 `getKiriFdmLegacyHealth()` 快照）；**`slicer.worker.ts`** 在 Kiri 失败回退 mock 时同样附带。
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — 右栏 **Legacy FDM 桥** 描述；**导出 G-code / Carvera / GridBot** 注释块写入 **`legacyFdmReady` / `legacyFdmHasSliceImpl` / `legacyFdmInitError` / `legacyFdmImportError`**（迁移对账）。
- `clip-apps/src/core/slicer/sliceDebugApi.ts` (+ spec) — `exportDiagnostics` 扩展 **`legacyFdmDebug`**（live + jobSaved）；`FdmWorkspaceView` 的 `getDiagnosticsContext` 与 `FdmJobRecord.sliceLegacyDebug` 持久化/回读打通。
- `clip-apps/src/core/slicer/telemetryComment.ts` (+ spec) — 提炼 **`appendLegacyFdmDebugComments`**，统一写入 `legacyFdmReady/HasSliceImpl/InitError/ImportError` 注释；`FdmWorkspaceView` 改为复用 helper（减少页面内重复格式化逻辑）。
- `clip-apps/src/types/camJob.ts` / `core/cam/camEngine.ts` / `camResultText.ts`(+spec) — CAM 结果新增 **`legacyDebug`**（ready/slice/export/importError）；`formatCamResultText` 输出 legacy 行，便于与切片侧 diagnostics 对齐。
- `clip-apps/src/apps/cam/CamWorkspace.vue` — 会话包预览新增 `targetRun.legacy` 行（slice/export/ready），便于导入后快速判断目标 run 的 legacy 绑定状态。
- `clip-apps/src/core/cam/sessionBundleExport.ts`(+spec) — schema **v4**；`migrationMeta.engineHints` 新增 `targetLegacyReady/HasSlice/HasExport/ImportError`（从 `targetRun.result.legacyDebug` 派生），`CamWorkspace` 预览新增 `targetLegacyHint`。
- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts`(+spec) — 会话包导入时比对 `engineHints.targetLegacy*` 与当前 `getKiriCamLegacyHealth()`，`CamWorkspace` 在不一致时给出差异提示（ready/slice/export/importError）。
- `clip-apps/src/apps/cam/CamWorkspace.vue` — 会话包预览区增加常驻 `Legacy hint diff` 文本（非一次性 toast），并在 `refreshKiriLegacyBridgeLabel()` 后同步刷新，便于运行时状态变化后继续对账。
- `clip-apps/src/apps/cam/CamWorkspace.vue` — `Legacy hint diff` 增加 **复制 diff** 按钮（clipboard），便于直接贴到迁移 issue / 对账记录。
- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts`(+spec) / `CamWorkspace.vue` — 新增标准化复制文本：`复制 target`（会话包 targetLegacy*）与 `复制 current`（当前 getKiriCamLegacyHealth），与 `复制 diff` 组成三件套，方便自动化比对。
- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts`(+spec) / `CamWorkspace.vue` — 新增 `复制对账包`：一次性导出 `targetLegacy` + `currentLegacy` + `legacyHintDiff` 三段文本，便于直接贴迁移 issue。
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — FDM「Legacy FDM 桥」与「Job 保存的 Legacy FDM 桥」增加一键复制；导出 `scope/live|jobSaved + ready/hasSliceImpl/initError/importError` 文本，和 CAM diff copy 操作习惯对齐。
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts`(+spec) / `FdmWorkspaceView.vue` — FDM 新增 `复制对账包`：一次性导出 `liveLegacyFdm` + `jobLegacyFdm` + `slicerContext(fallback/digest/meta)` 三段文本，与 CAM 对账包能力对齐。
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts`(+spec) — FDM 对账包新增 `liveVsJobLegacyDiff` 段（ready / hasSliceImpl / importError），差异表达风格向 CAM `legacyHintDiff` 对齐，便于脚本化比较。
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` / `FdmWorkspaceView.vue` — FDM 文本键名统一到 `hasSlice`（替代 `hasSliceImpl` 作为输出键），与 CAM `currentLegacy/targetLegacy.hasSlice` 对齐，减少脚本字段映射。
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts`(+spec) — FDM 对账包段标题改为 `targetLegacy/currentLegacy/legacyHintDiff`（原 `live/jobSaved/liveVsJob`），与 CAM 对账包分段命名一致，解析器可复用。
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts`(+spec) — FDM 对账包键名进一步对齐 CAM：由 `target.legacyFdm.* / current.legacyFdm.*` 统一为 `targetLegacy.* / currentLegacy.*`。
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — FDM 单项复制（当前/Job）文本键名同样统一为 `currentLegacy.* / targetLegacy.*`，与对账包及 CAM 文本一致。
- `clip-apps/src/apps/cam/CamWorkspace.vue` / `src/views/fdm/FdmWorkspaceView.vue` — CAM/FDM 关键复制动作成功文案统一为 `复制成功：<域+对象>`，失败文案统一为 `复制失败：请检查剪贴板权限`。
- `clip-apps/src/apps/cam/CamWorkspace.vue` — CAM 复制动作改为复用 `useExportActions.copyText`（与 FDM 同一复制通道），去除页面内重复 clipboard try/catch。
- `clip-apps/src/core/copyFeedbackMessages.ts` — CAM/FDM 迁移对账复制成功文案集中为共享常量；`CamWorkspace` 与 `FdmWorkspaceView` 改为引用常量，避免硬编码分散。
- `clip-apps/src/core/copyFeedbackMessages.ts` / `composables/useExportActions.ts` — 新增共享失败文案常量 `COPY_FAILURE_MESSAGE`，复制失败提示统一走同一来源（去掉“浏览器”措辞差异）。
- `clip-apps/src/core/copyFeedbackMessages.ts` — 新增 `CAM_COPY_EMPTY` / `FDM_COPY_EMPTY`，并在 CAM/FDM legacy 复制入口替换硬编码 “无可复制内容” 提示。
- `clip-apps/src/core/copyFeedbackMessages.ts` / `FdmWorkspaceView.vue` — `FDM_COPY_EMPTY` 扩展到估算明细、Job 诊断、时间线诊断等剩余复制入口，FDM “无可复制内容” 提示实现集中化。
- `clip-apps/src/core/copyFeedbackMessages.ts` / `FdmWorkspaceView.vue` — `FDM_COPY_SUCCESS` 扩展覆盖估算明细、Job 诊断、时间线诊断复制成功提示，FDM 复制文案基本去硬编码。
- `clip-apps/src/core/cam/kiriCamLegacyHealth.spec.ts` — health 对象形态单测。
- `clip-apps/src/api/slice.ts` — `SliceInputMeta` + optional `SliceResult.inputMeta`.
- `clip-apps/src/api/jobs.ts` — `FdmJobRecord.sliceInputMeta` persisted with Job.
- `clip-apps/src/core/slicer/mockSlicer.ts` — `buildSliceInputMeta`, mock path attaches meta when vertices are passed.
- `clip-apps/src/core/slicer/kiriEngine.ts` + `clip-apps/src/workers/slicer.worker.ts` — always attach `inputMeta` on successful slice results.
- `clip-apps/src/core/slicer/sliceDebugApi.ts` (+ spec) — `getDiagnosticsContext` → **`exportDiagnostics`** includes live + saved `sliceInputMeta`.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — live **输入网格** row; Job saved meta + collapse **诊断（告警 / 输入网格）**; `initSlicerDebugSession` wires diagnostics context; save Job writes `sliceInputMeta`.
- `clip-apps/src/views/jobs/FdmJobListView.vue` — **网格** tag when `sliceInputMeta` is stored.

### FDM job diagnostics + G-code traceability (done in this batch)

Closed the loop from live slicer telemetry to saved jobs and machine-facing exports:

- `clip-apps/src/api/jobs.ts` — `FdmJobRecord.currentDiagnosticsSnapshot` (optional full `exportDiagnostics()` text at save time).
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — snapshot written on slice-save and “更新当前 Job”; right-rail panel + copy; when “附带切片诊断” is enabled, `appendDiagnosticsSnapshotComments` appends saved snapshot to exported G-code and Carvera/GridBot placeholder payloads (capped lines).
- `clip-apps/src/views/jobs/FdmJobListView.vue` — “诊断快照” column indicator and row action **复制诊断** (clipboard).
- `clip-apps/src/core/slicer/telemetryComment.ts` — `appendDiagnosticsSnapshotComments`, **`appendSliceInputMetaPairForGcode`** (Live vs Job diff) + tests.
- `clip-apps/src/core/slicer/sliceDebugSession.ts` (+ spec) — install `__slicerDebug` + session restore with safe storage try/catch.

### Slicer telemetry transport + timeline bridge (done in this batch)

Completed a full structured fallback telemetry loop for slicer:

- `clip-apps/src/api/slice.ts`
  - worker message contract supports `kind: 'telemetry'`
  - `submitSliceJob(...)` now accepts `onTelemetry` callback and forwards intermediate events to main thread
- `clip-apps/src/workers/slicer.worker.ts`
  - emits telemetry event before fallback result publish in Kiri failure path
- `clip-apps/src/stores/useFdmStore.ts`
  - added capped `sliceTelemetryTimeline` state (`max=20`) with push/clear actions
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - wires telemetry callback into store
  - adds timeline section to inspect recent fallback events (`code/reason/message/timestamp`)

### CAM default profile migration (done)

Migrated canonical CAM defaults from grip:

- `grip/grid-apps-master/src/cli/kiri-cam-device.json`
- `grip/grid-apps-master/src/cli/kiri-cam-tools.json`
- `grip/grid-apps-master/src/cli/kiri-cam-process.json`

Into:

- `shape_cam/clip-apps/src/core/cam/defaults/kiri-cam-device.json`
- `shape_cam/clip-apps/src/core/cam/defaults/kiri-cam-tools.json`
- `shape_cam/clip-apps/src/core/cam/defaults/kiri-cam-process.json`

And updated `shape_cam/clip-apps/src/stores/useCamStore.ts` to load these defaults instead of hardcoded sample objects.

### Raster planar STL pipeline migration (done in this batch)

Replaced previous image placeholder workflow in `clip-apps` Raster workspace with STL-based processing:

- `shape_cam/clip-apps/src/apps/raster/RasterWorkspace.vue`
  - Import terrain/tool STL separately.
  - Run planar raster toolpath generation on model geometry.
  - Keep preview/export/recent-job flow.
- `shape_cam/clip-apps/src/types/raster.ts`
  - Switched request model from grayscale pixels to `{ terrainTriangles, toolTriangles }`.
  - Config now aligns with planar toolpath parameters: `{ resolution, xStep, yStep, zFloor }`.
- `shape_cam/clip-apps/src/workers/raster.worker.ts`
  - Implemented planar CPU rasterization + tool rasterization + collision-based path generation.
  - This follows the same high-level stages as `raster-path-main` planar mode.
- `shape_cam/clip-apps/src/stores/useRasterStore.ts`
  - Updated defaults and recent job payload typing for STL mode.

### Raster multi-mode contract migration (done in this batch)

Aligned `clip-apps` raster interfaces toward `raster-path-main` style mode model:

- Added raster mode contract support in types/config:
  - `planar` (active)
  - `tracing` (active with path JSON input)
  - `radial` (UI reserved, disabled pending engine integration)
- Added tracing configuration and payload fields:
  - `tracingStep`
  - `tracingPaths`
- Updated worker/runtime behavior:
  - `planar`: scanline sampling flow remains active.
  - `tracing`: polyline sampling + per-point collision depth evaluation.

This prepares UI/store/data contracts so the future WebGPU core swap can happen
at compute layer level without another schema rewrite.

### Raster radial experimental path (done in this batch)

Enabled runnable `radial` mode (experimental, CPU implementation) in `clip-apps`:

- UI:
  - `radial` mode is now selectable in `RasterWorkspace`.
  - Added `rotationStep` parameter (degrees).
- Types/config:
  - Added `rotationStep` to raster config model.
- Worker:
  - Added cylindrical transform `XYZ -> (X, theta, radius)`.
  - Implemented radial terrain/tool rasterization on `(X, theta)` grid.
  - Reused collision sampling flow to generate radial strips as output paths.

Notes:
- This is a migration bridge implementation focused on interface continuity.
- Precision/performance parity with `raster-path-main` WebGPU radial pipelines (V2/V3)
  is a follow-up task.

### Raster WebGPU planar execution path (done in this batch)

Started compute-layer replacement for planar mode in `clip-apps` worker:

- Added shader assets:
  - `clip-apps/src/shaders/planar-rasterize.wgsl`
  - `clip-apps/src/shaders/planar-toolpath.wgsl`
- Updated `clip-apps/src/workers/raster.worker.ts`:
  - Added WebGPU device/pipeline initialization (`planar` only).
  - Added GPU planar rasterization path for terrain/tool.
  - Added GPU planar toolpath generation path.
  - Preserved CPU fallback when WebGPU is unavailable or runtime GPU path fails.

Result:
- `planar` mode now attempts WebGPU execution first, then falls back safely.
- Existing `tracing` and experimental `radial` CPU paths remain unchanged.

### Raster WebGPU tracing depth path (done in this batch)

Extended worker-side WebGPU usage to tracing path depth evaluation:

- Added shader asset:
  - `clip-apps/src/shaders/tracing-toolpath.wgsl`
- Updated `clip-apps/src/workers/raster.worker.ts`:
  - Added tracing compute pipeline initialization.
  - Added GPU tracing depth kernel invocation for sampled polyline points.
  - Kept per-path CPU fallback when GPU tracing execution fails.
  - Summary engine now reports `webgpu` when tracing GPU path is used.

Result:
- `tracing` mode now attempts GPU depth computation path-by-path with safe fallback.

### Raster WebGPU tracing pre-raster path (done in this batch)

Extended tracing mode to attempt GPU rasterization for terrain/tool pre-stage:

- `clip-apps/src/workers/raster.worker.ts`
  - In `tracing` mode, terrain/tool rasterization now also tries WebGPU first.
  - Falls back to CPU rasterization if GPU pre-stage fails.

Result:
- Tracing now supports GPU acceleration in both stages:
  - pre-rasterization (terrain/tool)
  - traced depth evaluation

### Raster GPU/CPU self-check utility (done in this batch)

Added lightweight verification flow in Raster workspace:

- `clip-apps/src/types/raster.ts`
  - Added optional `preferredEngine` (`auto` / `cpu` / `webgpu`) in request model.
- `clip-apps/src/workers/raster.worker.ts`
  - Honors `preferredEngine` for A/B execution forcing.
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - Added `GPU/CPU 对比自检` button.
  - Runs same input with forced CPU and forced WebGPU.
  - Shows timing and basic depth-difference stats (`mean|max abs dz`).

### Raster runtime overhead optimization (done in this batch)

Reduced per-run startup overhead by reusing a singleton Raster worker:

- `clip-apps/src/api/raster.ts`
  - Switched from "new Worker per call" to persistent worker reuse.
  - Added in-flight guard to prevent overlapping requests on shared worker.

Expected impact:
- Better latency on small/medium jobs where worker init dominates.
- Improved practical performance for repeated self-check and iterative tuning loops.

### Texturizer mapping-mode UV execution alignment (done in this batch)

Continued `stlTexturizer-main` feature migration for mapping/UV transform path:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - Added UI controls and request wiring for:
    - `mappingMode`
    - `scaleU` / `scaleV`
    - `offsetU` / `offsetV`
    - `rotationDeg`
- `clip-apps/src/types/texturizer.ts`
  - Extended `TexturizeRequest` with the same mapping/UV fields.
- `clip-apps/src/stores/useTexturizerStore.ts`
  - Extended recent-job input typing to persist/replay these fields.
- `clip-apps/src/workers/texturizer.worker.ts`
  - Connected legacy `computeUV` mapping path using migrated settings.
  - Fixed triplanar/cubic seam behavior to blend multi-sample UV outputs by weight,
    instead of sampling only the first UV sample.

Result:
- Texturizer now has end-to-end parameter wiring (UI -> store/request -> worker compute),
  with materially better behavior for blended mapping modes.
- Added advanced seam/blend controls in the same end-to-end path:
  - `mappingBlend`
  - `seamBandWidth`
  - `capAngle`
- `frequency` is now actively used in worker displacement as UV sampling frequency multiplier
  (non-positive values are clamped to fallback `1`).
- Added initial face masking / exclusion execution path:
  - angle-based masking controls: `topAngleLimit`, `bottomAngleLimit`
  - list-based face exclusion controls: `exclusionMode` (`exclude` / `include`) + `excludedFaces`
  - worker now zeros displacement on masked/excluded triangles.
- Upgraded angle-mask execution to boundary-smoothed weighting:
  - shared-position area-weighted masked fraction map
  - displacement scales by `(1 - maskedFrac)` to avoid hard step artifacts at mask edges
  - user face exclusion remains hard-off (`0` displacement) for deterministic include/exclude semantics.
- Added minimal subdivision/decimation processing chain in Texturizer:
  - request/store/UI fields: `subdivisionLevels`, `decimationRatio`
  - worker pipeline now supports:
    - pre-displacement adaptive edge-threshold subdivision (0..3 levels)
    - post-displacement triangle decimation by ratio (upgraded to grid-cluster simplification)
    - subdivision safety cap guard to avoid runaway triangle growth
  - this is a migration bridge implementation to keep pipeline contracts runnable;
    high-quality legacy `subdivision.js` / `decimation.js` parity remains follow-up work.

### Texturizer runtime overhead optimization (done in this batch)

Reduced per-run startup overhead in Texturizer API by reusing a singleton worker:

- `clip-apps/src/api/texturizer.ts`
  - switched from "new Worker per request" to persistent worker reuse
  - added in-flight guard to reject overlapping requests
  - clones input vertex/texture buffers before transfer to keep caller-side state safe

### Texturizer run meta observability (done in this batch)

Added lightweight execution metadata for subdivision/decimation visibility:

- `clip-apps/src/types/texturizer.ts`
  - extended `TexturizeResult` with optional `meta`:
    - `preTriCount`
    - `postSubdivTriCount`
    - `postDecimateTriCount`
    - `subdivSafetyCapHit`
- `clip-apps/src/workers/texturizer.worker.ts`
  - emits the above counts and safety-cap flag each run
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - shows triangle pipeline counters in run summary
  - persists `meta` into recent jobs and includes it in re-export JSON payload
  - persists `warnings` into recent jobs; list UI and re-export now prefer stored warnings
  - warnings model upgraded to structured objects (`code`, `level`, `message`) with backward-compatible legacy string parsing

### Texturizer worker-origin warnings (done in this batch)

Moved warnings source from UI inference to compute-layer output:

- `clip-apps/src/workers/texturizer.worker.ts`
  - now emits structured warnings in result payload
  - current rules:
    - `subdiv_safety_cap_hit` (`error`)
    - `decimation_stronger_than_requested` (`warning`)
- `clip-apps/src/types/texturizer.ts`
  - `TexturizeResult` now includes optional `warnings`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - run warnings now prefer `res.warnings` from worker
  - keeps fallback path only for legacy/history compatibility
  - current-run export/recent-job warnings now originate from worker output path

### Texturizer symmetric displacement option (done in this batch)

Migrated `symmetricDisplacement` behavior from `stlTexturizer-main` displacement semantics:

- `clip-apps/src/types/texturizer.ts`
  - added optional `symmetricDisplacement` on `TexturizeRequest`
- `clip-apps/src/workers/texturizer.worker.ts`
  - displacement formula now switches by `symmetricDisplacement`
  - `false`: grayscale in `[0,1]` maps to positive-only displacement (`0..amplitude`)
  - `true`: grayscale centered to `[-1,1]` maps to bidirectional displacement (`-amplitude..amplitude`)
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - added UI switch and request wiring for `symmetricDisplacement`
  - included in JSON/STL recent-job input persistence and reload path
- `clip-apps/src/stores/useTexturizerStore.ts`
  - recent-job input schema includes `symmetricDisplacement`

### Texturizer warning message mapping consolidation (done in this batch)

Unified warning code presentation with a centralized UI mapping:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - added centralized warning code -> display message map
  - both current-run warnings and recent-job warnings now use the same formatter/tag-type logic
  - preserves compatibility with legacy string warnings through normalization path

### Texturizer shared warning code constants (done in this batch)

Removed duplicated warning-code string literals across worker/UI:

- `clip-apps/src/types/texturizerWarnings.ts`
  - added shared warning code constants
  - added shared warning message map for UI display
- `clip-apps/src/workers/texturizer.worker.ts`
  - warning emit path now references shared warning code constants
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - fallback warning synthesis and UI message rendering now reference shared constants/map

### Texturizer warning message ownership cleanup (done in this batch)

Shifted warning display wording ownership to UI layer:

- `clip-apps/src/types/texturizer.ts`
  - `TexturizeWarning.message` is now optional
- `clip-apps/src/workers/texturizer.worker.ts`
  - warning payload now emits `code + level` only for built-in rules
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - fallback warning synthesis aligned with optional message model
  - displayed wording remains driven by shared warning code->message mapping

### Texturizer warning details observability (done in this batch)

Extended structured warnings with machine-readable diagnostics:

- `clip-apps/src/types/texturizer.ts`
  - `TexturizeWarning` now supports optional `details` key-value map
- `clip-apps/src/workers/texturizer.worker.ts`
  - warning payload includes diagnostic details for:
    - `subdiv_safety_cap_hit` (safety threshold + post-subdiv tri count)
    - `decimation_stronger_than_requested` (requested/kept ratio + tri counts)
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - tooltip renderer appends warning details automatically when present

### Texturizer warning details formatting templates (done in this batch)

Improved warning tooltip readability with code-aware formatting:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - added warning-detail formatters (percent/fixed helpers)
  - `decimation_stronger_than_requested` now renders ratio fields as percentages
  - `subdiv_safety_cap_hit` now renders cap/triangle details in compact normalized form
  - unknown warning details keep a generic fallback formatter

### Texturizer multi-line warning tooltip (done in this batch)

Improved warning readability in UI by switching from flat text to structured lines:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - warning tooltip now uses slot content with one warning per line
  - shared line-builder is reused for current-run and recent-job warnings
  - each line keeps "main message + formatted details" layout

### Texturizer warning tag count/severity label (done in this batch)

Improved warning tag scanability by showing severity and count directly:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - warning tag text now uses unified label builder (`ERR(n)` / `WARN(n)`)
  - applied consistently in current-run and recent-job warning tags

### Texturizer tooltip warning level prefix (done in this batch)

Aligned tooltip lines with warning severity semantics:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - each warning line now starts with `[ERR]` or `[WARN]`
  - prefix applies to both current-run and recent-job warning tooltip content

### Texturizer colored warning badges in tooltip (done in this batch)

Improved tooltip scanability with visual severity badges:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - warning tooltip lines now render severity as colored mini-badges (`ERR`/`WARN`)
  - line content keeps "message + details" text layout
  - applied consistently to current-run and recent-job tooltips

### Texturizer warning UI component extraction (done in this batch)

Reduced duplicated warning-rendering templates by extracting reusable component:

- `clip-apps/src/components/texturizer/WarningBadgeList.vue`
  - encapsulates warning tooltip line rendering and warning tag rendering
  - includes severity badge styles and reusable props (`lines`, `tagType`, `tagLabel`)
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - replaced duplicated current-run/recent-job warning tooltip blocks with `WarningBadgeList`
  - removed local duplicated warning badge styles

### Texturizer recent-job warning view-model caching (done in this batch)

Reduced repeated warning parsing/formatting during table render:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - added computed map cache for recent-job warning UI data
  - table row warning section now reads precomputed `{ warnings, lines, tagType, tagLabel }`
  - avoids repeated `getJobWarnings`/format calls in template bindings

### Texturizer warning UI helpers modularization (done in this batch)

Improved maintainability by extracting warning UI logic from page component:

- `clip-apps/src/apps/texturizer/warningUi.ts`
  - centralized warning normalization, fallback construction, tooltip-line formatting, and tag label/type helpers
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - now imports warning UI helpers instead of maintaining duplicated inline utility logic
  - reduced component complexity while keeping behavior unchanged

### Texturizer warning UI helpers moved to core layer (done in this batch)

Aligned module placement with cross-layer reuse intent:

- moved helper module from `clip-apps/src/apps/texturizer/warningUi.ts`
  to `clip-apps/src/core/texturizer/warningUi.ts`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - updated import path to `@/core/texturizer/warningUi`
- this placement enables future reuse by worker-side/shared texturizer modules

### Texturizer warning details contract constants (done in this batch)

Unified warning detail-key contract between producer and consumer:

- `clip-apps/src/types/texturizerWarnings.ts`
  - added shared `TEXTURIZER_WARNING_DETAIL_KEYS` constants
- `clip-apps/src/workers/texturizer.worker.ts`
  - warning `details` payload now uses shared detail-key constants
- `clip-apps/src/core/texturizer/warningUi.ts`
  - warning details formatter now reads fields using same shared constants
- removes string-literal drift risk between worker emit path and UI parse path

### Texturizer warning factory constructors (done in this batch)

Standardized warning object creation via shared constructors:

- `clip-apps/src/core/texturizer/warningFactory.ts`
  - added `createSubdivSafetyCapHitWarning(...)`
  - added `createDecimationStrongerThanRequestedWarning(...)`
- `clip-apps/src/workers/texturizer.worker.ts`
  - warning emit path now uses shared constructor functions (no inline object literals)
- `clip-apps/src/core/texturizer/warningUi.ts`
  - fallback `buildRunWarnings` now also uses shared constructor
- this keeps warning code/level/details assembly consistent across producer and fallback paths

### Texturizer warning discriminated typing (done in this batch)

Tightened warning type safety by introducing code-based warning union:

- `clip-apps/src/types/texturizer.ts`
  - `TexturizeWarning` is now a union of:
    - `SubdivSafetyCapHitWarning`
    - `DecimationStrongerThanRequestedWarning`
    - `GenericTexturizeWarning` (compatibility fallback)
  - known warning variants now have typed `details` shapes keyed by shared constants
- `clip-apps/src/core/texturizer/warningFactory.ts`
  - factory return types now use concrete warning variant interfaces
- `clip-apps/src/core/texturizer/warningUi.ts`
  - details parsing now narrows via typed warning variants, improving compile-time checks

### Texturizer generic warning code prefix hardening (done in this batch)

Constrained fallback warning code space and normalized historical drift:

- `clip-apps/src/types/texturizer.ts`
  - `GenericTexturizeWarning.code` narrowed to prefixed forms:
    - `legacy_${string}`
    - `unknown_${string}`
- `clip-apps/src/core/texturizer/warningUi.ts`
  - `normalizeWarning` now enforces prefixed generic codes
  - non-prefixed unknown codes from legacy/history are auto-normalized to `unknown_*`
  - string warnings continue to normalize to `legacy_*`

### Texturizer warning normalization unit tests (done in this batch)

Added focused tests to lock normalization contract behavior:

- `clip-apps/src/core/texturizer/warningUi.spec.ts`
  - covers legacy string -> `legacy_*` normalization
  - covers known warning code passthrough
  - covers unknown non-prefixed code -> `unknown_*` normalization

### Texturizer warning factory unit tests (done in this batch)

Added constructor-focused tests for warning payload contract:

- `clip-apps/src/core/texturizer/warningFactory.spec.ts`
  - verifies warning code/level and detail-key mapping for subdivision warning
  - verifies invalid subdivision inputs do not emit details payload
  - verifies decimation ratios are rounded to 4 decimal places in details

### Texturizer warning runtime rule extraction (done in this batch)

Pulled worker warning trigger rules into a shared runtime helper:

- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - added `buildRuntimeWarnings(...)` for runtime rule evaluation
  - encapsulates safety-cap and decimation-threshold trigger logic
- `clip-apps/src/workers/texturizer.worker.ts`
  - now delegates warning emission decision to `buildRuntimeWarnings(...)`

### Texturizer warning runtime unit tests (done in this batch)

Added runtime-rule tests to guard threshold behavior:

- `clip-apps/src/core/texturizer/warningRuntime.spec.ts`
  - verifies safety-cap warning emission
  - verifies decimation warning threshold hit/miss behavior
- warning contract test suite now covers factory + normalize + runtime rule paths

### Texturizer warning threshold constants (done in this batch)

Replaced warning rule magic numbers with shared constants:

- `clip-apps/src/types/texturizerWarnings.ts`
  - added `TEXTURIZER_WARNING_THRESHOLDS`:
    - `DECIMATION_RATIO_WARN_MIN = 0.8`
    - `DECIMATION_KEPT_RATIO_WARN_MAX = 0.65`
- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - runtime trigger logic now references shared threshold constants
- `clip-apps/src/core/texturizer/warningRuntime.spec.ts`
  - tests now reference thresholds instead of hardcoded literals

### Texturizer subdivision safety cap constant unification (done in this batch)

Unified subdivision safety cap with warning threshold config source:

- `clip-apps/src/types/texturizerWarnings.ts`
  - added `TEXTURIZER_WARNING_THRESHOLDS.SUBDIV_SAFETY_TRIANGLES_MAX`
- `clip-apps/src/workers/texturizer.worker.ts`
  - subdivision safety checks now use shared `SUBDIV_SAFETY_TRIANGLES_MAX` constant
  - removed local duplicate `SUBDIV_SAFETY_TRIANGLES` declaration
- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - runtime warning builder now sources safety-cap detail value from same shared threshold constant
- `clip-apps/src/core/texturizer/warningRuntime.spec.ts`
  - test input updated to match simplified runtime input contract

### Texturizer threshold grouping cleanup (done in this batch)

Grouped thresholds by semantics (rule vs safety):

- `clip-apps/src/types/texturizerWarnings.ts`
  - introduced `TEXTURIZER_SAFETY_LIMITS` (fixed guardrails)
  - introduced `TEXTURIZER_WARNING_RULE_THRESHOLDS` (warning trigger rules)
- `clip-apps/src/workers/texturizer.worker.ts`
  - subdivision cap checks now reference `TEXTURIZER_SAFETY_LIMITS`
- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - decimation warning trigger now references `TEXTURIZER_WARNING_RULE_THRESHOLDS`
- `clip-apps/src/core/texturizer/warningRuntime.spec.ts`
  - tests updated to follow new grouped threshold constants

### Texturizer safety/rule threshold source separation (done in this batch)

Completed semantic split for configurable rule thresholds vs fixed safety limits:

- `clip-apps/src/types/texturizerWarnings.ts`
  - replaced monolithic threshold object with:
    - `TEXTURIZER_SAFETY_LIMITS`
    - `TEXTURIZER_WARNING_RULE_THRESHOLDS`
- `clip-apps/src/workers/texturizer.worker.ts`
  - safety-cap subdivision guard now exclusively uses `TEXTURIZER_SAFETY_LIMITS`
- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - warning trigger checks now exclusively use `TEXTURIZER_WARNING_RULE_THRESHOLDS`
  - warning detail safety-cap value uses `TEXTURIZER_SAFETY_LIMITS`
- this split preserves behavior while clarifying future parameterization boundaries

### Texturizer centralized config read interface (done in this batch)

Introduced a core-level config accessor as extension point for future injection:

- `clip-apps/src/core/texturizer/config.ts`
  - added `getTexturizerConfig()` returning readonly default config
  - config currently covers:
    - warning rule thresholds
    - fixed safety limits
- `clip-apps/src/core/texturizer/warningRuntime.ts`
  - now reads thresholds/safety limits via `getTexturizerConfig()`
- `clip-apps/src/workers/texturizer.worker.ts`
  - subdivision safety cap checks now read from `getTexturizerConfig()`
- `clip-apps/src/core/texturizer/warningRuntime.spec.ts`
  - tests now read rule thresholds from `getTexturizerConfig()`
- `clip-apps/src/types/texturizerWarnings.ts`
  - keeps warning code/detail/message contract only (threshold values moved out)

### Texturizer controlled rule-threshold override API (done in this batch)

Added a controlled config override path for future UI/runtime tuning:

- `clip-apps/src/core/texturizer/config.ts`
  - added `setTexturizerWarningRuleThresholdOverrides(...)` (rule thresholds only)
  - added `resetTexturizerWarningRuleThresholdOverrides()`
  - `getTexturizerConfig()` now merges defaults + overrides for warning rules
  - safety limits remain fixed and non-overridable through this API
- `clip-apps/src/core/texturizer/config.spec.ts`
  - verifies override apply behavior
  - verifies reset restores default warning rule thresholds

### Texturizer session-level override hook (done in this batch)

Added a non-UI integration point to consume override settings per session:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - on workspace initialization, reads `ws-texturizer-warning-rule-overrides` from `localStorage`
  - applies parsed overrides through config API when valid
  - falls back to reset API on missing/invalid payload
- this provides a lightweight internal bridge before exposing a formal UI control

### Texturizer override storage utilities (done in this batch)

Added reusable import/export/storage helpers for session override payloads:

- `clip-apps/src/apps/texturizer/warningOverrideStorage.ts`
  - added payload sanitize/parse helpers
  - added JSON export helper for external tooling
  - added storage load/save helpers around `ws-texturizer-warning-rule-overrides`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - session override initialization now uses storage utility module
- `clip-apps/src/apps/texturizer/warningOverrideStorage.spec.ts`
  - verifies sanitize/parse behavior
  - verifies storage save/load/clear behavior

### Texturizer dev console override API (done in this batch)

Added a minimal development-only debug bridge for session override tuning:

- `clip-apps/src/apps/texturizer/warningOverrideStorage.ts`
  - added debug API factory (`get`, `set`, `reset`, `exportJson`)
  - added installer to attach API onto `window.__texturizerWarningOverrides`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - in `import.meta.env.DEV`, installs debug API at workspace initialization
- `clip-apps/src/apps/texturizer/warningOverrideStorage.spec.ts`
  - verifies debug API behavior and install path

### Texturizer override immediate-apply bridge (done in this batch)

Improved developer debug flow so override changes are applied immediately in current session:

- `clip-apps/src/apps/texturizer/warningOverrideStorage.ts`
  - debug API now supports optional change listener callback
  - `set/reset` now notify caller with current override payload
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - dev installer now passes listener that directly applies/reset runtime warning rule thresholds
- `clip-apps/src/apps/texturizer/warningOverrideStorage.spec.ts`
  - verifies listener callback receives updates on `set/reset`

### Texturizer subdivision pass upgrade (done in this batch)

Improved the bridge subdivision stage toward legacy behavior:

- `clip-apps/src/core/texturizer/subdivision.ts`
  - extracted worker-inline subdivision into reusable core module
  - switched to global split-edge marking and per-triangle 0/1/2/3-edge split topology
  - added shared midpoint cache keyed by quantized geometric edge
  - kept existing safety-cap and adaptive threshold iteration model
- `clip-apps/src/workers/texturizer.worker.ts`
  - worker now delegates subdivision stage to core module
- `clip-apps/src/core/texturizer/subdivision.spec.ts`
  - added baseline tests for no-op/active split/output topology validity

### Texturizer decimation clustering refinement (done in this batch)

Improved decimation bridge behavior and modularity while keeping worker pipeline contract stable:

- `clip-apps/src/core/texturizer/decimation.ts`
  - extracted worker-inline decimation to reusable core helper
  - upgraded cell-cluster path with iterative cell-size search to better approach target triangle count
  - retained robust fallback behavior for degenerate clustering outcomes
- `clip-apps/src/workers/texturizer.worker.ts`
  - decimation stage now delegates to `decimateTrianglesClustered(...)`
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - added tests for no-op near ratio=1, monotonic reduction at lower ratio, and target-approach sanity window

### Texturizer decimation target convergence tightening (done in this batch)

Further improved bridge decimation output stability for requested ratios:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added distributed triangle downsample fallback when clustered result significantly overshoots target count
  - keeps deterministic, bounded output closer to requested decimation ratio
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - tightened target-approach tolerance
  - added overshoot-cap test coverage for low-ratio cases

### Texturizer QEM-lite bridge stage (done in this batch)

Introduced a small-mesh QEM-style bridge path ahead of full legacy QEM migration:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added lightweight indexed edge-collapse loop for small meshes (`QEM-lite`)
  - edge candidate scoring currently uses shortest-edge cost with midpoint placement
  - keeps clustered-decimation path as default fallback for larger meshes
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - added small-mesh test coverage to ensure QEM-lite reduction path is active and stable

### Texturizer QEM-lite safety guards (done in this batch)

Added two critical stability guards inspired by legacy decimation behavior:

- `clip-apps/src/core/texturizer/decimation.ts`
  - boundary-edge protection: QEM-lite candidate edges now require at least two adjacent active faces
  - normal-flip rejection: collapse candidates are skipped when affected face normals would flip/deviate too much
  - clustered decimation fallback remains unchanged for non-QEM-lite path

### Texturizer QEM-lite quadric cost upgrade (done in this batch)

Improved QEM-lite collapse scoring toward legacy QEM behavior:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added per-vertex quadric accumulation from active face planes
  - candidate edge collapse now evaluates quadric error at endpoint A / endpoint B / midpoint and picks lowest-cost placement
  - keeps existing boundary + normal-flip guards and clustered fallback path

### Texturizer QEM-lite micro-incremental loop optimization (done in this batch)

Reduced full-rebuild pressure in QEM-lite collapse loop:

- `clip-apps/src/core/texturizer/decimation.ts`
  - each QEM-lite rebuild now applies a small batch of valid collapses before next global recompute
  - added runtime edge re-validation (`shared active faces`) before each collapse to avoid stale-candidate boundary issues
  - preserves existing guard semantics and fallback behavior while improving practical throughput

### Texturizer QEM-lite link-condition guard (done in this batch)

Added non-manifold pinch prevention for candidate edge collapses:

- `clip-apps/src/core/texturizer/decimation.ts`
  - introduced link-condition style guard by checking common-neighbor consistency between collapse endpoints
  - candidate collapses with excessive common neighbors are rejected before normal-flip check
  - this complements existing boundary and normal-flip guards

### Texturizer QEM-lite heap-based candidate scheduling (done in this batch)

Reduced per-iteration candidate processing overhead in QEM-lite:

- `clip-apps/src/core/texturizer/decimation.ts`
  - replaced full candidate-array sort with min-heap scheduling
  - candidate generation now pushes directly into heap by quadric cost
  - collapse loop consumes best candidates by heap pop while preserving runtime guards

### Texturizer stage timing meta (done in this batch)

Added stage-level runtime observability for subdivision/displacement/decimation:

- `clip-apps/src/types/texturizer.ts`
  - extended `TexturizeResult.meta` with optional `stageTimingsMs`
- `clip-apps/src/workers/texturizer.worker.ts`
  - records per-stage elapsed milliseconds (`subdivision`, `displacement`, `decimation`, `total`)
  - emits rounded timing values in result meta
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - current-run summary now displays stage timing breakdown
  - recent-job table now shows total stage timing when available

### Texturizer runtime stage progress events (done in this batch)

Enabled in-flight stage progress from worker to UI:

- `clip-apps/src/types/texturizer.ts`
  - added `TexturizerProgressEvent` / `TexturizerRunStage` contract
- `clip-apps/src/workers/texturizer.worker.ts`
  - emits progress events for subdivision/displacement/decimation/finalize
  - keeps final result payload as terminal message
- `clip-apps/src/api/texturizer.ts`
  - `runTexturizer` now supports optional `onProgress` callback
  - progress messages are forwarded without resolving the run promise
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - shows live stage label + percentage + progress bar during run

### Texturizer weighted overall progress mapping (done in this batch)

Improved run-time progress continuity across stage boundaries:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - maps per-stage progress into a weighted global progress timeline
  - progress bar now increases continuously from 0% to 100% across all stages

### Texturizer progress weights config centralization (done in this batch)

Moved progress-stage weighting from hardcoded workspace logic into core config:

- `clip-apps/src/core/texturizer/config.ts`
  - added `progressStageWeights` config branch
  - added override/reset APIs for progress-stage weights
- `clip-apps/src/core/texturizer/config.spec.ts`
  - added tests for progress weight override + reset behavior
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - overall progress mapping now reads normalized stage weights from `getTexturizerConfig()`

### Texturizer progress-weight session override/debug bridge (done in this batch)

Extended session-level debug tooling to include progress stage weights:

- `clip-apps/src/apps/texturizer/warningOverrideStorage.ts`
  - added storage key/helpers for progress weight overrides
  - added debug API installer at `window.__texturizerProgressWeights`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - applies progress-weight session overrides on initialization
  - installs DEV debug bridge to set/reset progress-weight overrides in-session
- `clip-apps/src/apps/texturizer/warningOverrideStorage.spec.ts`
  - added coverage for progress-weight sanitize/parse/save/load and debug API install path

### Texturizer unified debug API surface (done in this batch)

Consolidated debug entry points under one global object while preserving compatibility aliases:

- `clip-apps/src/apps/texturizer/warningOverrideStorage.ts`
  - added unified installer `installTexturizerDebugApi(...)`
  - exports `window.__texturizerDebug` with:
    - `warningRules`
    - `progressWeights`
  - keeps legacy aliases (`__texturizerWarningOverrides`, `__texturizerProgressWeights`)
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - switched DEV installer path to unified debug API
- `clip-apps/src/apps/texturizer/warningOverrideStorage.spec.ts`
  - added unified debug API install coverage

### Texturizer core-stage internal progress callbacks (done in this batch)

Improved stage progress fidelity by wiring algorithm-internal progress to worker events:

- `clip-apps/src/core/texturizer/subdivision.ts`
  - subdivision helper now supports optional progress callback
- `clip-apps/src/core/texturizer/decimation.ts`
  - decimation helper now supports optional progress callback (QEM-lite and clustered paths)
- `clip-apps/src/workers/texturizer.worker.ts`
  - subdivision/decimation progress events now receive internal algorithm progress updates

### Texturizer decimation engine observability (done in this batch)

Added runtime metadata showing which decimation path is actually used:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added `decimateTrianglesClusteredDetailed(...)` returning `{ vertices, engine }`
  - engine labels include: `none`, `qem-lite`, `cluster`, `cluster+downsample`
  - preserved legacy `decimateTrianglesClustered(...)` compatibility wrapper
- `clip-apps/src/workers/texturizer.worker.ts`
  - decimation stage now uses detailed result and emits `meta.decimationEngine`
- `clip-apps/src/types/texturizer.ts`
  - extended texturizer run meta with optional `decimationEngine`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - current-run and recent-job summaries now display decimation engine label

### Texturizer QEM-lite dirty-neighborhood candidate refresh (done in this batch)

Reduced per-loop full candidate rebuild overhead in QEM-lite decimation:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added edge versioning to lazily invalidate stale heap candidates
  - switched from repeated full candidate collection to:
    - one initial full candidate build
    - per-collapse local candidate refresh over affected faces only
  - extracted edge scoring helper and local affected-face collection helper

### Texturizer QEM-lite adjacency-backed topology checks (done in this batch)

Further reduced repeated global face scans in collapse validation:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added `buildVertexFaceAdjacency(...)` and used it in QEM-lite loop
  - `sharedActiveFacesForEdge`, `hasLinkViolation`, and `hasNormalFlip` now support adjacency-assisted fast path
  - after each successful collapse, adjacency cache is rebuilt once and reused by subsequent topology checks

### Texturizer QEM-lite incremental adjacency update (done in this batch)

Replaced per-collapse full adjacency rebuild with local incremental updates:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added `collapseEdgeWithAdjacency(...)` to drive collapse via keep/remove neighborhood faces only
  - adjacency sets are updated in-place for dirty faces, instead of rebuilding full `vertex -> faces` map
  - dirty-face set is now directly returned from collapse for local candidate refresh

### Texturizer QEM-lite incremental edge-use cache (done in this batch)

Removed repeated full edge-face counting during local candidate refresh:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added incremental `edgeUse` maintenance for dirty faces in collapse path
  - candidate collection now consumes cached `edgeUse` map instead of recomputing from all faces
  - local refresh after each collapse now updates candidates with both adjacency and edge-use caches

### Texturizer QEM-lite incremental quadric update (done in this batch)

Removed per-collapse full quadric rebuild in QEM-lite:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added face-level quadric accumulation helper for signed (+/-) contribution updates
  - during each collapse, dirty old faces are subtracted from quadrics using pre-collapse position snapshots
  - dirty new faces are added back after topology update, keeping quadrics in sync incrementally

### Raster radial WebGPU execution path (done in this batch)

Extended radial mode to attempt WebGPU execution before CPU fallback:

- `clip-apps/src/shaders/planar-rasterize.wgsl`
  - raster uniform now supports anisotropic grid steps (`step_size_x`, `step_size_y`)
- `clip-apps/src/workers/raster.worker.ts`
  - generalized GPU raster pre-stage to accept independent X/Y step sizes
  - generalized GPU path reconstruction to use independent world-step mapping
  - `radial` mode now attempts:
    - radial-space GPU terrain/tool rasterization
    - GPU path generation over radial grid
  - keeps existing CPU radial implementation as safe fallback

### Raster worker GPU buffer pooling (done in this batch)

Reduced repeated per-run GPU buffer create/destroy overhead:

- `clip-apps/src/workers/raster.worker.ts`
  - added persistent worker-side `GPUBuffer` pool keyed by stage/buffer role
  - pooled buffers now cover raster/toolpath/tracing intermediate and readback buffers
  - pool resizes on demand (power-of-two sizing) and reuses existing compatible buffers

### Raster GPU buffer-pool observability (done in this batch)

Added per-run pool hit/miss telemetry to support optimization validation:

- `clip-apps/src/types/raster.ts`
  - extended `RasterResult.summary` with optional `gpuBufferPool` metrics
- `clip-apps/src/workers/raster.worker.ts`
  - tracks and resets per-run pool stats: `hits`, `misses`, `reuses`, `newAllocs`
  - emits metrics for runs that use GPU path
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - displays pool metrics inline in run summary when available

### Raster GPU batch self-check utility (done in this batch)

Added a quick warm-up/iteration benchmark action for GPU path:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - added `GPU 批跑自检(5次)` button
  - runs same input/config with forced `webgpu` engine for 5 consecutive runs
  - reports per-run + average elapsed time and pool stats:
    - `hits`, `misses`, `reuses`, `newAllocs`
  - includes fallback count when forced GPU path still falls back to CPU

### Raster GPU cold/hot batch comparison (done in this batch)

Extended batch self-check to separate cold-start vs warm cache behavior:

- `clip-apps/src/types/raster.ts`
  - added optional `resetGpuBufferPool` request flag (debug-oriented)
- `clip-apps/src/workers/raster.worker.ts`
  - added pool-clear path to destroy and reset worker-side pooled buffers on demand
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - `GPU 批跑自检(5次)` now runs:
    - one cold-start run (with pool reset)
    - five hot runs (pool retained)
  - reports cold metrics and hot average/per-run metrics in one comparison block

### Raster cold/hot auto-assessment line (done in this batch)

Added an automatic interpretation summary for GPU warm-cache validation:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - cold/hot batch report now appends `Assessment` line
  - compares cold vs hot average on:
    - elapsed time
    - pool misses
    - new allocations
  - emits human-readable conclusion to reduce manual metric interpretation effort

### Raster GPU stage timing observability (done in this batch)

Added per-stage GPU timing metadata for bottleneck localization:

- `clip-apps/src/types/raster.ts`
  - extended `RasterResult.summary` with optional `gpuStagesMs`
  - fields: `rasterize`, `toolpath`, `tracing`, `totalGpu`
- `clip-apps/src/workers/raster.worker.ts`
  - records stage timings on GPU code paths
  - emits rounded timing metrics in result summary for both direct-return and mixed-path flows
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - shows stage timing line in run summary when GPU stage metrics are available

### Raster cold/hot stagewise timing comparison (done in this batch)

Extended cold/hot batch report with GPU stage-level warm-up deltas:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - cold/hot batch now includes per-stage timing arrays and hot averages:
    - `gpu.rasterize`
    - `gpu.toolpath`
    - `gpu.tracing`
    - `gpu.total`
  - each stage now reports warm-up improvement percentage against cold baseline

### CAM runtime input geometry bridge (done in this batch)

Replaced stock-only placeholder geometry input with optional real STL part bounds:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `导入工件 STL` action for CAM workspace
  - parses STL and computes real part bounding box + complexity hint
  - `onSimulateCamJob` now prefers imported part geometry; falls back to stock placeholder only when no STL is loaded
  - updated CAM run section wording to reflect legacy runtime bridge intent instead of pure placeholder simulation

### CAM run snapshot persistence bridge (done in this batch)

Added reproducible CAM run snapshots for iterative tuning and replay:

- `clip-apps/src/stores/useCamStore.ts`
  - added `recentRuns` state with localStorage persistence (`ws-cam-recent-runs`)
  - added actions: `loadRecentRuns`, `addRecentRun`, `clearRecentRuns`, `loadRunSnapshot`
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - each CAM run now stores snapshot with:
    - runtime profile clone (`device/tools/process`, including local ops edits)
    - input geometry snapshot
    - backend result snapshot
  - added `最近运行` table with one-click load-back and clear actions
  - loading snapshot restores profile/process and current CAM result context

### CAM snapshot -> profile save bridge (done in this batch)

Connected recent CAM run snapshots back into persistent profile management:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `最近运行` now supports `另存配置` action
  - prompts for profile name and saves snapshot runtime `device/tools/process` as a selectable CAM profile
  - enables run-result-driven process iteration loop without manual JSON export/import

### CAM snapshot diff quick-view (done in this batch)

Added a lightweight snapshot-vs-current comparison flow for decision support:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `最近运行` adds `对比当前` action
  - opens a summary dialog showing key field deltas between current profile and selected run snapshot
  - includes stock/Z/feed fields and operation-sequence count/type signature comparison

### CAM structured diff and per-field apply (done in this batch)

Upgraded snapshot comparison from plain text into actionable structured workflow:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `差异详情（快照 vs 当前）` table section
  - `对比当前` now populates structured diff rows (`字段/当前值/快照值`)
  - each diff row supports one-click `应用` to patch current working config
  - supports per-field apply for key CAM knobs plus op-sequence apply

### CAM diff apply single-step undo (done in this batch)

Added safety rollback for per-field apply actions:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - before each diff apply, captures undo snapshot of key current state (`device/process/localOps`)
  - added `撤销上次应用` button in diff section
  - undo restores previous values and refreshes diff table against active snapshot target

### CAM diff multi-step undo/redo (done in this batch)

Extended diff-apply safety controls to support iterative experimentation:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced single-step undo with bounded history stacks (`undo` / `redo`)
  - each apply push records current state snapshot; redo stack clears on new apply
  - added UI actions in diff section:
    - `撤销`
    - `重做`
  - undo/redo both rehydrate state and refresh structured diff view

### CAM diff action log trail (done in this batch)

Added lightweight operation tracing for diff-apply workflow:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added action log table in diff section
  - logs `apply` / `undo` / `redo` actions with timestamp and field context
  - keeps bounded recent history for quick tuning path review

### CAM diff action log export (done in this batch)

Added export path for tuning-trace portability:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `导出日志` action in diff log section
  - exports current diff session trail as JSON (target snapshot info + ordered log entries)

### CAM session bundle migration metadata (done in this batch)

Improved one-click session export for cross-version traceability:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `导出会话包` payload now includes `migrationMeta`
  - metadata includes schema version, source tag, active profile, backend hints, and basic engine/gcode presence flags
  - keeps existing `targetRun/currentContext/diff` sections unchanged for backward readability

### CAM session bundle import preview (done in this batch)

Added safe read-only ingest path for session bundle inspection:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `导入会话包预览` action and hidden JSON file input
  - parses session bundle JSON into local preview state without mutating current CAM config
  - renders key preview summary (`migrationMeta`, target run/backend, diff item/log counts)

### CAM session bundle selective replay (done in this batch)

Extended bundle preview with controlled field-level apply actions:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added preview-side apply actions for `device` / `process` / `ops`
  - apply path reuses existing diff workflow safety chain:
    - pushes undo snapshot
    - clears redo stack
    - appends action log entry
  - after apply, refreshes diff view against current comparison target and clears current run result cache

### CAM session bundle apply confirmation guard (done in this batch)

Added second-step confirmation before preview replay mutates current config:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - bundle apply now computes estimated changed-field count per target (`device`/`process`/`ops`)
  - shows confirm dialog with affected-count summary before commit
  - only executes apply when user explicitly confirms

### CAM session bundle apply change-key preview (done in this batch)

Improved safety confirmation readability with concrete field-name preview:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - confirmation dialog now includes changed key preview (top N fields + remaining count)
  - supports `device` / `process` granular key listing and `ops` aggregate marker

### CAM session bundle apply value-diff preview (done in this batch)

Upgraded confirmation details from key list to compact before/after value summary:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply confirmation now shows per-key `current -> incoming` preview lines
  - adds value summarization rules for long strings/arrays/objects to keep dialog readable

### CAM session bundle apply high-impact risk markers (done in this batch)

Added quick visual risk cues in apply confirmation preview:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - high-impact keys are marked with `!` in value-diff lines
  - current high-impact set includes:
    - `deviceName`
    - `camZ*`
    - `camFastFeed*`
    - `ops`

### CAM session bundle risk-level grading and counts (done in this batch)

Refined replay safety cues from binary marker to graded risk model:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - risk tag upgraded to:
    - `!!` high risk
    - `!` medium risk
  - confirmation dialog now includes high/medium risk change counts
  - current high-risk set emphasizes `deviceName`, key Z anchors/bounds, and `ops`

### CAM risk rule extraction and unit tests (done in this batch)

Improved maintainability by moving replay risk logic out of page component:

- `clip-apps/src/core/cam/riskRules.ts`
  - centralized CAM field risk classifier (`high` / `medium` / `low`)
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now imports and reuses shared risk classifier
- `clip-apps/src/core/cam/riskRules.spec.ts`
  - added unit tests for high/medium/default low risk mappings

### CAM diff table risk-level labels (done in this batch)

Extended risk visibility from apply-confirm dialog to diff browsing stage:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - each diff item now carries computed risk level
  - `差异详情` field column now shows risk prefix:
    - `!!` high
    - `!` medium
  - `ops.length` / `ops.types` rows inherit `ops` high-risk classification

### CAM diff table colored risk tags (done in this batch)

Improved diff scanability by replacing symbol prefixes with semantic tags:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - diff field column now uses color tags:
    - `高风险` (danger)
    - `中风险` (warning)
  - removed inline `!!` / `!` prefix formatter in table display

### CAM confirm dialog colored risk summary cues (done in this batch)

Aligned apply-confirm risk summary with color semantics in text-safe form:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - confirmation summary now uses color cue icons:
    - `🟥高风险`
    - `🟧中风险`
  - keeps plain-text dialog payload (no HTML rendering dependency)

### CAM confirm preview risk-priority ordering (done in this batch)

Improved apply-confirm readability by prioritizing critical changes first:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - confirmation diff preview lines are now sorted by risk level:
    - high risk first
    - medium risk second
    - low risk last

### CAM confirm preview remaining-risk breakdown (done in this batch)

Improved truncated preview interpretability with risk-structured tail summary:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - when preview lines are truncated, remaining items now show risk breakdown:
    - `🟥high / 🟧medium / low`
  - helps evaluate hidden-tail impact without expanding full field list

### CAM session preview limit preference (done in this batch)

Added configurable and persisted line limit for apply-confirm preview:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - session bundle preview section now provides limit options: `8 / 12 / 20`
  - selected limit is stored in localStorage (`ws-cam-bundle-preview-limit`)
  - apply confirmation diff preview now uses user-selected limit

### CAM session preview limit reset action (done in this batch)

Added one-click fallback to default preview verbosity:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `恢复默认` action next to preview-limit selector
  - reset applies default limit `8` and persists immediately

### CAM session preview settings import/export (done in this batch)

Added portability for preview configuration preferences:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `导入预览设置` / `导出预览设置` actions
  - settings payload currently includes:
    - `schemaVersion`
    - `previewLimit` (`8|12|20`)
  - import validates payload and applies persisted preview-limit preference

### CAM preview settings schema compatibility read (done in this batch)

Hardened settings import path for forward-version payload tolerance:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - import path now explicitly handles `schemaVersion=1`
  - for other numeric schema versions, keeps compatibility-read attempt with warning message
  - preserves strict `previewLimit` domain validation (`8|12|20`)

### CAM preview settings parser extraction and tests (done in this batch)

Made settings import logic testable and version-safe through core parser module:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - added `resolveSessionPreviewSettingsPayload(...)` to centralize schema/validation/compat warning logic
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts`
  - added unit coverage for:
    - `schemaVersion=1` success
    - unknown numeric schema compatibility warning
    - invalid `previewLimit` rejection
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now delegates preview-settings import parsing to shared core parser

### CAM preview settings type source unification (done in this batch)

Removed duplicate payload typing to avoid schema drift:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - remains the single source of truth for `SessionPreviewSettingsPayload`
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now imports payload type from core module instead of redefining locally

### CAM preview limit constants unification (done in this batch)

Removed duplicated magic numbers for preview-limit domain:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - added shared constants and helpers:
    - `SESSION_PREVIEW_LIMIT_OPTIONS`
    - `DEFAULT_SESSION_PREVIEW_LIMIT`
    - `isValidSessionPreviewLimit(...)`
    - `normalizeSessionPreviewLimit(...)`
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - preview selector options now render from shared constants
  - localStorage load/change/reset paths now use shared normalize/default helpers
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts`
  - added normalization behavior coverage

### CAM preview settings storage-key source unification (done in this batch)

Completed single-source ownership for preview settings contract components:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - now exports `CAM_BUNDLE_PREVIEW_LIMIT_KEY`
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now imports storage key from core settings module
  - removed local duplicate storage-key string literal

### CAM preview settings storage I/O helper extraction (done in this batch)

Completed single-source ownership for storage access logic:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - added `loadSessionPreviewLimitFromStorage(...)`
  - added `saveSessionPreviewLimitToStorage(...)`
  - both helpers centralize normalization and storage error fallback policy
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - preview-limit load/save now delegates to core storage helpers
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts`
  - added unit coverage for storage load/save helper behavior

### CAM preview settings export payload builder extraction (done in this batch)

Further reduced page-layer ownership in settings contract generation:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - added `SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION`
  - added `createSessionPreviewSettingsPayload(...)` to build normalized export payload
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - export action now delegates payload creation to core helper
  - removed inline `schemaVersion` literal from page code
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts`
  - added unit test for payload builder schema/default-normalization behavior

### CAM preview settings export artifact builder extraction (done in this batch)

Moved export filename/json assembly out of page-layer handler:

- `clip-apps/src/core/cam/sessionPreviewSettings.ts`
  - added `createSessionPreviewSettingsExportArtifact(...)` returning `{ filename, json }`
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - export action now delegates filename + JSON generation to core helper
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts`
  - added deterministic test coverage for export artifact filename and JSON payload

### CAM session diff preview formatter extraction (done in this batch)

Reduced page-layer formatting logic by moving confirm-preview helpers into core:

- `clip-apps/src/core/cam/sessionDiffPreview.ts`
  - added shared helpers for:
    - value summarization
    - risk-priority diff line ordering/rendering
    - risk stats line formatting
    - remaining-tail risk breakdown formatting
- `clip-apps/src/core/cam/sessionDiffPreview.spec.ts`
  - added unit coverage for risk-priority ordering and summary formatting
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply-confirm preview now imports these helpers from core module
  - removed duplicated inline formatting helpers from page component

### CAM session diff detector extraction (done in this batch)

Moved field-change detection logic from page layer into reusable core helper:

- `clip-apps/src/core/cam/sessionDiffDetector.ts`
  - added `countChangedFields(...)`
  - added `listChangedFieldKeys(...)`
- `clip-apps/src/core/cam/sessionDiffDetector.spec.ts`
  - added unit tests for ignore-key behavior and changed-key listing
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply-confirm change-count/key-list computation now delegates to core detector

### CAM session apply preview ops/risk helper extraction (done in this batch)

Continued page-thinning for apply-confirm composition details:

- `clip-apps/src/core/cam/sessionDiffPreview.ts`
  - added `buildOpsApplyDiffPreviewLine(...)`
  - added `countRiskLevels(...)`
- `clip-apps/src/core/cam/sessionDiffPreview.spec.ts`
  - added coverage for ops preview line and risk-level aggregate counts
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `ops` preview line and risk count aggregation now delegate to core helpers

### CAM apply-confirm message builder extraction (done in this batch)

Further reduced page-layer string composition in replay confirmation flow:

- `clip-apps/src/core/cam/sessionDiffPreview.ts`
  - added `buildApplyConfirmMessage(...)` to compose full confirm dialog text
- `clip-apps/src/core/cam/sessionDiffPreview.spec.ts`
  - added unit coverage for confirm-message composition output
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply-confirm dialog now consumes prebuilt message from core helper

### CAM apply-preview branch composer extraction (done in this batch)

Moved field-branch preview composition from page handler into core orchestration helper:

- `clip-apps/src/core/cam/sessionApplyPreview.ts`
  - added `buildRecordApplyPreview(...)`
  - added `buildOpsApplyPreview(...)`
  - encapsulates change detection + preview lines + confirm message composition
- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts`
  - added unit tests for record/ops preview build paths
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `applySessionBundleField` now delegates preview branch composition to core helpers

### CAM session field apply executor extraction (done in this batch)

Moved field-apply mutation logic from page branch code into core executor:

- `clip-apps/src/core/cam/sessionApplyExecutor.ts`
  - added `applySessionFieldToState(...)` for `device/process/ops` apply branches
- `clip-apps/src/core/cam/sessionApplyExecutor.spec.ts`
  - added unit coverage for device/process apply and ops clone behavior
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply mutation path now delegates to core executor with compatibility-failure guard

### CAM apply-preview unified builder/guard extraction (done in this batch)

Further consolidated apply-confirm preparation into core:

- `clip-apps/src/core/cam/sessionApplyPreview.ts`
  - added `canBuildSessionApplyPreview(...)` for field/profile compatibility guard
  - added `buildSessionApplyPreview(...)` as unified preview composer for `device/process/ops`
- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts`
  - added coverage for unified guard + preview builder behavior
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply handler now uses core guard + unified preview builder instead of inline branch composition

### CAM undo/redo history workflow helper extraction (done in this batch)

Centralized history-stack transitions for apply/undo/redo flows:

- `clip-apps/src/core/cam/sessionHistory.ts`
  - added shared helpers:
    - `pushUndoAndClearRedo(...)`
    - `popUndoWithCurrentToRedo(...)`
    - `popRedoWithCurrentToUndo(...)`
- `clip-apps/src/core/cam/sessionHistory.spec.ts`
  - added unit tests for push/pop stack transitions and current-state transfer behavior
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - apply/undo/redo stack updates now delegate to core history helpers

### CAM diff-item apply executor extraction (done in this batch)

Moved per-diff-key mutation switch logic from page component into core:

- `clip-apps/src/core/cam/sessionDiffApply.ts`
  - added shared `DiffKey` type
  - added `applyDiffKeyToState(...)` for `device/process/ops` diff-item apply branches
- `clip-apps/src/core/cam/sessionDiffApply.spec.ts`
  - added unit tests for scalar field apply and ops apply/reset-selection hint
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `onApplyDiffItem` now delegates field mutation to core diff-apply executor

### CAM snapshot diff builder/type extraction (done in this batch)

Moved snapshot-vs-current diff construction and item typing into core:

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts`
  - added shared `DiffItem` type
  - added `buildSessionSnapshotDiffItems(...)` for key/ops diff generation with risk levels
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts`
  - added unit coverage for scalar and ops diff generation
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - local `DiffItem` type and inline snapshot diff builder removed
  - now delegates diff construction to core helper

### CAM diff log helper extraction (done in this batch)

Moved diff-log append/export shaping from page component into core helper:

- `clip-apps/src/core/cam/sessionDiffLog.ts`
  - added `DiffActionLog` type
  - added `appendDiffActionLog(...)` for bounded log append
  - added `createDiffLogExportArtifact(...)` for export filename + JSON payload generation
- `clip-apps/src/core/cam/sessionDiffLog.spec.ts`
  - added tests for append truncation and export artifact generation
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - log append/export paths now delegate to core diff-log helper

### CAM legacy runtime auto-detect init mode (done in this batch)

Reduced runtime bridge activation friction by introducing auto probe mode:

- `clip-apps/src/core/cam/kiriCamRuntime.ts`
  - `VITE_KIRI_LEGACY_CAM` now supports modes:
    - `'1'`: strict enable (init failure if legacy modules fail)
    - `'0'`: disable legacy imports
    - default/other (`auto`): attempt import, fallback silently to placeholder path when unavailable
  - this keeps CAM job flow runnable without manual env setup while preserving strict mode for debugging

### CAM legacy fallback reason observability (done in this batch)

Improved placeholder-path diagnosis when legacy CAM is not selected:

- `clip-apps/src/core/cam/camEngine.ts`
  - added fallback-reason resolver based on env mode/runtime readiness/init errors/impl availability
  - placeholder result `notes` now includes explicit `fallback reason: ...`

### CAM structured fallback metadata (done in this batch)

Promoted legacy fallback diagnosis from plain notes into typed result field:

- `clip-apps/src/types/camJob.ts`
  - `CamJobResult` now supports optional structured `fallback` payload (`reasonCode` + `message`)
- `clip-apps/src/core/cam/camEngine.ts`
  - placeholder backend now emits structured fallback metadata
  - legacy backend explicitly emits `fallback: null`
  - notes line keeps backward-compatible human-readable fallback message

### CAM workspace structured fallback display bridge (done in this batch)

Connected structured fallback metadata to CAM workspace result view:

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - run result text now prepends concise structured lines:
    - `backend=...`
    - `fallback.reasonCode=...` (when present)
    - `fallback.message=...` (when present)
  - keeps full JSON payload below for detailed inspection and compatibility

### CAM fallback reason label mapping (done in this batch)

Improved fallback readability with localized reason labels:

- `clip-apps/src/core/cam/camFallbackUi.ts`
  - added fallback code -> Chinese label mapping helper
- `clip-apps/src/core/cam/camFallbackUi.spec.ts`
  - added baseline mapping tests
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - result summary now includes `fallback.reasonLabel=...` line when fallback exists

### CAM result text formatter extraction (done in this batch)

Moved CAM result summary-text composition out of workspace page:

- `clip-apps/src/core/cam/camResultText.ts`
  - added `formatCamResultText(...)` for `backend/fallback` summary + JSON body rendering
- `clip-apps/src/core/cam/camResultText.spec.ts`
  - added formatter behavior test (including fallback label mapping line)
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now consumes shared formatter instead of inline string composition

### CAM session bundle export artifact extraction (done in this batch)

Moved large session-bundle payload/filename assembly out of page handler:

- `clip-apps/src/core/cam/sessionBundleExport.ts`
  - added `createCamSessionBundleExportArtifact(...)`
  - owns bundle schema version and migration meta payload construction
- `clip-apps/src/core/cam/sessionBundleExport.spec.ts`
  - added deterministic export artifact test coverage
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `onExportCamSessionBundle` now delegates artifact building to core helper
  - removed local bundle schema-version constant

### CAM export artifact base helper unification (done in this batch)

Unified timestamped JSON export assembly across CAM helpers:

- `clip-apps/src/core/cam/exportArtifacts.ts`
  - added shared helpers:
    - `createTimestampedJsonFilename(...)`
    - `createJsonExportArtifact(...)`
- `clip-apps/src/core/cam/exportArtifacts.spec.ts`
  - added deterministic filename and JSON artifact tests
- refactored CAM export helpers to reuse base helper:
  - `sessionPreviewSettings.ts`
  - `sessionDiffLog.ts`
  - `sessionBundleExport.ts`

### CAM download utility extraction (done in this batch)

Removed duplicated page-level blob download helper in CAM workspace:

- `clip-apps/src/core/utils/download.ts`
  - added shared `downloadText(...)` utility
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - now imports and reuses shared download utility
  - removed local inline `downloadText(...)` function

### Workspace download utility reuse expansion (done in this batch)

Extended shared download helper adoption across non-CAM workspaces:

- `clip-apps/src/core/utils/download.ts`
  - reused as common text/blob download path
- migrated page-level `downloadText(...)` removal in:
  - `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - `clip-apps/src/apps/carvera/CarveraWorkspace.vue`
  - `clip-apps/src/apps/gridbot/GridBotWorkspace.vue`

### CAM legacy slice-only bridge path (done in this batch)

Further reduced `cam-placeholder` coverage by introducing a partial legacy CAM execution path:

- `clip-apps/src/core/cam/camEngine.ts`
  - legacy decision now distinguishes:
    - `cam_slice` availability (slice execution)
    - `cam_export` availability (final gcode export)
  - when `cam_slice` is available but `cam_export` is missing:
    - run legacy slice path
    - return backend as `kiri-cam-slice-only`
    - emit diagnostic gcode stub text instead of falling back to placeholder backend
- `clip-apps/src/types/camJob.ts`
  - extended CAM result backend union with `kiri-cam-slice-only`

### Slicer legacy runtime mode/fallback alignment (done in this batch)

Aligned FDM slicer runtime strategy with CAM-style mode semantics:

- `clip-apps/src/core/slicer/kiriEngine.ts`
  - legacy FDM runtime mode now reads `VITE_KIRI_LEGACY_FDM` with:
    - `'1'`: strict mode (import/runtime failures propagate)
    - `'0'`: disable legacy import path
    - default (`auto`): try legacy path, tolerate failures and keep placeholder-compatible output
  - removed DEV-only guard around legacy FDM slice attempt
  - placeholder perimeter enrichment now follows mode (`mode !== '0'`) instead of DEV-only branch
- `clip-apps/src/workers/slicer.worker.ts`
  - `backendKind='kiri'` failure handling now respects mode:
    - strict (`'1'`): keep hard failure
    - auto/default: fallback to `mock` backend result instead of failing whole job

### Slicer structured fallback metadata bridge (done in this batch)

Added explicit fallback diagnostics to slicer result contract and workspace UI:

- `clip-apps/src/api/slice.ts`
  - added `SliceFallbackReasonCode` and optional `SliceResult.fallback` payload
- `clip-apps/src/workers/slicer.worker.ts`
  - on `kiri` path failure with non-strict mode, fallback-to-mock result now carries:
    - `fallback.reasonCode`
    - `fallback.message`
  - baseline `mock` path emits `fallback: null`
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - right panel now displays fallback code/message when present

### Slicer fallback reason label mapping (done in this batch)

Improved fallback readability by mapping slicer reason codes to localized labels:

- `clip-apps/src/core/slicer/sliceFallbackUi.ts`
  - added centralized `SliceFallbackReasonCode -> Chinese label` mapping helper
- `clip-apps/src/core/slicer/sliceFallbackUi.spec.ts`
  - added baseline unit test for label mapping behavior
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - fallback display now renders localized reason label instead of raw reason code

### FDM runtime hint dynamic status text (done in this batch)

Replaced static footer copy with backend/fallback-aware runtime hint:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - added computed `sliceRuntimeHint` derived from `sliceResult.backend` + `sliceResult.fallback`
  - footer hint now shows dynamic status:
    - not sliced yet
    - Kiri backend active
    - mock backend active
    - mock fallback with localized fallback reason label

### FDM send-target action status alignment (done in this batch)

Aligned downstream send actions with current slice backend/fallback status:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - send buttons now use dynamic labels (`Kiri` / `Mock` / `回退结果` / `无切片`)
  - added `sliceSourceTag` metadata used in generated bridge gcode comments
  - bridge payload now includes:
    - `sliceSource=...`
    - `fallbackReason=...` (when fallback exists)
  - send success toasts now reflect actual source tag instead of static placeholder text

### FDM export source-tag alignment (done in this batch)

Unified export path metadata with send path source semantics:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - export gcode header now includes:
    - `sliceSource=...`
    - `fallbackReason=...` (when fallback exists)
  - export filename now uses source-aware prefix:
    - `fdm-${sliceSourceTag}-...`
  - export success toast now reports the active source tag

### Slicer mock geometry-aware preview/estimate upgrade (done in this batch)

Reduced fixed-placeholder behavior in mock slicer by using real model geometry bounds:

- `clip-apps/src/workers/slicer.worker.ts`
  - added vertex-driven XY bounds resolver and Z-span estimator
  - mock preview generation now uses actual job/model bounds instead of fixed `[-50,50]` frame
  - infill spacing now scales with model span and includes segment-cap guard to avoid runaway path counts
  - mock time/filament estimation now factors in geometry perimeter/area instead of fixed per-layer constants
  - when `jobBounds` is missing, worker now derives bounds from input vertices before running mock/fallback slice

### Slicer mock estimator core extraction + unit tests (done in this batch)

Moved geometry-aware mock slicing logic from worker inline code to reusable core module:

- `clip-apps/src/core/slicer/mockSlicer.ts`
  - added reusable helpers:
    - `resolvePlanarBoundsFromVertices(...)`
    - `resolveModelZSpanFromVertices(...)`
    - `withDerivedJobBounds(...)`
    - `buildMockSliceResult(...)`
- `clip-apps/src/workers/slicer.worker.ts`
  - now delegates mock/fallback result construction to `buildMockSliceResult(...)`
  - now delegates missing-bounds derivation to `withDerivedJobBounds(...)`
- `clip-apps/src/core/slicer/mockSlicer.spec.ts`
  - added unit coverage for:
    - bounds derivation from vertices
    - z-span derivation
    - missing `jobBounds` fill path
    - geometry-scale sensitivity in summary estimation

### Kiri preview conversion helper extraction + unit tests (done in this batch)

Moved legacy preview-shape conversion logic into reusable slicer core helper:

- `clip-apps/src/core/slicer/previewConvert.ts`
  - added shared converters:
    - `polyToPath(...)`
    - `lineToPath(...)`
    - `convertWidgetSlicesToLayers(...)`
- `clip-apps/src/core/slicer/previewConvert.spec.ts`
  - added tests for polygon closure, line conversion variants, and widget-slice to layer conversion
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - now imports and reuses preview conversion helpers instead of maintaining inline duplicates

### Kiri geometry helper extraction + unit tests (done in this batch)

Further reduced `kiriEngine` inline geometry loops by extracting reusable vertex helpers:

- `clip-apps/src/core/slicer/geometry.ts`
  - added:
    - `computeVertexBounds3D(...)`
    - `pointsFromVertices(...)`
- `clip-apps/src/core/slicer/geometry.spec.ts`
  - added tests for 3D bounds computation and point conversion behavior
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - now reuses `computeVertexBounds3D(...)` for:
    - perimeter-injection z-range setup
    - legacy fake-widget bounding box construction
  - now reuses `pointsFromVertices(...)` for legacy point conversion

### Kiri preview pipeline composition extraction + unit tests (done in this batch)

Reduced branch complexity in `kiriEngine` by extracting preview-assembly flow:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - added:
    - `estimateLayerCount(...)`
    - `resolvePreviewLayers(...)`
  - centralizes:
    - legacy-preview preference
    - placeholder-layer fallback construction
    - optional perimeter-injection branch behavior by mode
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - added tests for layer-count estimate, placeholder layer generation, and legacy-preview precedence
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - now delegates preview assembly to `resolvePreviewLayers(...)`
  - now delegates layer count estimation to `estimateLayerCount(...)`

### Kiri runtime policy extraction + unit tests (done in this batch)

Separated runtime/mode decision policy from engine execution flow:

- `clip-apps/src/core/slicer/kiriRuntimePolicy.ts`
  - added policy helpers:
    - `resolveLegacyFdmMode(...)`
    - `shouldTryLegacyFdm(...)`
    - `shouldThrowOnLegacyImportFailure(...)`
    - `canRunLegacyFdmPreview(...)`
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts`
  - added tests for mode normalization and execution-gate behavior
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - runtime import and preview-gate decisions now delegate to policy helpers

### Kiri settings adapter extraction + unit tests (done in this batch)

Extracted FDM->Kiri settings mapping from engine into reusable adapter:

- `clip-apps/src/core/slicer/kiriSettingsAdapter.ts`
  - added:
    - `toKiriLegacyRanges(...)`
    - `toKiriLegacyProcess(...)`
    - `buildKiriSettingsPayload(...)`
- `clip-apps/src/core/slicer/kiriSettingsAdapter.spec.ts`
  - added tests for legacy process field mapping and settings payload assembly
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - `buildKiriSettings(...)` now delegates to `buildKiriSettingsPayload(...)`

### Kiri legacy execution bridge extraction + unit tests (done in this batch)

Moved legacy widget bridge execution from engine inline code into dedicated helper:

- `clip-apps/src/core/slicer/kiriLegacyBridge.ts`
  - added `runLegacyFdmSliceBridge(...)`:
    - builds fake legacy widget from vertex bounds + points
    - manages temporary `kiri_worker` scope injection/restoration
    - executes legacy `fdmSliceImpl` and converts slices to preview layers
- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts`
  - added bridge execution test with worker-scope restoration assertion
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - `runLegacyFdmSliceToPreview(...)` now delegates bridge execution to `runLegacyFdmSliceBridge(...)`

### Kiri legacy bridge error-path hardening (done in this batch)

Improved bridge reliability by propagating legacy slice failures while preserving worker-scope cleanup:

- `clip-apps/src/core/slicer/kiriLegacyBridge.ts`
  - `runLegacyFdmSliceBridge(...)` now:
    - rejects when `fdmSliceImpl` completion callback receives an error
    - catches/rejects synchronous throws from `fdmSliceImpl`
    - still restores `workerScope.kiri_worker` in all paths
- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts`
  - added tests for async callback failure and sync throw failure
  - both assert worker-scope restoration under error conditions

### Kiri legacy bridge timeout guard (done in this batch)

Added fail-fast timeout protection to prevent indefinite hangs in legacy slice bridge execution:

- `clip-apps/src/core/slicer/kiriLegacyBridge.ts`
  - `runLegacyFdmSliceBridge(...)` now supports optional `timeoutMs` (default `30_000`)
  - bridge promise rejects with timeout error when `fdmSliceImpl` never reaches completion callback
  - timeout path still goes through existing worker-scope restoration flow
- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts`
  - added timeout test with non-callback slice impl and low `timeoutMs`
  - verifies rejection + worker-scope restoration

### Kiri legacy slice-timeout policy bridge (done in this batch)

Centralized legacy slice timeout policy and wired it into engine->bridge execution:

- `clip-apps/src/core/slicer/kiriRuntimePolicy.ts`
  - added `resolveLegacySliceTimeoutMs(raw)` with bounded normalization (`100..300000`, default `30000`)
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts`
  - added timeout policy normalization coverage
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - added `getLegacySliceTimeoutMs()` reading `VITE_KIRI_LEGACY_SLICE_TIMEOUT_MS`
  - passes normalized timeout into `runLegacyFdmSliceBridge(...)`

### Kiri legacy bridge idempotent completion test hardening (done in this batch)

Added regression coverage for buggy legacy double-callback behavior:

- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts`
  - new case where `fdmSliceImpl` calls `ondone(null)` and then `ondone(error)`
  - verifies bridge keeps first completion result and still restores worker scope

### Kiri legacy slice reentry guard (done in this batch)

Added runtime-level mutual exclusion for legacy slice execution to prevent concurrent reentry:

- `clip-apps/src/core/slicer/kiriRuntimeState.ts`
  - added `legacySliceRunning` flag in runtime state
  - added `runWithLegacySliceGuard(run)` helper with reject-on-busy + `finally` release
- `clip-apps/src/core/slicer/kiriRuntimeState.spec.ts`
  - added concurrent-run rejection and release-after-finish coverage
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - wrapped `runLegacyFdmSliceToPreview(...)` execution with `runWithLegacySliceGuard(...)`

### Kiri legacy slice failure-code observability (done in this batch)

Added structured failure-code classification for legacy slice fallback warnings:

- `clip-apps/src/core/slicer/kiriRuntimePolicy.ts`
  - added `resolveLegacySliceFailureCode(err)` returning:
    - `legacy_slice_reentry`
    - `legacy_slice_timeout`
    - `legacy_slice_failed`
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts`
  - added coverage for failure-code classification cases
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - legacy slice catch path now logs structured warning payload `{ code, message }`

### Kiri legacy failure-code -> fallback bridge (done in this batch)

Bridged legacy slice failure classification into `SliceResult.fallback` for UI/export visibility:

- `clip-apps/src/api/slice.ts`
  - extended `SliceFallbackReasonCode` with:
    - `legacy_slice_timeout`
    - `legacy_slice_reentry`
- `clip-apps/src/core/slicer/kiriRuntimePolicy.ts`
  - added `toSliceFallbackReasonCode(...)` mapper from legacy failure code to fallback reason code
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - when legacy slice fails, now sets `fallback = { reasonCode, message }` using mapped failure code
  - successful legacy slice path clears fallback to `null`
- `clip-apps/src/core/slicer/sliceFallbackUi.ts`
  - added labels for new fallback codes
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts`
  - added fallback-code mapping assertions
- `clip-apps/src/core/slicer/sliceFallbackUi.spec.ts`
  - added label assertions for `legacy_slice_timeout` / `legacy_slice_reentry`

### Kiri legacy skip-path fallback observability (done in this batch)

Extended fallback emission to legacy-not-executed paths (not only execution failures):

- `clip-apps/src/core/slicer/kiriRuntimePolicy.ts`
  - added `resolveLegacyPreviewSkipFallback(...)` for:
    - `legacy_disabled`
    - `runtime_init_error`
    - `runtime_not_ready`
    - `legacy_impl_missing`
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts`
  - added assertions for all skip-path fallback codes
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - computes legacy gate snapshot once and sets fallback from skip-path resolver when legacy preview is not attempted
  - keeps existing failure-path fallback bridge and structured warning logs

### Kiri fallback propagation consistency hardening (done in this batch)

Aligned fallback-code handling across worker fallback path and estimate export surfaces:

- `clip-apps/src/workers/slicer.worker.ts`
  - `resolveKiriFallbackReason(...)` now recognizes:
    - `legacy_slice_reentry` (message contains `already running`)
    - `legacy_slice_timeout` (message contains `timeout`)
- `clip-apps/src/core/slicer/estimateMetaExport.spec.ts`
  - added regression ensuring `legacy_slice_timeout` is preserved in:
    - compact summary
    - fingerprint
    - export payload fallback field

### Kiri worker fallback resolver core extraction (done in this batch)

Made worker fallback-code mapping directly unit-testable by extracting it into slicer core:

- `clip-apps/src/core/slicer/kiriFallbackReason.ts`
  - added `resolveKiriFallbackReason({ err, legacyFdmMode })`
  - preserves mapping for:
    - `legacy_disabled`
    - `runtime_init_error`
    - `runtime_not_ready`
    - `legacy_impl_missing`
    - `legacy_slice_reentry`
    - `legacy_slice_timeout`
    - `legacy_slice_failed`
- `clip-apps/src/core/slicer/kiriFallbackReason.spec.ts`
  - added direct mapping coverage for mode-driven and message-driven branches
- `clip-apps/src/workers/slicer.worker.ts`
  - replaced worker-inline fallback resolver with shared core helper call

### Kiri legacy bridge boundary-case test expansion (done in this batch)

Strengthened bridge regression coverage for callback/error/timeout edge behavior:

- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts`
  - added non-Error `ondone(...)` failure normalization assertion
  - added timeout lower-bound clamp assertion (`timeoutMs=1` -> timeout message reflects `50ms`)
  - both new tests also assert worker-scope restoration

### Kiri engine fallback tri-state decision extraction (done in this batch)

Extracted `sliceWithKiri` fallback state branching (skip / run / fail) into a dedicated decision helper:

- `clip-apps/src/core/slicer/kiriFallbackDecision.ts`
  - added `resolveLegacyFallbackBeforeRun(gate)`:
    - returns `{ shouldRunLegacy, fallback }` for pre-run skip/run decision
  - added `resolveLegacyFallbackFromError(err)`:
    - maps runtime error to structured `SliceResult.fallback`
- `clip-apps/src/core/slicer/kiriFallbackDecision.spec.ts`
  - added coverage for disabled skip-path, runnable gate, and error->fallback mapping
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - `sliceWithKiri` now delegates fallback tri-state branching to `kiriFallbackDecision` helpers

### Kiri runtime state extraction + unit tests (done in this batch)

Separated runtime mutable state storage from engine orchestration:

- `clip-apps/src/core/slicer/kiriRuntimeState.ts`
  - added centralized state holder for:
    - runtime readiness/init error/promise
    - legacy impl binding (`fdmSliceImpl`)
    - legacy fake profiles (`device/controller`)
  - added state helper APIs:
    - `getKiriRuntimeState()`
    - `bindLegacyImpl(...)`
    - `clearLegacyImplBindings()`
- `clip-apps/src/core/slicer/kiriRuntimeState.spec.ts`
  - added baseline state bind/clear behavior test
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - runtime init/debug/settings/slice-gate paths now read/write via `kiriRuntimeState` helper

### Kiri runtime loader extraction + unit tests (done in this batch)

Separated legacy import/load workflow from engine init orchestration:

- `clip-apps/src/core/slicer/kiriRuntimeLoader.ts`
  - added `loadLegacyFdmRuntime(...)`:
    - handles mode-aware legacy import attempts
    - manages strict/auto failure behavior
    - binds/clears runtime impl state through callbacks
- `clip-apps/src/core/slicer/kiriRuntimeLoader.spec.ts`
  - added tests for:
    - successful binding path
    - auto-mode failure clear path
    - strict-mode failure throw path
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - runtime init now delegates legacy load/import workflow to `loadLegacyFdmRuntime(...)`

### Kiri preview-based summary estimator (done in this batch)

Replaced fixed placeholder summary constants with preview-path-length-driven estimation:

- `clip-apps/src/core/slicer/previewEstimate.ts`
  - added `estimateSummaryFromPreview(...)`:
    - computes path lengths from preview layers (`perimeter/infill/support/travel`)
    - estimates runtime using print/travel feed rates and retract overhead
    - estimates filament using line-width/layer-height based pseudo-volume
- `clip-apps/src/core/slicer/previewEstimate.spec.ts`
  - added tests for non-zero estimate generation and length-scaling behavior
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - `sliceWithKiri(...)` summary now derives from resolved preview layers via estimator,
    replacing previous fixed `layers * constant` placeholder values

### Kiri non-legacy placeholder layer enrichment (done in this batch)

Improved non-legacy fallback preview fidelity from perimeter-only to simplified FDM-like paths:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - placeholder layer builder now accepts `process` and emits:
    - perimeter
    - infill (mode-aware linear/diagonal)
    - travel hints
    - support lines (when support is enabled)
  - keeps bounded infill segment generation for stability
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - updated tests to verify enriched placeholder layer output (including infill)
- `clip-apps/src/core/slicer/kiriEngine.ts`
  - now passes active `process` into preview pipeline resolver

### Kiri placeholder shell-aware infill clipping (done in this batch)

Improved placeholder infill realism by clipping fill region inside generated shell loops:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - placeholder builder now emits multiple perimeter loops based on `sliceShells`
  - infill generation now uses shell-inset inner bounds instead of full bbox
  - keeps existing travel/support generation and bounded infill segments
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - updated to verify multi-perimeter output and infill presence under shell-aware setup

### Kiri summary path-type weighted calibration (done in this batch)

Refined preview-based summary estimation with path-type-aware timing/filament weighting:

- `clip-apps/src/core/slicer/previewEstimate.ts`
  - time estimate now uses separate effective feeds for:
    - perimeter
    - infill
    - support
    - travel
  - includes retract overhead and `outputMinLayerTime` floor per layer
  - filament estimate now applies process multipliers:
    - `outputShellMult`
    - `outputFillMult`
    - `outputSparseMult` (support-weighted)
- `clip-apps/src/core/slicer/previewEstimate.spec.ts`
  - added tests for multiplier impact and min-layer-time floor behavior

### Kiri placeholder alternating infill pattern (done in this batch)

Improved non-legacy placeholder infill realism with layer-alternating direction:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - `linear` infill now alternates orientation by layer parity:
    - even layers: vertical lines
    - odd layers: horizontal lines
  - non-linear simplified infill now alternates diagonal sweep direction by layer parity
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - added unit test verifying linear infill orientation alternates across adjacent layers

### Kiri placeholder support pattern alternation (done in this batch)

Improved placeholder support-path variability to reduce layer-to-layer repetition artifacts:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - support lines now alternate orientation by layer parity:
    - even layers: horizontal support lines
    - odd layers: vertical support lines
  - support phase offset now shifts by layer index to avoid identical line placement each layer
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - added test verifying support orientation alternates across adjacent layers

### Kiri placeholder travel-link strategy (done in this batch)

Improved placeholder travel realism by connecting generated print/support segments:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - added intra-layer travel-link builder that connects:
    - previous path end -> next path start
    - across generated `infill/support` sequences
  - fallback fixed travel hints are now only used when no linkable paths exist
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - added test ensuring travel links are generated when infill paths are present

### Kiri summary inter-layer travel estimation (done in this batch)

Improved runtime estimate fidelity by accounting for cross-layer reposition travel:

- `clip-apps/src/core/slicer/previewEstimate.ts`
  - tracks per-layer first/last print path points
  - adds inter-layer travel distance (`prev layer end -> next layer start`) into travel/retract time budget
- `clip-apps/src/core/slicer/previewEstimate.spec.ts`
  - added test verifying far-apart layer starts increase estimated time versus near-adjacent starts

### Kiri retract estimation threshold refinement (done in this batch)

Refined retract-time estimation from fixed average threshold to mixed segment/distance trigger model:

- `clip-apps/src/core/slicer/previewEstimate.ts`
  - retract trigger distance now scales with process retract distance (`outputRetractDist`)
  - retract count now uses combined strategy:
    - segment-triggered count (per-travel/inter-layer segment threshold)
    - distance-triggered count (total travel budget)
  - final retract count is clamped by total segment count for stability

### Kiri summary estimate metadata exposure (done in this batch)

Added structured estimator diagnostics for UI observability and self-check workflows:

- `clip-apps/src/api/slice.ts`
  - `SliceResultSummary` now supports optional `estimateMeta` payload
- `clip-apps/src/core/slicer/previewEstimate.ts`
  - estimator now emits meta sections:
    - `lengths` (path-length breakdown)
    - `retract` (trigger/segment/count details)
    - `timeSec` (print/travel/retract/floor/final breakdown)
- `clip-apps/src/core/slicer/previewEstimate.spec.ts`
  - added assertion coverage for emitted estimate metadata fields

### FDM estimate-meta debug panel bridge (done in this batch)

Connected slicer estimate diagnostics to workspace UI for direct runtime inspection:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - right-side config pane now shows collapsible `切片估算明细（调试）` when `summary.estimateMeta` exists
  - displays:
    - path length breakdown (`perimeter/infill/support/travel`)
    - retract estimate details
    - time decomposition (`print/travel/retract/floor/final`)

### Kiri placeholder infill inner-bounds clipping (done in this batch)

Improved placeholder non-linear infill generation by clipping candidate segments to inner shell bounds:

- `clip-apps/src/core/slicer/previewPipeline.ts`
  - added line-segment-to-rect clipping (Liang-Barsky style)
  - diagonal infill candidates now sweep across the region and are clipped to inner shell rectangle
  - avoids overshooting inner perimeter bounds for `grid/triangle/hex`-like placeholder modes
- `clip-apps/src/core/slicer/previewPipeline.spec.ts`
  - added test asserting all generated non-linear infill endpoints stay within inner shell bounds

### FDM estimate-meta JSON copy action (done in this batch)

Improved debug panel usability for cross-run comparison by adding one-click JSON copy:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - added `复制 JSON` action in `切片估算明细（调试）` panel
  - copies structured payload to clipboard:
    - `backend`
    - `fallback`
    - `estimateMeta`
  - includes clipboard fallback path and success/error toast feedback
  - payload now also includes trace context for cross-batch analysis:
    - `timestamp`
    - `job` (`id/name`)
    - `current` (`device/process/material`)
  - added stable `fingerprint` string (config + summary + estimate key fields) for quick grouping/comparison

### FDM estimate-meta export payload core extraction (done in this batch)

Reduced UI coupling by moving estimate export/fingerprint composition into reusable slicer core helpers:

- `clip-apps/src/core/slicer/estimateMetaExport.ts`
  - added `buildEstimateMetaFingerprint(result, context)`
  - added `buildEstimateMetaExportPayload(result, context)` with trace context and stable payload shape
- `clip-apps/src/core/slicer/estimateMetaExport.spec.ts`
  - added tests for fingerprint formatting and payload composition
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - switched debug-panel copy action to use core helper instead of inline payload assembly

### FDM estimate-meta JSON file export action (done in this batch)

Added file-based export for batch offline comparison using the same payload schema as copy action:

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - debug panel now includes `导出 JSON` action (alongside `复制 JSON`)
  - export uses core `buildEstimateMetaExportPayload(...)` to keep schema consistency
  - filename includes fingerprint prefix + timestamp for easier grouping
- `clip-apps/src/core/utils/download.ts`
  - reused shared `downloadText(...)` utility for JSON artifact download

### FDM estimate-meta compact summary copy action (done in this batch)

Added one-line summary copy for quick chat/report sharing:

- `clip-apps/src/core/slicer/estimateMetaExport.ts`
  - added `buildEstimateMetaCompactSummary(result, context)` for stable single-line formatting
- `clip-apps/src/core/slicer/estimateMetaExport.spec.ts`
  - added unit test coverage for compact summary output format
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - debug panel now includes `复制简版摘要` action
  - action copies compact one-line summary via clipboard (with fallback path)

### FDM export/copy actions composable extraction (done in this batch)

Reduced workspace-level duplication by extracting shared copy/export behavior:

- `clip-apps/src/composables/useExportActions.ts`
  - added reusable actions:
    - `copyText(...)`
    - `copyJson(...)`
    - `exportJson(...)`
  - unified clipboard fallback and user feedback handling
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - switched estimate debug actions (`复制 JSON` / `导出 JSON` / `复制简版摘要`) to composable APIs
  - removed duplicated inline clipboard/download implementation details

### CAM export actions composable reuse (done in this batch)

Expanded cross-workspace reuse by applying shared export composable to CAM workspace flows:

- `clip-apps/src/composables/useExportActions.ts`
  - added `exportText(...)` to support text/gcode and pre-serialized JSON artifacts
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced direct `downloadText(...)` usage with composable APIs
  - unified exports:
    - session preview settings export
    - G-code export
    - CAM profile export
    - profile export with local ops
    - diff log export
    - session bundle export

### CAM import actions composable extraction (done in this batch)

Reduced repeated FileReader/JSON parse flows in CAM workspace by introducing reusable import helper:

- `clip-apps/src/composables/useFileImportActions.ts`
  - added `importJsonFromInput(...)` with:
    - file text reading
    - JSON parse + typed parser callback
    - input reset handling
    - unified read/parse error feedback
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - migrated import handlers to composable:
    - profile JSON import
    - session bundle preview import
    - session preview settings import

### Carvera import/export actions composable reuse (done in this batch)

Extended the same workspace action abstraction to Carvera file/log workflows:

- `clip-apps/src/composables/useFileImportActions.ts`
  - added `importTextFromInput(...)` for generic text-file imports with shared read/reset/error handling
- `clip-apps/src/apps/carvera/CarveraWorkspace.vue`
  - G-code import now uses `importTextFromInput(...)`
  - job/log exports now use `useExportActions().exportText(...)`
  - removed duplicated inline `FileReader` and blob-download implementation paths

### GridBot export actions composable reuse (done in this batch)

Aligned GridBot export behavior with shared workspace action utilities:

- `clip-apps/src/apps/gridbot/GridBotWorkspace.vue`
  - replaced direct `downloadText(...)` calls with `useExportActions().exportText(...)`
  - unified export paths:
    - selected job export
    - filtered logs TXT export
    - filtered logs JSON export

### Texturizer/Raster export actions composable reuse (done in this batch)

Extended shared export action usage to parameter/result export flows in remaining compute workspaces:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - replaced direct `downloadText(...)` with composable export APIs
  - unified exports:
    - recent-job JSON re-export
    - current run JSON export
    - STL export
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - replaced direct `downloadText(...)` with composable export APIs
  - unified exports:
    - recent-job JSON re-export
    - current run JSON export

### Raster tracing JSON parser core extraction (done in this batch)

Reduced duplicate tracing-path parsing branches by centralizing validation and parse logic:

- `clip-apps/src/core/raster/tracingPaths.ts`
  - added `parseTracingPathsJson(raw)` with structural validation:
    - root array check
    - per-item `points` array check
    - per-point `[x, y]` numeric shape check
- `clip-apps/src/core/raster/tracingPaths.spec.ts`
  - added tests for valid parsing, empty input, and invalid point-shape rejection
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - replaced inline `JSON.parse` branches with shared parser in:
    - run path (`onRun`)
    - compare/self-check path (`buildTracingPathsSafe`)

### Raster tracing parse error label mapping (done in this batch)

Improved tracing-input observability by introducing structured parse errors and centralized UI labels:

- `clip-apps/src/core/raster/tracingPaths.ts`
  - added `TracingPathsParseError` with typed codes:
    - `root_not_array`
    - `points_not_array`
    - `point_not_xy`
- `clip-apps/src/core/raster/tracingPathsUi.ts`
  - added `getTracingPathsParseErrorLabel(err)` for user-facing message mapping
- `clip-apps/src/core/raster/tracingPaths.spec.ts`
  - added assertion coverage for structured error code emission
- `clip-apps/src/core/raster/tracingPathsUi.spec.ts`
  - added unit tests for code->label mapping and generic fallback behavior
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - tracing parse failure toasts now use shared label mapper in run/compare/self-check flows

### Raster tracing sampling preprocessor extraction (done in this batch)

Advanced tracing-mode path processing by migrating sampling/cleanup logic into core algorithm helpers:

- `clip-apps/src/core/raster/tracingSampling.ts`
  - added `sanitizeTracingPathPoints(...)` to remove adjacent duplicate points
  - added `sampleTracingPolyline(...)` for step-based segment resampling with endpoint preservation
  - added `normalizeTracingPaths(...)` to drop degenerate paths (`<2` unique points)
- `clip-apps/src/core/raster/tracingSampling.spec.ts`
  - added tests for dedupe behavior, sampling segmentation, and degenerate-path filtering
- `clip-apps/src/workers/raster.worker.ts`
  - tracing branch now uses shared helpers:
    - pre-normalize incoming tracing paths
    - use core sampling algorithm before CPU/GPU depth sampling

### Raster tracing adaptive sampling refinement (done in this batch)

Improved tracing sampling fidelity/performance balance by making step size turn-aware:

- `clip-apps/src/core/raster/tracingSampling.ts`
  - `sampleTracingPolyline(...)` now adjusts per-segment step by local corner severity
  - behavior:
    - straighter segments use larger step (sparser points)
    - sharper turns use smaller step (denser points)
- `clip-apps/src/core/raster/tracingSampling.spec.ts`
  - added test coverage asserting sharper-corner polylines produce denser sampling than straight chains under same base step

### Raster tracing RDP simplification prepass (done in this batch)

Added polyline simplification in tracing pre-normalization to reduce redundant points before sampling/collision:

- `clip-apps/src/core/raster/tracingSampling.ts`
  - added `simplifyTracingPolylineRdp(points, epsilon)` (Douglas-Peucker)
  - integrated into `normalizeTracingPaths(...)` after duplicate-point cleanup
- `clip-apps/src/core/raster/tracingSampling.spec.ts`
  - added test ensuring near-collinear chains are simplified while preserving start/end points

### Raster tracing step-adaptive RDP epsilon (done in this batch)

Refined tracing simplification strength by binding RDP epsilon to runtime tracing step:

- `clip-apps/src/core/raster/tracingSampling.ts`
  - `normalizeTracingPaths(paths, baseStep)` now derives RDP epsilon from `baseStep`
  - keeps epsilon bounded to avoid over/under-simplification extremes
- `clip-apps/src/workers/raster.worker.ts`
  - tracing branch now passes `tracingStep` into normalization
- `clip-apps/src/core/raster/tracingSampling.spec.ts`
  - added test asserting larger base step leads to equal-or-stronger simplification while preserving endpoints

### Raster tracing point-budget guard + resampling fallback (done in this batch)

Hardened tracing runtime against extreme input density with bounded sampling budget:

- `clip-apps/src/core/raster/tracingSampling.ts`
  - added `countTracingPoints(...)`
  - added `trimSampledPolylineByStride(...)`
  - added `enforceTracingPointBudget(sampledPaths, maxPoints)` with endpoint preservation
- `clip-apps/src/core/raster/tracingSampling.spec.ts`
  - added budget test asserting:
    - point count is reduced below target budget
    - path endpoints remain stable
- `clip-apps/src/workers/raster.worker.ts`
  - added tracing sample hard cap (`MAX_TRACING_SAMPLE_POINTS`)
  - when over budget:
    - first increases effective tracing step (resampling fallback)
    - then applies stride-based budget enforcement as final guard

### Raster tracing budget telemetry bridge (done in this batch)

Added runtime observability for tracing-budget protection effectiveness:

- `clip-apps/src/types/raster.ts`
  - `RasterResultSummary` now supports optional `tracingBudget` payload:
    - `maxPoints`
    - `normalizedPoints`
    - `sampledPoints`
    - `finalPoints`
    - `fallbackScale`
    - `budgetApplied`
- `clip-apps/src/workers/raster.worker.ts`
  - emits `summary.tracingBudget` in tracing mode
  - records whether budget fallback/trim was applied
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - runtime summary line now displays tracing-budget telemetry for quick self-check visibility

### Raster self-check report tracing-budget telemetry (done in this batch)

Extended textual self-check outputs to include tracing-budget activation diagnostics:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - added `formatTracingBudget(summary)` helper for concise budget summary text
  - GPU/CPU compare report now includes per-engine tracing-budget status line
  - GPU cold/hot batch report now includes:
    - cold run budget applied/scale/final points
    - hot runs budget applied series + average
    - hot runs budget scale series + average
    - hot runs budget final-points series + average

### Raster export JSON tracing telemetry summary (done in this batch)

Extended offline analysis artifacts with normalized tracing-budget telemetry payload:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - added `buildTracingTelemetry(summary)` helper
  - both export paths now include `tracingTelemetry` field:
    - current result export (`onExportJson`)
    - recent-job re-export (`onReexportRecentJson`)
  - telemetry includes:
    - `budgetApplied`
    - `fallbackScale`
    - `pointCompressionRatio`
    - `budgetSignature`
    - points breakdown (`max/normalized/sampled/final`)

### Raster tracing budget signature in self-check report (done in this batch)

Added comparable budget signature lines to CPU/GPU self-check output for faster batch grouping:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - `buildTracingTelemetry(summary)` now emits `budgetSignature`
  - GPU/CPU compare text report now includes:
    - `CPU tracingSig=...`
    - `GPU tracingSig=...`

### Raster batch self-check signature stream + recent-list bridge (done in this batch)

Improved signature-driven triage across live runs and historical jobs:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - GPU cold/hot report now includes:
    - `cold tracingSig=...`
    - `hot tracingSig: [...]` sequence across all hot runs
  - recent job overview line now appends compact `sig=...` when tracing telemetry is present

### Raster batch assessment budget-limit marker (done in this batch)

Reduced false-positive performance regression interpretation by annotating budget-constrained runs:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - GPU cold/hot `assessment` line now appends `budget-limited run` section when tracing budget protection was triggered
  - includes quick diagnostics:
    - `cold` budget hit flag
    - `hotRate` (hot-run budget-hit ratio)
    - `hotScaleAvg` (average fallback scale)

### Raster export JSON analysis flags bridge (done in this batch)

Improved offline filtering by adding explicit analysis flags derived from tracing telemetry:

- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - added `buildAnalysisFlags(summary)` helper
  - both export paths now include top-level `analysisFlags`:
    - `budgetLimited`
    - `budgetApplied`
    - `fallbackScale`
    - `pointCompressionRatio`

### Texturizer decimation adaptive convergence search (done in this batch)

Improved clustered decimation target convergence by replacing fixed search loops with adaptive bounds/iterations:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added `resolveAdaptiveSearchConfig(triCount, ratio)` to derive:
    - expansion-limit for low/high cell bracketing
    - binary-search iteration count
  - cluster convergence now adapts search effort to mesh scale and decimation hardness
  - progress mapping updated to match adaptive binary iteration count
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - added large-mesh low-ratio test to verify stable target approximation after adaptive tuning

### Texturizer decimation adaptive early-stop refinement (done in this batch)

Reduced wasted convergence iterations by introducing stagnation-aware early-stop in clustered decimation search:

- `clip-apps/src/core/texturizer/decimation.ts`
  - `resolveAdaptiveSearchConfig(...)` now also yields `stagnationLimit`
  - binary convergence loop now stops early when:
    - target diff already near-optimal (`bestDiff <= 1`), or
    - no improvement for `stagnationLimit` consecutive rounds
  - preserves existing adaptive progress mapping and final fallback behavior
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - added progress-behavior test to ensure monotonic progress updates and terminal completion (`p=1`) under adaptive early-stop

### Texturizer decimation search-meta observability bridge (done in this batch)

Added algorithm-search telemetry from decimation core to runtime result metadata:

- `clip-apps/src/core/texturizer/decimation.ts`
  - introduced `DecimationSearchMeta`
  - `decimateTrianglesClusteredDetailed(...)` now emits search metadata:
    - `expansionLimit`
    - `binaryItersPlanned`
    - `binaryItersExecuted`
    - `stagnationLimit`
    - `earlyStopReason`
    - `finalDiff`
- `clip-apps/src/types/texturizer.ts`
  - `TexturizeResult.meta` now supports `decimationSearchMeta`
- `clip-apps/src/workers/texturizer.worker.ts`
  - bridges `decimationSearchMeta` into worker result meta payload
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - added coverage for search-meta presence and iteration/finalDiff sanity

### Texturizer decimation search-meta UI/debug bridge (done in this batch)

Exposed decimation search telemetry in workspace runtime/debug views for direct algorithm behavior inspection:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - run-meta panel now displays decimation search details:
    - executed/planned binary iterations
    - localized early-stop reason label
    - final diff
  - recent-jobs overview now includes compact search-meta line (`S=executed/planned + reason`)

### Texturizer decimation stagnation-retry refinement (done in this batch)

Added a lightweight self-correction pass when adaptive convergence stops due to stagnation:

- `clip-apps/src/core/texturizer/decimation.ts`
  - added `stagnation-retry` stop reason
  - when early stop reason is `stagnation` and target gap is still meaningful, performs bounded probe retries within current cell interval
  - retry loop updates best candidate/final diff and progress near tail stage
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - expanded early-stop reason assertions to include `stagnation-retry`
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - added localized label for `stagnation-retry` in debug display

### Texturizer decimation stagnation-retry gating (done in this batch)

Avoids unnecessary probe retries on small meshes or when the remaining target gap is already small in relative terms:

- `clip-apps/src/core/texturizer/decimation.ts`
  - `stagnation-retry` runs only when stagnation is paired with meaningful absolute miss **and** mesh-scale / relative-miss floors (see adaptive-thresholds batch below for the derived values)

### Texturizer decimation stagnation-retry adaptive thresholds (done in this batch)

Stagnation-retry gates are now derived alongside other adaptive search parameters:

- `clip-apps/src/core/texturizer/decimation.ts`
  - `resolveAdaptiveSearchConfig(...)` is exported and returns `stagnationRetryMinTri` / `stagnationRetryMinRelMiss`
  - larger meshes use a lower triangle-count floor (more likely to allow retry when search stagnates)
  - higher decimation ratios use a higher relative-miss floor (skip retry when the job is already “easy”)
- `clip-apps/src/core/texturizer/decimation.spec.ts`
  - asserts monotonic relationships for the new adaptive fields

### Texturizer subdivision excluded-face marking parity (done in this batch)

Ported legacy `stlTexturizer-main/js/subdivision.js` **mark-phase** behavior for user-excluded triangles:

- `clip-apps/src/core/texturizer/subdivision.ts`
  - optional `triExcluded` mask (per input triangle, `1` = excluded)
  - excluded triangles **do not** add their three edges to the global split-edge set (fewer splits in masked areas)
  - shared edges can still be marked by non-excluded neighbors; children inherit the parent exclusion flag across splits
  - exported `SubdivideTrianglesAdaptiveOptions`
- `clip-apps/src/workers/texturizer.worker.ts`
  - builds a pre-subdivision exclusion mask from `excludedFaces` + `exclusionMode` and passes it into `subdivideTrianglesAdaptive` (see mask-bridge batch for post-subdiv consumption in displacement)
- `clip-apps/src/core/texturizer/subdivision.spec.ts`
  - regression: all-excluded mesh stays unchanged vs more refinement without the mask

### Texturizer excluded-face mask bridge (subdivision → displacement) (done in this batch)

Fixed a correctness gap where `excludedFaces` indices were interpreted against the **post-subdivision** triangle list during displacement:

- `clip-apps/src/core/texturizer/subdivision.ts`
  - `subdivideTrianglesAdaptive` now always returns `triExcludedOut` aligned with the returned vertex buffer (including `levels === 0` passthrough)
  - exported `SubdivideTrianglesAdaptiveResult`
- `clip-apps/src/workers/texturizer.worker.ts`
  - shared `buildUserExcludedTriMask(...)` builds the initial mask on import triangle indices
  - after subdivision, displacement uses `subdiv.triExcludedOut` instead of re-indexing `excludedFaces` against `postSubdivTriCount`
  - defensive fallback if mask length ever mismatches (rebuild from request; rare)
- `clip-apps/src/core/texturizer/subdivision.spec.ts`
  - asserts `triExcludedOut.length === output triangle count` after subdivision

### Texturizer displacement texture-aspect parity (done in this batch)

Ported legacy non-square texture aspect correction used by displacement sampling:

- `clip-apps/src/core/texturizer/textureAspect.ts`
  - added `resolveTextureAspectCorrection(width, height)`:
    - square textures => `1 / 1`
    - shorter axis gets aspect > 1 (faster tiling on that axis)
- `clip-apps/src/workers/texturizer.worker.ts`
  - displacement `settings.textureAspectU/V` now derived from image dimensions instead of fixed `1`
- `clip-apps/src/core/texturizer/textureAspect.spec.ts`
  - coverage for square/wide/tall/invalid-dimension cases

### Texturizer displacement smooth-normal + sample-cache parity (done in this batch)

Migrated key displacement-core behavior from legacy `stlTexturizer-main/js/displacement.js`:

- `clip-apps/src/workers/texturizer.worker.ts`
  - builds area-weighted smooth normals per unique quantized position (`smoothNrmMap`) during face scan
  - normalizes the accumulated map and uses it for displacement direction / UV evaluation fallback
  - adds per-position grayscale sample cache (`dispCache`) so duplicated non-indexed vertices reuse the same texture sample
  - keeps existing angle-mask blending (`maskedFracMap`) and user-exclusion gating in place

### Texturizer cubic zone-area weighted displacement sampling (done in this batch)

Ported legacy cubic seam-stability strategy from `stlTexturizer-main/js/displacement.js`:

- `clip-apps/src/workers/texturizer.worker.ts`
  - during face scan (`mappingMode === MODE_CUBIC`), accumulates per-position zone areas (`zoneAreaMap`) using `getCubicBlendWeights(...)`
  - displacement sampling now prefers zone-area weighted YZ/XZ/XY projections for cubic mode
  - added worker-local `cubicUv(...)` transform helper mirroring legacy cubic UV transform (aspect/scale/offset/rotation + tiling wrap)
  - keeps previous `computeUV(...)` path as fallback when zone-area data is absent

### Texturizer exclusion seam sealing parity (done in this batch)

Ported legacy displacement seam-protection for excluded-face boundaries:

- `clip-apps/src/workers/texturizer.worker.ts`
  - tracks positions touched by excluded faces (`excludedPosSet`)
  - displacement pass now pins included-face vertices to zero displacement when they share a position with excluded faces
  - retains face-level zero-displacement for excluded faces
  - adds masked-boundary Z clamp parity:
    - with `bottomAngleLimit`, blocks negative-Z push on partially masked vertices
    - with `topAngleLimit`, blocks positive-Z push on partially masked vertices

### Texturizer symmetric displacement centering parity (done in this batch)

Aligned symmetric displacement amplitude semantics with legacy displacement core:

- `clip-apps/src/core/texturizer/displacementMath.ts`
  - added `toCenteredGray(grey01, symmetricDisplacement)` utility
- `clip-apps/src/workers/texturizer.worker.ts`
  - symmetric mode now uses `grey - 0.5` centering (legacy), replacing previous doubled range mapping
- `clip-apps/src/core/texturizer/displacementMath.spec.ts`
  - covers symmetric/non-symmetric value mapping behavior

### Texturizer cubic UV transform core extraction (done in this batch)

Extracted worker-inline cubic UV transform into reusable/tested core utility:

- `clip-apps/src/core/texturizer/cubicUv.ts`
  - added `resolveCubicUv(rawU, rawV, settings, rotRad)` for aspect/scale/offset/rotation/wrap transform
- `clip-apps/src/core/texturizer/cubicUv.spec.ts`
  - covers wrap-to-[0,1), aspect+scale behavior, and center-based rotation
- `clip-apps/src/workers/texturizer.worker.ts`
  - cubic zone-area sampling now calls shared `resolveCubicUv(...)` instead of local inline helper

### Texturizer displacement seam-rule core extraction (done in this batch)

Extracted seam/exclusion displacement gating from worker into a reusable, testable core module:

- `clip-apps/src/core/texturizer/displacementRules.ts`
  - added `resolveDisplacementRule(...)` for:
    - excluded/sealed vertex zero-displacement pinning
    - masked-fraction attenuation
    - masked-boundary Z-direction clamp (`bottomAngleLimit` / `topAngleLimit`)
- `clip-apps/src/core/texturizer/displacementRules.spec.ts`
  - verifies pinning, attenuation, and both clamp directions
- `clip-apps/src/workers/texturizer.worker.ts`
  - displacement loop now delegates gating/clamp logic to `resolveDisplacementRule(...)`

### Texturizer cubic zone sampling core extraction (done in this batch)

Extracted cubic zone-area sampling decisions into a dedicated core utility:

- `clip-apps/src/core/texturizer/cubicZoneSampling.ts`
  - added `buildCubicZoneWeightedSamples(...)`:
    - returns normalized weighted UV samples from zone-area contributions
    - encapsulates axis-specific U flips and cubic UV transform usage
- `clip-apps/src/core/texturizer/cubicZoneSampling.spec.ts`
  - covers empty/single-zone/multi-zone weighting behavior
- `clip-apps/src/workers/texturizer.worker.ts`
  - cubic displacement sampling branch now consumes `buildCubicZoneWeightedSamples(...)` and only performs gray sampling accumulation

### Texturizer masked-fraction core extraction (done in this batch)

Extracted angle-mask area accumulation and ratio resolution from worker displacement loop:

- `clip-apps/src/core/texturizer/maskedFraction.ts`
  - added `accumulateMaskedFraction(map, key, faceArea, angleMasked)`
  - added `resolveMaskedFraction(map, key)` with numeric-safety and `[0,1]` clamp
- `clip-apps/src/core/texturizer/maskedFraction.spec.ts`
  - covers accumulation behavior, invalid totals fallback, and ratio clamping
- `clip-apps/src/workers/texturizer.worker.ts`
  - replaced inline masked-area map math with shared helpers

### Texturizer displacement sample-cache core extraction (done in this batch)

Extracted reusable displacement sampling primitives from worker:

- `clip-apps/src/core/texturizer/displacementSampling.ts`
  - added `resolveCachedGray(cache, key, compute)` for per-position gray cache orchestration
  - added `accumulateWeightedGray(samples, sampleGray)` for weighted UV-sample accumulation
- `clip-apps/src/core/texturizer/displacementSampling.spec.ts`
  - verifies cache reuse and weighted accumulation behavior
- `clip-apps/src/workers/texturizer.worker.ts`
  - cubic zone-sample and fallback UV sampling now run through shared sampling primitives

### Texturizer displacement accumulators core extraction (done in this batch)

Extracted per-position accumulation patterns (smooth normals / zone areas) from worker face-scan loop:

- `clip-apps/src/core/texturizer/displacementAccumulators.ts`
  - added `accumulateVec3Weighted(...)`
  - added `accumulateTuple(...)`
  - added `normalizeVec3Map(...)`
- `clip-apps/src/core/texturizer/displacementAccumulators.spec.ts`
  - covers weighted accumulation, tuple accumulation, and normalization behavior
- `clip-apps/src/workers/texturizer.worker.ts`
  - face-scan accumulation now delegates to shared accumulator helpers for `smoothNrmMap` and `zoneAreaMap`

### Texturizer cubic zone-area contribution core extraction (done in this batch)

Extracted face-normal -> zone-area contribution math from worker face scan:

- `clip-apps/src/core/texturizer/cubicZoneArea.ts`
  - added `resolveCubicZoneAreaContribution(...)` using legacy `getCubicBlendWeights(...)`
  - returns `[czX, czY, czZ]` already scaled by face area
- `clip-apps/src/core/texturizer/cubicZoneArea.spec.ts`
  - covers non-cubic short-circuit, one-hot blend=0 behavior, and area-sum conservation
- `clip-apps/src/workers/texturizer.worker.ts`
  - replaced inline cubic zone contribution branch with shared helper call

### Texturizer displacement face-scan core extraction (done in this batch)

Moved the pre-displacement face scan (per-triangle aggregation pass) into a dedicated core module:

- `clip-apps/src/core/texturizer/displacementFaceScan.ts`
  - added `runDisplacementFaceScan(...)` returning:
    - `triUserExcluded`
    - `maskedFracMap`
    - `smoothNrmMap`
    - `zoneAreaMap`
    - `excludedPosSet`
  - encapsulates angle-mask evaluation, cubic zone-area accumulation, and smooth-normal accumulation
- `clip-apps/src/core/texturizer/displacementFaceScan.spec.ts`
  - covers exclusion propagation and cubic accumulation map emission
- `clip-apps/src/workers/texturizer.worker.ts`
  - replaces inline face-scan loop with a single call to `runDisplacementFaceScan(...)`

### Texturizer STL ASCII export chunked + UI progress (done in this batch)

Main-thread STL export now scales better and surfaces serialization progress:

- `clip-apps/src/core/texturizer/stlAsciiExport.ts`
  - async ASCII STL from non-indexed triangle positions (per-facet face normals)
  - chunked `Blob` parts with `requestAnimationFrame` yields between chunks
  - optional `onProgress` / `AbortSignal`
- `clip-apps/src/core/texturizer/stlAsciiExport.spec.ts`
  - ASCII shape sanity + monotonic progress across chunks
- `clip-apps/src/core/utils/download.ts`
  - added `downloadBlob` (used for STL blob download)
- `clip-apps/src/composables/useExportActions.ts`
  - added `exportBlob` helper with success toast
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - export path uses core STL builder + `exportBlob` instead of `STLExporter` string parse
  - dedicated STL export progress row (`stlExporting` / `stlExportProgress`)

### Texturizer worker finalize sub-progress (done in this batch)

- `clip-apps/src/workers/texturizer.worker.ts`
  - `finalize` stage now emits short-lived progress ticks before the terminal completion message

### Texturizer adaptive subdivision progress granularity (done in this batch)

Subdivision stage progress is now spread across edge-marking and triangle emission so large meshes report smoother worker progress:

- `clip-apps/src/core/texturizer/subdivision.ts`
  - per-level band maps into `[0.02, 0.98]` before terminal `1`
  - throttled callbacks during long scans (`~triCount/28` stride) to limit overhead
  - safety-cap exit reports aligned progress toward the end of the current level band
- `clip-apps/src/core/texturizer/subdivision.spec.ts`
  - monotonicity + terminal completion test on a grid mesh with two subdivision levels

### Raster tracing parse error label mapping (done in this batch)

Improved tracing-input observability by introducing structured parse errors and centralized UI labels:

- `clip-apps/src/core/raster/tracingPaths.ts`
  - added `TracingPathsParseError` with typed codes:
    - `root_not_array`
    - `points_not_array`
    - `point_not_xy`
- `clip-apps/src/core/raster/tracingPathsUi.ts`
  - added `getTracingPathsParseErrorLabel(err)` for user-facing message mapping
- `clip-apps/src/core/raster/tracingPaths.spec.ts`
  - added assertion coverage for structured error code emission
- `clip-apps/src/core/raster/tracingPathsUi.spec.ts`
  - added unit tests for code->label mapping and generic fallback behavior
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - tracing parse failure toasts now use shared label mapper in run/compare/self-check flows

### Texturizer excluded-faces parser core extraction (done in this batch)

Centralized `Excluded Faces` input parsing/validation to remove page-level duplication:

- `clip-apps/src/core/texturizer/excludedFaces.ts`
  - added `parseExcludedFacesJson(text)`:
    - empty-text => `[]`
    - array-shape validation
    - numeric conversion + floor
    - non-negative filtering + deduplication
- `clip-apps/src/core/texturizer/excludedFaces.spec.ts`
  - added tests for empty input, normalization behavior, and invalid root-shape rejection
- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - replaced local parser implementation with shared core parser in `getExcludedFacesOrNotify()`

### Texturizer/Raster export actions composable reuse (done in this batch)

Extended shared export action usage to parameter/result export flows in remaining compute workspaces:

- `clip-apps/src/apps/texturizer/TexturizerWorkspace.vue`
  - replaced direct `downloadText(...)` with composable export APIs
  - unified exports:
    - recent-job JSON re-export
    - current run JSON export
    - STL export
- `clip-apps/src/apps/raster/RasterWorkspace.vue`
  - replaced direct `downloadText(...)` with composable export APIs
  - unified exports:
    - recent-job JSON re-export
    - current run JSON export

### CAM copy guard alignment for session comparison bundle (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `CAM_COPY_EMPTY.comparisonBundle` for no-session import state.
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `copySessionLegacyComparisonBundle()` now checks `sessionBundlePreview` before copy and reports the shared empty message when no bundle has been imported yet.
  - keeps comparison bundle copy behavior unchanged once target session data exists.

### FDM estimate export feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `FDM_EXPORT_EMPTY.estimateMetaJson` and `FDM_EXPORT_SUCCESS.estimateMetaJson` to centralize export feedback text.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - `exportEstimateMetaJson()` now uses shared export feedback constants for both empty-state checks and successful export notification.

### CAM export feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `CAM_EXPORT_SUCCESS` (`previewSettings`, `gcode`, `profileJson`, `profileJsonWithLocalOps`, `diffActionLog`, `sessionBundle`) and `CAM_EXPORT_EMPTY` (`profileWithLocalOps`, `sessionBundle`).
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced hardcoded CAM export success messages in `exportText`/`exportJson` calls with `CAM_EXPORT_SUCCESS` constants.
  - replaced empty-state warnings in `onExportProfileWithLocalOps()` and `onExportCamSessionBundle()` with `CAM_EXPORT_EMPTY` constants.

### FDM core action feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - expanded FDM feedback constants with:
    - `FDM_EXPORT_SUCCESS.gcode`
    - `FDM_EXPORT_EMPTY.gcodeRequiresSlice`
    - `FDM_ACTION_SUCCESS` (`sliceSavedJob`, `sendToCarvera`, `sendToGridBot`)
    - `FDM_ACTION_WARNING` (`noSliceableModels`, `noSliceableGeometry`)
    - `FDM_ACTION_ERROR.sliceFailedPrefix`
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced hardcoded messages in slice/export/send main flow:
    - `onSliceClick()` warnings/success/error prefix
    - `onExportGcodeClick()` precondition + success message
    - `onSendToCarveraClick()` / `onSendToGridBotClick()` success message

### FDM preview + Kiri PoC feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `FDM_ACTION_INFO` (`sliceRequired`, `previewPlaceholder`, `kiriPocBuiltinCube`).
  - expanded constants with `FDM_ACTION_SUCCESS.kiriPocPrefix` and `FDM_ACTION_ERROR.kiriPocFailedPrefix`.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced hardcoded info text in `onPreviewClick()` with `FDM_ACTION_INFO`.
  - replaced Kiri PoC info/success/error messages with shared FDM action constants while keeping dynamic layer count and error details.

### CAM session import/apply feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `CAM_ACTION_SUCCESS`, `CAM_ACTION_WARNING`, `CAM_ACTION_ERROR` for session preview/import/apply flow:
    - import profile JSON / preview settings success
    - session bundle preview loaded/verified states
    - session bundle warning prefixes and apply guard warnings
    - SHA256 mismatch error text
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced hardcoded messages in:
    - `onImportProfileFile()`
    - `onImportSessionBundlePreview()` (verify_ok / mismatch / cannot_verify + legacy hint mismatch prefix)
    - `onImportSessionPreviewSettings()`
    - `applySessionBundleField()` (precondition, missing field, incompatible apply, apply success prefix)

### CAM runtime/save/history feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - expanded `CAM_ACTION_SUCCESS` / `CAM_ACTION_WARNING` / `CAM_ACTION_ERROR` for high-frequency CAM operation flow:
    - sample/clone/reset/import STL
    - run CAM + save to Carvera/GridBot
    - load/clear run history
    - compare/apply diff, undo/redo, save snapshot as profile
    - export failure prefix
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced corresponding hardcoded `ElMessage` text in:
    - `resetSessionPreviewLimit()`, `onLoadSample()`, `onCloneFromCurrent()`, `onResetProfile()`, `onCamPartFileChange()`
    - `onSimulateCamJob()`, `onSaveToCarvera()`, `onSaveToGridBot()`
    - `onLoadRecentRun()`, `onClearRecentRuns()`, `onCompareRecentRun()`, `onApplyDiffItem()`
    - `onUndoApply()`, `onRedoApply()`, `onSaveRecentRunAsProfile()`, `onExportCamSessionBundle()` catch branch

### FDM job/restore feedback constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - expanded FDM action constants for job interaction flow:
    - `FDM_ACTION_INFO.selectedJobPrefix`
    - `FDM_ACTION_WARNING.noModelInfoToSave`
    - `FDM_ACTION_WARNING.modelNeedsReimportFromJob`
    - `FDM_ACTION_SUCCESS.updatedCurrentJob`
    - `FDM_ACTION_SUCCESS.restoredModelListFromJobPrefix`
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced hardcoded messages in:
    - `onJobRowClick()`
    - `onUpdateJobClick()`
    - `loadModelById()` (`.stl/.obj/.3mf` missing file restore warnings)
    - route `jobId` restore branch message after reconstructing model placeholders

### CAM import + dialog text constant unification (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added `CAM_IMPORT_MESSAGE` for `importJsonFromInput` invalid/read-failed messages.
  - added `CAM_DIALOG_MESSAGE` for `ElMessageBox.prompt/confirm` titles, prompts, and confirm/cancel button text.
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced hardcoded import messages in:
    - `onImportProfileFile()`
    - `onImportSessionBundlePreview()`
    - `onImportSessionPreviewSettings()`
  - replaced hardcoded dialog strings in:
    - `onCloneFromCurrent()`
    - `applySessionBundleField()` confirm dialog
    - `onSaveRecentRunAsProfile()`

### CAM/FDM message tail cleanup (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added shared `UNKNOWN_ERROR_MESSAGE`.
  - added `FDM_ACTION_SUCCESS.kiriPocSuffix` to avoid inline success-tail literals in PoC path.
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced inline fallback `'未知错误'` in CAM export catch branch with `UNKNOWN_ERROR_MESSAGE`.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced inline `'未知错误'` in slice/Kiri PoC catch branches with `UNKNOWN_ERROR_MESSAGE`.
  - replaced inline Kiri PoC success suffix with `FDM_ACTION_SUCCESS.kiriPocSuffix`.

### FDM exported G-code placeholder comment cleanup (done in this batch)

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced inline `TODO` comment in `onExportGcodeClick()` output with a stable migration-bridge marker:
    - `; placeholderPath=1 (migration bridge output; real toolpaths pending legacy parity)`
  - keeps behavior unchanged while making exported artifacts more explicit and review-friendly for migration parity tracking.

### CAM/FDM legacy comparison bundle determinism hardening (done in this batch)

- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts` (+ spec)
  - added normalized helpers for flag/text serialization.
  - kept `formatCamSessionLegacyTargetHint()` existing copy behavior intact (still nullable for target-only copy).
  - made `buildCamLegacyHintComparisonBundleText()` emit stable target/current keys even when hints/import error are absent:
    - `targetLegacy.ready/hasSlice/hasExport` use `?` placeholders
    - `targetLegacy.importError` and `currentLegacy.importError` use `<none>` when empty
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` (+ spec)
  - extended `formatLegacyFdmDebugText()` with optional `includeEmptyFields` mode.
  - comparison bundle now uses deterministic field output for both target/current when snapshots are missing:
    - `ready/hasSlice` -> `?`
    - `initError/importError` -> `<none>`
  - preserves existing non-bundle summary behavior for copy actions (no forced empty fields unless requested).

### CAM/FDM comparison bundle metadata header unification (done in this batch)

- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts` (+ spec)
  - added `CAM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION = 1`.
  - `buildCamLegacyHintComparisonBundleText()` now prepends a stable `comparisonMeta` section:
    - `schemaVersion`
    - `bundleKind=camLegacyComparison`
    - `generatedAt` (ISO; supports injected `generatedAtIso` for deterministic tests/replay).
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` (+ spec)
  - added `FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION = 1`.
  - `buildFdmLegacyComparisonBundleText()` now prepends aligned `comparisonMeta` section:
    - `schemaVersion`
    - `bundleKind=fdmLegacyComparison`
    - `generatedAt` (ISO; supports injected `generatedAtIso`).
- Tests updated to assert metadata header presence and schema constants, ensuring bundle text remains contract-stable for automation.

### CAM/FDM comparison bundle sourceFingerprint support (done in this batch)

- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts` (+ spec)
  - extended `CamSessionBundleLegacyEngineHints` with optional `targetGcodeSha256`.
  - CAM comparison bundle metadata now includes:
    - `sourceFingerprint=<targetGcodeSha256 | <none>>`
  - this reuses existing migration fingerprint without extra hashing cost.
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` (+ spec)
  - FDM comparison bundle metadata now includes `sourceFingerprint`.
  - default fingerprint is auto-derived as deterministic `fnv1a32` hash over:
    - `telemetryDigest`
    - `jobSliceInputMeta`
    - `jobLegacyDebug`
  - supports `sourceFingerprint` override for deterministic replay/testing pipelines.
- tests updated to assert `sourceFingerprint` generation/override behavior and keep metadata contract stable.

### CAM/FDM sourceFingerprint surfaced in workspace diagnostics (done in this batch)

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `sourceFingerprint` display row in session-bundle preview diagnostics (derived from target bundle hints).
  - added `copySessionBundleSourceFingerprint()` and "复制 sourceFingerprint" action.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - added job-scoped `comparisonSourceFingerprint` display in diagnostics panel.
  - added `copyLegacyFdmSourceFingerprint()` copy action.
- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts` (+ spec)
  - exported `resolveCamLegacyComparisonSourceFingerprint()` helper for shared UI/bundle usage.
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` (+ spec)
  - exported `resolveFdmLegacyComparisonSourceFingerprint()` helper (deterministic `fnv1a32` over job telemetry context).
- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added CAM/FDM copy success/empty messages for `sourceFingerprint` actions.

### CAM/FDM comparison bundle sourceLabel support (done in this batch)

- `clip-apps/src/core/cam/sessionBundleLegacyHintCompare.ts` (+ spec)
  - `buildCamLegacyHintComparisonBundleText()` now accepts `sourceLabel` and emits
    `comparisonMeta.sourceLabel` (`<none>` fallback).
- `clip-apps/src/core/slicer/legacyFdmCompareText.ts` (+ spec)
  - `buildFdmLegacyComparisonBundleText()` now accepts `sourceLabel` and emits
    `comparisonMeta.sourceLabel` (`<none>` fallback).
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - derives session-bundle source label from `targetRun.id/name` and passes it to CAM comparison bundle builder.
  - displays `sourceLabel` in session bundle diagnostics panel.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - derives job source label from `selectedJobId/name` and passes it to FDM comparison bundle builder.
  - displays `comparisonSourceLabel` in FDM diagnostics panel.
- tests expanded to assert sourceLabel metadata behavior (explicit + fallback), keeping CAM/FDM bundle contract stable for automation.

### CAM/FDM diagnostic copy metadata trace enrichment (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.ts`
  - added CAM/FDM copy messages for `sourceLabel` actions (`success` + `empty`).
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added `copySessionBundleSourceLabel()` and "复制 sourceLabel" action in session-bundle diagnostics.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - added `copyLegacyFdmSourceLabel()` and "复制" action for `comparisonSourceLabel`.
  - enriched copied diagnostics with trace header lines:
    - `copyJobTelemetryDigest()`: now includes `sourceLabel` + `sourceFingerprint` in digest header
    - `copyJobDiagnosticsSnapshot()`: now prefixes snapshot text with `jobId/sourceLabel/sourceFingerprint`
    - `copyCurrentTimelineDiagnostics()`: now includes `sourceLabel/sourceFingerprint` in context lines
  - keeps original diagnostic payload content unchanged after trace header enrichment.

### FDM export trace header parity with diagnostics copy (done in this batch)

- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - added shared `buildFdmTraceHeaderLines()` and reused it across diagnostics copy/export paths.
  - `onExportGcodeClick()` now prepends trace comments:
    - `; jobId=...`
    - `; sourceLabel=...`
    - `; sourceFingerprint=...`
  - `copyJobTelemetryDigest()` / `copyJobDiagnosticsSnapshot()` / `copyCurrentTimelineDiagnostics()` now use the same shared trace header source to avoid drift.
  - `copyEstimateMetaJson()` and `exportEstimateMetaJson()` now pass `sourceLabel/sourceFingerprint` into estimate export payload context.
- `clip-apps/src/core/slicer/estimateMetaExport.ts` (+ spec)
  - extended `EstimateMetaExportContext` with `sourceLabel/sourceFingerprint`.
  - export payload now includes `trace` block:
    - `trace.sourceLabel`
    - `trace.sourceFingerprint`
  - defaults remain `<none>` when trace context is absent.

### CAM export trace header parity with diagnostics copy (done in this batch)

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - added shared `buildCamTraceHeaderLines()` and unified CAM export trace metadata source:
    - `sourceLabel` (prefers selected diff target run; falls back to `current:<processName>`)
    - `sourceFingerprint` (prefers imported session bundle fingerprint; falls back to `cam.gcodeLength:<len>`)
  - `onDownloadGcode()` now prepends trace comment lines to exported G-code text.
  - `onSaveToCarvera()` / `onSaveToGridBot()` now prepend the same trace comment lines to saved bridge jobs.
  - `onExportDiffLogs()` now passes trace metadata into diff-log export artifact.
- `clip-apps/src/core/cam/sessionDiffLog.ts` (+ spec)
  - `createDiffLogExportArtifact()` now accepts optional trace input and embeds:
    - `trace.sourceLabel`
    - `trace.sourceFingerprint`
  - defaults remain `<none>` for backward compatibility when trace is omitted.

This keeps CAM text exports aligned with the FDM diagnostics/export trace strategy for migration auditability.

### CAM session bundle export trace block alignment (done in this batch)

- `clip-apps/src/core/cam/sessionBundleExport.ts` (+ spec)
  - extended `SessionBundleExportInput` with:
    - `traceSourceLabel?: string | null`
    - `traceSourceFingerprint?: string | null`
  - exported session bundle payload now includes top-level:
    - `trace.sourceLabel`
    - `trace.sourceFingerprint`
  - defaults to `<none>` when trace context is not provided, preserving backward compatibility.
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `onExportCamSessionBundle()` now passes `traceSourceLabel/traceSourceFingerprint` from unified CAM trace state.
- tests updated to assert trace block serialization in session bundle artifact.

### CAM/FDM shared trace key constants unification (done in this batch)

- `clip-apps/src/core/traceKeys.ts` (new)
  - added shared trace constants:
    - `TRACE_SOURCE_LABEL_KEY`
    - `TRACE_SOURCE_FINGERPRINT_KEY`
    - `TRACE_NONE_VALUE`
  - added `formatTraceLine(key, value)` helper for stable `key=value` emission.
- migrated CAM/FDM trace emitters and trace payload writers to shared keys/constants:
  - `src/apps/cam/CamWorkspace.vue`
  - `src/views/fdm/FdmWorkspaceView.vue`
  - `src/core/cam/sessionBundleLegacyHintCompare.ts`
  - `src/core/slicer/legacyFdmCompareText.ts`
  - `src/core/cam/sessionBundleExport.ts`
  - `src/core/cam/sessionDiffLog.ts`
  - `src/core/slicer/estimateMetaExport.ts`
- result: trace field naming now has a single source of truth across comparison bundles, diagnostics text copy, and export payload JSON.

### CAM/FDM trace schema versioning (done in this batch)

- `clip-apps/src/core/traceKeys.ts`
  - added `TRACE_SCHEMA_VERSION = 1` and `TRACE_SCHEMA_VERSION_KEY = 'traceSchemaVersion'`.
- trace JSON payload writers now embed schema version:
  - `src/core/cam/sessionBundleExport.ts` (`trace.traceSchemaVersion`)
  - `src/core/cam/sessionDiffLog.ts` (`trace.traceSchemaVersion`)
  - `src/core/slicer/estimateMetaExport.ts` (`trace.traceSchemaVersion`)
- trace text headers now include schema version line for parity with JSON:
  - `src/apps/cam/CamWorkspace.vue` (`buildCamTraceHeaderLines()`)
  - `src/views/fdm/FdmWorkspaceView.vue` (`buildFdmTraceHeaderLines()`)
  - comparison bundle generators:
    - `src/core/cam/sessionBundleLegacyHintCompare.ts`
    - `src/core/slicer/legacyFdmCompareText.ts`
- specs updated to assert `traceSchemaVersion` in both JSON and text trace outputs:
  - `sessionBundleExport.spec.ts`
  - `sessionDiffLog.spec.ts`
  - `estimateMetaExport.spec.ts`
  - `sessionBundleLegacyHintCompare.spec.ts`
  - `legacyFdmCompareText.spec.ts`

### CAM/FDM UI trace schema visibility (done in this batch)

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - session-bundle diagnostics panel now displays `traceSchemaVersion` alongside source trace info.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - FDM diagnostics `el-descriptions` now includes `traceSchemaVersion` row when a job is selected.
- keeps UI trace metadata aligned with exported text/json trace schema for manual audit workflows.

### Trace header order hardening via shared builder (done in this batch)

- `clip-apps/src/core/traceKeys.ts`
  - added `buildTraceHeaderLines(sourceLabel, sourceFingerprint)` to centralize ordered trace header generation.
  - canonical order is now fixed as:
    1. `traceSchemaVersion`
    2. `sourceLabel`
    3. `sourceFingerprint`
- migrated call sites to the shared builder:
  - `src/apps/cam/CamWorkspace.vue`
  - `src/views/fdm/FdmWorkspaceView.vue`
  - `src/core/cam/sessionBundleLegacyHintCompare.ts`
  - `src/core/slicer/legacyFdmCompareText.ts`
- added `src/core/traceKeys.spec.ts` asserting exact header order/value contract to prevent future drift.

### Export trace comment smoke alignment (done in this batch)

- `clip-apps/src/core/traceKeys.ts`
  - added `buildTraceCommentLines(sourceLabel, sourceFingerprint, commentPrefix='; ')` for gcode/comment export paths.
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - `onDownloadGcode()` now uses shared trace comment builder directly.
  - `onSaveToCarvera()` / `onSaveToGridBot()` now prepend shared trace comment lines (same ordered contract as diagnostics text headers).
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - `onExportGcodeClick()` now prepends shared trace comment lines from core helper.
- `clip-apps/src/core/traceKeys.spec.ts`
  - added smoke assertion for comment-form trace headers (`; traceSchemaVersion=...`, `; sourceLabel=...`, `; sourceFingerprint=...`) to lock format for downstream tooling.

### Trace contract documentation baseline (done in this batch)

- `clip-apps/TRACE_CONTRACT.md` (new)
  - documented the canonical CAM/FDM trace contract:
    - required keys (`traceSchemaVersion`, `sourceLabel`, `sourceFingerprint`)
    - fixed header order
    - `<none>` placeholder semantics
    - JSON vs text emission requirements
    - source derivation rules and backward-compatibility guidance
  - listed current writer paths and verification specs as implementation anchors.

### Trace contract minimal examples (done in this batch)

- `clip-apps/TRACE_CONTRACT.md`
  - added copy-ready minimal examples for:
    - CAM comparison bundle text (`comparisonMeta` + target block)
    - FDM comparison bundle text (`comparisonMeta`)
    - session bundle JSON trace block
    - estimate-meta export JSON trace block
  - examples pin key order and schema version in a fixture-friendly format for manual audit and automation seed data.

### Comparison bundle trace order assertions (done in this batch)

- strengthened bundle tests to assert trace field order, not just presence:
  - `src/core/cam/sessionBundleLegacyHintCompare.spec.ts`
  - `src/core/slicer/legacyFdmCompareText.spec.ts`
- enforced ordering contract in both CAM/FDM comparison text:
  1. `traceSchemaVersion`
  2. `sourceLabel`
  3. `sourceFingerprint`
- this closes the last known drift gap for text-based trace metadata consumed by downstream tooling.

### Trace fixtures for docs/test parity (done in this batch)

- `clip-apps/src/core/traceFixtures.ts` (new)
  - introduced shared trace fixture constants:
    - `TRACE_FIXTURE_SOURCE_LABEL`
    - `TRACE_FIXTURE_SOURCE_FINGERPRINT`
    - header/comment expected lines derived from canonical keys
- updated contract tests to consume shared fixtures instead of duplicated string literals:
  - `src/core/traceKeys.spec.ts`
  - `src/core/cam/sessionBundleLegacyHintCompare.spec.ts`
  - `src/core/slicer/legacyFdmCompareText.spec.ts`
- `clip-apps/TRACE_CONTRACT.md`
  - now references fixture source file as trace example anchor, reducing doc/test drift.

### JSON trace contract tests migrated to shared fixtures (done in this batch)

- updated JSON trace contract specs to reuse `src/core/traceFixtures.ts` instead of duplicated literals:
  - `src/core/cam/sessionBundleExport.spec.ts`
  - `src/core/cam/sessionDiffLog.spec.ts`
  - `src/core/slicer/estimateMetaExport.spec.ts`
- result: text trace and JSON trace tests now share the same sourceLabel/sourceFingerprint fixture baseline.
- this further reduces maintenance drift between:
  - trace helper tests
  - comparison bundle tests
  - export payload tests
  - contract documentation examples.

### TRACE_CONTRACT fixture constant cross-reference tightening (done in this batch)

- `clip-apps/TRACE_CONTRACT.md`
  - explicitly references fixture constant names from `src/core/traceFixtures.ts`:
    - `TRACE_FIXTURE_SOURCE_LABEL`
    - `TRACE_FIXTURE_SOURCE_FINGERPRINT`
    - `TRACE_FIXTURE_HEADER_LINES`
    - `TRACE_FIXTURE_COMMENT_LINES`
  - normalized minimal text/json examples to the shared fixture values so documentation mirrors test baselines directly.

### CAM session bundle trace resolution unification (done in this batch)

- `clip-apps/src/core/cam/sessionBundleTraceResolve.ts` (new, + spec)
  - introduced `resolveCamSessionBundleTrace()` to normalize source trace extraction for imported session bundles.
  - priority order:
    1. explicit `payload.trace.sourceLabel/sourceFingerprint`
    2. fallback `targetRun.id/name` and `migrationMeta.engineHints.targetGcodeSha256`
    3. `<none>` placeholders
- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - session bundle diagnostics now use shared resolver output for both `sourceLabel` and `sourceFingerprint`.
  - removed duplicate ad-hoc fallback logic from component-level computed fields.
- `clip-apps/src/core/cam/sessionBundleTraceResolve.spec.ts`
  - covers explicit trace, fallback trace, and no-hint placeholder cases.

### FDM trace resolution unification (done in this batch)

- `clip-apps/src/core/slicer/fdmTraceResolve.ts` (new, + spec)
  - introduced `resolveFdmSourceLabel()` and `resolveFdmTrace()` to centralize FDM trace metadata derivation.
  - label rules now mirror CAM resolver style:
    1. `selectedJobId:selectedJobName` when both exist
    2. `selectedJobId` when name is empty
    3. `<none>` when no selected job id
  - fingerprint derivation remains delegated to `resolveFdmLegacyComparisonSourceFingerprint(...)` for deterministic FNV-1a output.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - replaced page-level ad-hoc sourceLabel/sourceFingerprint computed logic with shared `resolveFdmTrace()` output.
  - `buildFdmTraceHeaderLines()` and all downstream copy/export paths now consume the unified resolver.
- `clip-apps/src/core/slicer/fdmTraceResolve.spec.ts`
  - validates label fallback behavior and deterministic fingerprint shape in resolver output.
- verification
  - `npx vitest run src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts`
  - all tests passed.

### FDM trace header builder extraction (done in this batch)

- `clip-apps/src/core/slicer/fdmTraceResolve.ts` (+ spec)
  - added `buildFdmTraceHeaderLines()` to centralize FDM text-header emission:
    1. `traceSchemaVersion`
    2. `sourceLabel`
    3. `sourceFingerprint`
    4. `jobId`
  - placeholder policy is now unified in core helper:
    - `sourceLabel/sourceFingerprint -> <none>` when absent
    - `jobId -> unknown` when no selected job
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - removed page-local `buildFdmTraceHeaderLines` implementation and switched copy/export paths to shared core helper.
  - this further reduces view-layer formatting logic and keeps trace/header contract testable in `core/slicer`.
- `clip-apps/src/core/slicer/fdmTraceResolve.spec.ts`
  - added assertions for header order and placeholder fallback behavior.
- verification
  - `npx vitest run src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts`
  - all tests passed (`10 passed`).

### FDM export context builder extraction (done in this batch)

- `clip-apps/src/core/slicer/fdmTraceResolve.ts` (+ spec)
  - added `buildFdmTraceExportContext()` to normalize shared FDM export trace context (`jobId/jobName/sourceLabel/sourceFingerprint`).
  - added `buildFdmEstimateMetaExportContext()` to map normalized trace context into `EstimateMetaExportContext`.
  - this keeps trace + job identity assembly in `core/slicer` instead of page-level object wiring.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - estimate meta JSON copy/export paths now use `buildFdmEstimateMetaExportContext(...)` with `selectedJobTraceExportContext`.
  - removed duplicated in-view context object construction for `sourceLabel/sourceFingerprint` and job identity fields.
- `clip-apps/src/core/slicer/fdmTraceResolve.spec.ts`
  - added coverage for export context normalization and estimate export context mapping.
- verification
  - `npx vitest run src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/estimateMetaExport.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts`
  - all tests passed (`16 passed`).

### FDM comparison trace context unification (done in this batch)

- `clip-apps/src/core/slicer/fdmTraceResolve.ts` (+ spec)
  - added `buildFdmLegacyComparisonTrace()` to derive comparison bundle trace input from shared `FdmTraceExportContext`.
  - this centralizes sourceLabel/sourceFingerprint fallback policy (`<none>`) for comparison text emission as well.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue`
  - `copyLegacyFdmComparisonBundle()` now consumes shared helper output:
    - replaces page-level direct `sourceLabel` wiring
    - passes both `sourceLabel` and `sourceFingerprint` via core context path
  - result: comparison/copy path now follows the same trace-context assembly chain as estimate export/copy.
- `clip-apps/src/core/slicer/fdmTraceResolve.spec.ts`
  - added coverage for `buildFdmLegacyComparisonTrace()` normal and placeholder branches.
- verification
  - `npx vitest run src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts src/core/slicer/estimateMetaExport.spec.ts`
  - all tests passed (`18 passed`).

### FDM fingerprint canonicalization hardening (algorithm priority, done in this batch)

- `clip-apps/src/core/slicer/legacyFdmCompareText.ts`
  - upgraded `resolveFdmLegacyComparisonSourceFingerprint()` input serialization from plain `JSON.stringify(...)` to stable canonical JSON:
    - recursive object-key sorting
    - array order preserved
    - null/primitive handling normalized
  - keeps the same FNV-1a hash algorithm and output format (`fnv1a32:<8hex>`), but eliminates false fingerprint drift caused by key insertion order differences.
- `clip-apps/src/core/slicer/legacyFdmCompareText.spec.ts`
  - added regression test asserting identical fingerprint for semantically identical telemetry/meta/debug objects with different key orders.
- verification
  - `npx vitest run src/core/slicer/legacyFdmCompareText.spec.ts src/core/slicer/fdmTraceResolve.spec.ts src/core/slicer/estimateMetaExport.spec.ts`
  - all tests passed (`19 passed`).

### CAM/FDM stable JSON comparison base extraction (algorithm priority, done in this batch)

- `clip-apps/src/core/stableJson.ts` (new)
  - introduced shared stable JSON utilities:
    - `toStableJsonValue()`
    - `toStableJsonText()`
    - `stableJsonEqual()`
  - canonicalization rule: recursive key sorting for objects, preserve array order, normalize primitives/null.
- CAM diff/apply algorithm hardening:
  - `clip-apps/src/core/cam/sessionDiffDetector.ts`
    - replaced raw `JSON.stringify(...)` equality checks with `stableJsonEqual(...)`.
  - `clip-apps/src/core/cam/sessionApplyPreview.ts`
    - ops-change detection now uses stable comparison, preventing key-order-only false positives.
  - added regression coverage:
    - `src/core/cam/sessionDiffDetector.spec.ts` (`key-order-only differences => unchanged`)
    - `src/core/cam/sessionApplyPreview.spec.ts` (`ops key-order-only differences => no change`)
- FDM canonicalization reuse:
  - `clip-apps/src/core/slicer/legacyFdmCompareText.ts`
    - switched fingerprint raw serialization to shared `toStableJsonText(...)` (same hashing output contract, shared implementation path).
- verification
  - `npx vitest run src/core/cam/sessionDiffDetector.spec.ts src/core/cam/sessionApplyPreview.spec.ts src/core/slicer/legacyFdmCompareText.spec.ts`
  - all tests passed (`13 passed`).

### CAM session snapshot ops deep-diff enhancement (algorithm priority, done in this batch)

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts`
  - enhanced ops diff algorithm beyond length/type checks:
    - keeps existing `ops.length` and `ops.types` signals
    - adds `ops.detail` when ops arrays have same length + same type sequence but per-op payload differs
  - per-op comparison uses shared `stableJsonEqual(...)`, so key-order-only differences do not trigger false positives.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts`
  - added regression test: same op type, changed params (`depth`) => emits `ops.detail`.
- verification
  - `npx vitest run src/core/cam/sessionSnapshotDiff.spec.ts src/core/cam/sessionDiffDetector.spec.ts src/core/cam/sessionApplyPreview.spec.ts`
  - all tests passed (`9 passed`).

### CAM apply executor clone-path unification (algorithm priority, done in this batch)

- `clip-apps/src/core/clonePlain.ts` (new)
  - introduced shared plain-data clone helper:
    - prefers `structuredClone` when available
    - falls back to `JSON.parse(JSON.stringify(...))`
  - intended for migration paths that operate on plain config/session objects.
- `clip-apps/src/core/cam/sessionApplyExecutor.ts`
  - replaced inline JSON clone calls with shared `clonePlain(...)`.
  - `ops` apply path upgraded from shallow `map({ ...op })` clone to deep clone via shared helper (prevents nested params reference bleed).
- `clip-apps/src/core/cam/sessionApplyExecutor.spec.ts`
  - added regression test ensuring nested `process` and `ops` payloads are isolated from profile mutations after apply.
- verification
  - `npx vitest run src/core/cam/sessionApplyExecutor.spec.ts src/core/cam/sessionApplyPreview.spec.ts src/core/cam/sessionSnapshotDiff.spec.ts`
  - all tests passed (`9 passed`).

### CamWorkspace clone helper adoption (done in this batch)

- `clip-apps/src/apps/cam/CamWorkspace.vue`
  - replaced remaining page-level `JSON.parse(JSON.stringify(...))` clone paths with shared `clonePlain(...)`.
  - covered both run-snapshot persistence and recent-run profile import flows:
    - `run.profile.device/tools/process`
    - `run.geometry`
    - `run.result`
    - `store.importProfile(...)` payload cloning
  - result: CAM page now aligns with core clone strategy and avoids scattered clone implementations.
- verification
  - `npx vitest run src/core/cam/sessionApplyExecutor.spec.ts src/core/cam/sessionSnapshotDiff.spec.ts`
  - all tests passed (`5 passed`).

### Cam store clone strategy unification (done in this batch)

- `clip-apps/src/stores/useCamStore.ts`
  - replaced remaining store-level JSON clone paths with shared `clonePlain(...)`.
  - default profile seeds (`sampleDevice` / `sampleTools` / `sampleProcess`), `loadRunSnapshot`, `loadSample`, and `cloneFromCurrent()` all use `clonePlain` directly (no local `deepClone` alias).
- `clip-apps/src/stores/useCamStore.spec.ts` (new)
  - regression coverage for `cloneFromCurrent` and `loadRunSnapshot` clone isolation (nested mutations must not affect saved/imported profile payloads).
- result
  - CAM page + CAM core + CAM store clone behavior now runs through the same helper family, reducing clone drift and maintenance surface.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam/sessionApplyExecutor.spec.ts src/core/cam/sessionApplyPreview.spec.ts src/core/cam/sessionSnapshotDiff.spec.ts`
  - all tests passed.

### clonePlain core unit tests (done in this batch)

- `clip-apps/src/core/clonePlain.spec.ts` (new)
  - asserts deep clone semantics for nested objects and arrays.
- verification
  - `npx vitest run src/core/clonePlain.spec.ts`
  - all tests passed.

### Slice API clone helper convergence (cross CAM/FDM base unification, done in this batch)

- `clip-apps/src/api/slice.ts`
  - removed local `safeClone(...)` implementation and switched to shared `clonePlain(...)`.
  - unified clone usage in worker-bound payload sanitization:
    - model `transform`
    - model `bbox`
    - `jobBounds`
    - `process` payload
  - this aligns API layer clone behavior with CAM core/store/page clone strategy.
- `clip-apps/src/api/slice.spec.ts`
  - added regression test to verify posted worker payload is clone-isolated from subsequent mutations on source `job/process`.
- verification
  - `npx vitest run src/api/slice.spec.ts src/core/cam/sessionApplyExecutor.spec.ts`
  - all tests passed (`5 passed`).

### Cam store clone regression coverage + helper cleanup (done in this batch)

- `clip-apps/src/stores/useCamStore.ts`
  - removed remaining `deepClone` alias indirection and switched sample/profile snapshot clone paths to direct `clonePlain(...)` calls.
  - keeps CAM store clone behavior aligned with shared clone helper strategy.
- `clip-apps/src/stores/useCamStore.spec.ts` (new)
  - added clone isolation regression tests:
    - `cloneFromCurrent()` stores deep-cloned profile payloads
    - `loadRunSnapshot()` clones run profile before importing into store state
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/stores/useFdmStore.spec.ts`
  - all tests passed (`7 passed`).

### Cam store `importProfile` defensive cloning (done in this batch)

- `clip-apps/src/stores/useCamStore.ts`
  - `importProfile(...)` now deep-clones `device`, `tools`, and `process` via `clonePlain(...)` before `upsertProfile` / `applyProfile`.
  - callers may pass live objects (e.g. UI-bound refs); store state and saved profiles no longer share references with the caller payload.
  - `loadRunSnapshot` / `CamWorkspace` paths that already clone remain correct (idempotent second clone).
- `clip-apps/src/stores/useCamStore.spec.ts`
  - added regression test: mutate caller-held `device` / `process` after import must not change store or stored profile.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts`
  - all tests passed (`3 passed`).

### stableJson contract tests + CAM export profile plain clone (done in this batch)

- `clip-apps/src/core/stableJson.spec.ts` (new)
  - unit tests for `stableJsonEqual`, `toStableJsonText`, and `toStableJsonValue` (key-order independence, array order sensitivity, nested determinism, `undefined` → `null` mapping).
- `clip-apps/src/stores/useCamStore.ts`
  - `exportProfileObject()` now returns `clonePlain(...)` payloads so exports are plain data (avoids accidental reactive-proxy leakage and isolates callers from store mutations).
- `clip-apps/src/stores/useCamStore.spec.ts`
  - regression test: mutating returned export object must not change live store state.
- verification
  - `npx vitest run src/core/stableJson.spec.ts src/stores/useCamStore.spec.ts`
  - all tests passed (`9 passed`).

### FDM store `setSliceResult` defensive cloning (done in this batch)

- `clip-apps/src/stores/useFdmStore.ts`
  - `setSliceResult(...)` now stores `clonePlain(result)` when non-null, matching CAM store import/export isolation strategy.
  - prevents caller/worker-side object reuse from mutating the persisted `sliceResult` snapshot in Pinia.
- `clip-apps/src/stores/useFdmStore.spec.ts`
  - added regression test: mutate caller-held `result` after `setSliceResult` must not change stored summary.
- verification
  - `npx vitest run src/stores/useFdmStore.spec.ts`
  - all tests passed (`6 passed`).

### FDM store jobs list / refresh / save clone isolation (done in this batch)

- `clip-apps/src/stores/useFdmStore.ts`
  - `loadJobs()` assigns `clonePlain(await listFdmJobs())` (aligned with Carvera/GridBot job list handling).
  - `refreshJob(id)` inserts `clonePlain(await getFdmJob(id))` into `jobs` instead of aliasing API-returned records.
  - `saveJob(record)` passes `clonePlain(record)` into `saveFdmJob` and uses cloned `id` for `selectedJobId`.
- `clip-apps/src/stores/useFdmStore.jobsClone.spec.ts` (new)
  - isolated file with `@/api/jobs` mocked so existing telemetry specs stay unchanged.
  - covers `loadJobs`, `saveJob`, and `refreshJob` reference isolation.
- verification
  - `npx vitest run src/stores`
  - all tests passed (`23 passed`).

### Job list views: avoid mutating API-returned arrays in-place (done in this batch)

- `clip-apps/src/views/jobs/FdmJobListView.vue`
- `clip-apps/src/views/jobs/CarveraJobListView.vue`
- `clip-apps/src/views/jobs/GridBotJobListView.vue`
  - `load()` paths previously did `jobs.value = list.sort(...)` which mutates the array returned from `list*Jobs()` before assignment.
  - now: `clonePlain(await list*Jobs())`, then `sort()` on the clone, then assign — avoids accidental aliasing/mutation of shared storage-backed arrays and matches the store-layer clone strategy.
- verification
  - `npx vitest run src/stores` (regression on related job store specs)
  - all tests passed (`23 passed`).

### Raster store defensive cloning (done in this batch)

- `clip-apps/src/stores/useRasterStore.ts`
  - `addRecentJob(...)` now stores `clonePlain(job)` so recent-job list entries do not alias caller objects.
  - `runRaster(...)` clones the incoming `RasterRequest` once (`structuredClone` preserves `Float32Array` geometry), assigns that snapshot to `currentRequest`, passes the same snapshot to `runRaster(...)`, and stores `clonePlain(res)` for `result` (isolates API return references from Pinia state).
- `clip-apps/src/stores/useRasterStore.spec.ts` (new)
  - `addRecentJob` nested mutation isolation test.
  - `runRaster` `Float32Array` mutation isolation test (`@/api/raster` mocked).
- verification
  - `npx vitest run src/stores/useRasterStore.spec.ts`
  - all tests passed (`2 passed`).

### Texturizer store defensive cloning (done in this batch)

- `clip-apps/src/stores/useTexturizerStore.ts`
  - `addRecentJob(...)` now stores `clonePlain(job)` (same contract as Raster/FDM recent lists).
  - `runTexturizer(...)` clones `TexturizeRequest` once for `currentRequest` + API call (`Float32Array` / optional `Uint8Array` texture preserved via `structuredClone`), and stores `clonePlain(res)` for `result`.
- `clip-apps/src/stores/useTexturizerStore.spec.ts` (new)
  - `addRecentJob` nested mutation isolation test.
  - `runTexturizer` vertex buffer mutation isolation test (`@/api/texturizer` mocked).
- verification
  - `npx vitest run src/stores/useTexturizerStore.spec.ts`
  - all tests passed (`2 passed`).

### Carvera / GridBot / Settings store job-settings clone isolation (done in this batch)

- `clip-apps/src/stores/useCarveraStore.ts`
  - `loadJobs()` assigns `clonePlain(await listCarveraJobs())` so Pinia `jobs` never aliases API-returned array identity.
  - `setJobs(list)` stores `clonePlain(list)` and persists the cloned snapshots (avoids caller mutating `list` after enqueue).
  - `addJob(job)` snapshots `clonePlain(job)` before `saveCarveraJob` / selection id wiring.
- `clip-apps/src/stores/useGridBotStore.ts`
  - `loadJobs()` assigns `clonePlain(await listGridBotJobs())`.
  - `saveJob(job)` passes `clonePlain(job)` into persistence before refresh + selection update.
- `clip-apps/src/stores/useSettingsStore.ts`
  - `load()` assigns `clonePlain(data)` for `settings` to decouple Pinia state from `getSettings()` return references.
- regression tests (new)
  - `clip-apps/src/stores/useCarveraStore.spec.ts` — `loadJobs` / `setJobs` / `addJob` clone isolation (`@/api/jobs` + `@/api/device` mocked).
  - `clip-apps/src/stores/useGridBotStore.spec.ts` — `loadJobs` / `saveJob` clone isolation (`@/api/jobs` + `@/api/device` mocked).
  - `clip-apps/src/stores/useSettingsStore.spec.ts` — `load()` clone isolation (`@/api/settings` mocked).
- verification
  - `npx vitest run src/stores`
  - all tests passed (`23 passed`).

### FDM settings views + workspace API snapshot isolation (`clonePlain`) (done in this batch)

- `clip-apps/src/views/devices/FdmDeviceListView.vue` — `listFdmDevices()` `local` / `stock` assigned via `clonePlain(...)` so table state does not alias settings-backed arrays.
- `clip-apps/src/views/material/FdmMaterialView.vue` — list load + `getFdmMaterial` → `Object.assign(form, clonePlain(rec))` so the reactive editor form does not share object identity with workspace settings records.
- `clip-apps/src/views/process/FdmProcessView.vue` — same pattern for process summaries and `getFdmProcess` before range normalization / `Object.assign(form, ...)`.
- `clip-apps/src/views/config/FdmCurrentConfigView.vue` — `getCurrentFdmConfig()` merged into local `cfg` via `clonePlain` before `Object.assign`.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — `reload` / job restore / slice / update-job / Kiri PoC paths clone `getFdmProcess` / `getFdmJob` results before holding them in component state or embedding in `saveFdmJob` (`processSnapshot`).
- verification
  - `npx vitest run src/stores`
  - all tests passed (`23 passed`).

### Settings form + CAM recent-runs snapshot isolation (`clonePlain`) (done in this batch)

- `clip-apps/src/views/settings/SettingsView.vue` — when `settingsStore.settings.controller` updates, `Object.assign(form, clonePlain(val))` so the reactive editor form never shares object identity with Pinia `settings` (even though `ControllerSettings` is currently flat fields).
- `clip-apps/src/stores/useCamStore.ts` — `loadRecentRuns()` stores `clonePlain(parsed)`; `addRecentRun(run)` snapshots `clonePlain(run)` before prepend / persist (defense in depth vs callers that reuse one object).
- `clip-apps/src/stores/useCamStore.spec.ts` — `addRecentRun` caller-mutation isolation test.
- `clip-apps/src/views/fdm/FdmWorkspaceView.vue` — removed unused `listFdmJobs` import (jobs reload goes through `fdmStore.loadJobs()`).
- verification
  - `npx vitest run src/stores`
  - all tests passed (`24 passed`).

### CAM `applyProfile` + Raster/Texturizer recent-job load isolation (`clonePlain`) (done in this batch)

- `clip-apps/src/stores/useCamStore.ts` — `applyProfile` now assigns `clonePlain(profile.device|tools|process)` into active editor state so mutating `device` / `process` in the workspace does not mutate the canonical `profiles[]` entry until an explicit save/upsert path updates it.
- `clip-apps/src/stores/useCamStore.spec.ts` — regression test for profile list vs active session decoupling (`loadSample` + rename `deviceName`).
- `clip-apps/src/stores/useRasterStore.ts` / `useTexturizerStore.ts` — `loadRecentJobs()` mirrors CAM `loadRecentRuns()` by storing `clonePlain(parsed)` for `localStorage` JSON arrays.
- verification
  - `npx vitest run src/stores`
  - all tests passed (`25 passed`).

### CAM placeholder summary + FDM mock slice time heuristics (algorithm, done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — `estimateCamPlaceholderSummary` now:
  - expands XY footprint with `camStockX` / `camStockY` when larger than part bbox;
  - resolves `step`/`over` from per-op fields, then `camRoughOver` / `camLevelOver` / `camOutlineOver` / `camContourOver` / `camTraceOver` by op type; `down` similarly from `camRoughDown` / `camLevelDown` / … when missing on the op;
  - replaces flat `(dx+dy)/step` with a **perimeter + capped pocket/raster** cut-length heuristic and ties machining minutes to **`Σ(segments × step)`** instead of a fixed `1.5 mm` per segment;
  - when `ops` is empty, emits a **single implicit roughing** estimate so placeholder CAM still reports non-zero passes/segments/time (migration/debug UX).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — stock footprint + empty-ops coverage.
- `clip-apps/src/core/slicer/mockSlicer.ts` — `estimateMockSummary`: layer count respects **`firstSliceHeight`** vs `sliceHeight` for the remainder of model Z; adds **layer-change travel** from planar diagonal and `outputSeekrate`.
- `clip-apps/src/core/slicer/mockSlicer.spec.ts` — thicker first layer ⇒ fewer mock layers.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts src/core/slicer/mockSlicer.spec.ts src/core/cam`
  - all targeted tests passed (`core/cam` suite: 78 tests in this environment).

### Kiri / mock FDM `estimateMeta` alignment (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.ts` — single `finalTimeSec` drives both `estimateMeta.timeSec.final` and `timeMinutes`; added **`syncSliceSummaryTimeFromEstimateMeta`** so any pipeline that mutates `estimateMeta` can re-sync top-level minutes without duplicating formulas.
- `clip-apps/src/core/slicer/mockSlicer.ts` — mock slice **`summary` is no longer** from the old planar-area heuristic; it now uses **`estimateSummaryFromPreview(preview.layers, proc)`** (same entry point as **`sliceWithKiri`**), so **`estimateMeta`**, **`filamentMm`**, and **`timeMinutes`** all come from the same preview-path estimator as the Kiri worker path.
- `clip-apps/src/core/slicer/kiriEngine.ts` — wraps the preview summary with **`syncSliceSummaryTimeFromEstimateMeta`** for explicit contract parity with mock.
- tests: `previewEstimate.spec.ts` (sync helper), `mockSlicer.spec.ts` (estimateMeta + `timeMinutes` vs `final`), `kiriEngine.spec.ts` (partial `previewEstimate` mock re-exports real `sync…`).
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`117 passed`).

### Kiri slice → preview paths for `estimateMeta` (`previewConvert`, done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — `convertWidgetSlicesToLayers` now ingests additional legacy Kiri **Top** fields so `estimateSummaryFromPreview` sees more of the real toolpath:
  - **`top.poly`** as perimeter when **no shell polygons** were emitted (outline-only / early-slice cases);
  - **`top.last`**, **`top.fill_off`**, **`top.gaps`** as polygons (`last` → perimeter, `fill_off` / `gaps` → infill);
  - **`top.thin_fill`** as line infill;
  - **`top.thin_wall`** trace arrays as chained **perimeter** segments (Kiri trace point format).
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — coverage for poly-only tops, `thin_wall`, and `fill_off` + `gaps`.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`120 passed`).

### Scoreboard refresh + CAM store `upsertProfile` clone (done in this batch)

- **Weighted scoreboard** — CAM row **54% → 55%** (recent placeholder-summary + slice-preview / `estimateMeta` alignment); **strict total 54.69% → 54.89%**; **primary-path headline** updated to **~62.2%** as the weighted mean of the five product rows (Texturizer + Raster + CAM + Carvera + GridBot), consistent with the table cells (replaces the old **~69%** headline, which no longer matched the published completion percentages).
- `clip-apps/src/stores/useCamStore.ts` — `upsertProfile` snapshots with `clonePlain` before `profiles[]` splice/push (same isolation contract as `importProfile` / `applyProfile`).
- `clip-apps/src/stores/useCamStore.spec.ts` — `upsertProfile` mutation isolation test.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts`
  - all tests passed (`7 passed` in this file).

### CAM / slicer algorithm pass (`firstLayerRate` + effective CAM feed) (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.ts` — **`estimateSummaryFromPreview`** now applies **`firstLayerRate`** (fallback `outputFeedrate`) to **layer index 0** print moves (perimeter / infill / support each with the same layer-local feed scaling as before); upper layers keep `outputFeedrate`. Aligns mock/Kiri preview-based time and `estimateMeta.timeSec.print` with common slicer “slow first layer” behavior.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveCamMachiningFeed`**: machining minutes use **`min(camFastFeed, camRoughSpeed, camLevelSpeed, camOutlineSpeed, camContourSpeed, camTraceSpeed)`** (positive entries only) so placeholder CAM time is **conservative** when roughing/leveling hints are slower than rapid `camFastFeed`.
- tests: `previewEstimate.spec.ts`, `camJobSummaryBridge.spec.ts`; verification `npx vitest run src/core/slicer` (**126 passed**), `npx vitest run src/core/cam` (**79 passed**).
- scoreboard: CAM **55% → 56%**, strict total **54.89% → 55.09%**, primary-path mean **~62.2% → ~62.4%**.

### Slicer `previewEstimate`: Z-order + `firstSliceHeight` first-band (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.ts` — `estimateSummaryFromPreview` now **sorts layers by `z` ascending** before accumulating lengths / inter-layer travel / print time (stable when worker/preview emits shuffled layer order). **Slow `firstLayerRate`** applies to every layer whose **`z` lies in `[z_min, z_min + firstSliceHeight]`** (with `firstSliceHeight` floored at `sliceHeight`), so thicker first slices pull more planes into the slow-feed band (aligned with mock layer-height semantics).
- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — coverage for thick `firstSliceHeight`, shuffled layer order invariance.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`123 passed`).

### Slicer `previewEstimate`: first-band travel time (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.ts` — travel time is now accumulated **per segment** (in-layer `travel` paths + **inter-layer** moves into the current layer) using a layer-local seek feed: in the **`firstSliceHeight`** band, `layerTravelFeed = min(outputSeekrate, firstLayerRate * 1.25)` (floored at 1 mm/s), instead of a single global `totalTravelLen / outputSeekrate`.
- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — regression: low `firstLayerRate` increases `estimateMeta.timeSec.travel` vs high first-layer rate on the same preview.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`124 passed`).

### Slicer `previewConvert`: slice/top solid & bridge polygons (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — `convertWidgetSlicesToLayers` now maps additional legacy Kiri **slice** and **Top** fields into preview paths for `estimateSummaryFromPreview` / `estimateMeta`:
  - slice-level **`groups`** → perimeter, **`solids`** / **`bridges`** / **`flats`** → infill;
  - per-top **`solids`** / **`bridges`** → infill (solid-fill / bridge regions from `fdm/slice.js` post paths).
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — regression for combined slice + top polygon emission.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`127 passed` in this environment).

### Slicer `previewConvert`: support `poly.fill` hatch lines (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — for each legacy **`slice.supports[]`** polygon, after the outline path, ingest **`poly.fill`**: paired **`Point`** entries from `fdm/slice.js` **`fillSupportPolys` / `connect_lines`**, emitted as **`support`** segments so `estimateSummaryFromPreview` counts support extrusion length (not only support outlines).
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — outline + two fill segment pairs.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`128 passed` in this environment).

### Slicer `previewConvert`: `top.fill_lines` flat Point pairs (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — **`top.fill_lines`** is not only an array of line records: legacy **`POLY.fillArea`** (`legacy/geo/polygons.js`) and **`forEachSegment`** paths push **flat `p1, p2, p1, p2…`** into the same array. Added **`pushFillLines`** (detect line-records vs. paired points) so preview **`infill`** length / `estimateMeta` include the common fill-line layout from Kiri FDM post.
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — four-point flat `fill_lines` → two infill segments.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`129 passed` in this environment).

### Slicer `previewConvert`: `top.thin_fill` uses `pushFillLines` (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — **`top.thin_fill`** is fed to the same **`pushFillLines`** path as **`top.fill_lines`** (`fdm/slice.js` uses **`addLines(top.thin_fill)`**; `post.js` builds it from **`cullIntersections`/`fillArea`** flat pairs and thin-trace **`lines.push`** pairs), replacing the old per-element **`lineToPath` only** loop that missed flat **`Point`** runs.
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — two-point **`thin_fill`** → one infill segment.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`130 passed` in this environment).

### Slicer `previewConvert`: tuple vertices + `X`/`Y` line endpoints (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — **`polyToPath`** now accepts **`points`** entries as **`[x, y]`** tuples (in addition to **`{ x, y }`**), matching common serialized / interop polygon layouts. **`lineToPath`** now falls back to **`X` / `Y`** when **`x` / `y`** are missing (Clipper-style endpoint objects on some legacy paths).
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — tuple polygon + **`{X,Y}`** line coverage.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`132 passed` in this environment).

### Slicer `previewConvert`: `slice.lines` flat pairs + shared `pushSegmentArray` (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.ts` — refactored **`pushFillLines`** / **`pushSliceLines`** through **`pushSegmentArray`** + **`resolveLineAsType`** so **`slice.lines`** accepts the same **flat paired endpoint** layout as **`fill_lines`** / **`thin_fill`**, while keeping **`{ start, end }`** travel handling via **`startEndWrap`**.
- `clip-apps/src/core/slicer/previewConvert.spec.ts` — four-point **`lines`** → two **`travel`** segments.
- verification
  - `npx vitest run src/core/slicer`
  - all tests passed (`133 passed` in this environment).

### CAM `enrichCamJobSummaryFromPostSliceWidget`: `toolCountUsed` from `camops` (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — after legacy **`cam_slice`**, **`summary.toolCountUsed`** is at least the count of **distinct numeric `op.tool`** values in **`widget.camops`** (aligned with multi-tool paths when the placeholder estimate only saw process.ops).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — two camops with tools **1** and **3** ⇒ **`toolCountUsed === 2`**.
- `clip-apps/src/core/slicer/previewConvert.ts` — **`support[].fill`** now goes through **`pushSegmentArray`** (same line-record / flat-pair rules as other segment lists); removed duplicate **`pushSupportFillLines`**.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts src/core/slicer/previewConvert.spec.ts`
  - targeted tests passed (`20 passed` in this environment).

### CAM `enrichCamJobSummaryFromPostSliceWidget`: `opCount` + slice divisor vs `camops` length (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`summary.opCount`** is at least **`widget.camops.length`** when non-empty. **`opCountForHeuristics = max(perOp.length, camops.length, 1)`** drives slice-plane **segment boost** and per-row **`estimatedPasses`** (`ceil(slicePlanes / opCountForHeuristics)`) so legacy emitting **more `camops` than `process.ops` rows** does not use an understated divisor on the kiri-cam enrich path.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — three **`camops`** vs two profile **`ops`** ⇒ **`opCount === 3`** with **`slices.length === 30`** passes floor preserved.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts`
  - all tests passed (`7 passed` in this environment).

### CAM + slicer algorithms: per-op segment scale + Z layer advance time (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — when **`widget.slices`** raises **`summary.estimatedTotalPathSegments`** above the sum of **`perOp[].estimatedPathSegments`**, each row is **scaled proportionally** (with remainder on the last op) so per-op segment counts **sum to the enriched summary** (UI / diagnostics parity with boosted totals; **`recalcMachiningMinutes`** already keyed off summary totals).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — synthetic low segment totals + **50** slice planes ⇒ **`Σ perOp.estimatedPathSegments === summary.estimatedTotalPathSegments`**.
- `clip-apps/src/core/slicer/previewEstimate.ts` — **`estimateSummaryFromPreview`** adds **inter-plane Z travel** \((n-1)\cdot sliceHeight\) at a conservative **\(0.4\times\)** XY print feed (mm/s), folded into **`motionTimeSec` / `timeSec.final`** (2D path lengths still omit Z).
- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — three layers vs one ⇒ higher **`timeSec.final`**.
- verification
  - `npx vitest run src/core/cam src/core/slicer`
  - all tests passed (`216 passed` in this environment).

### CAM enrich: synthetic `perOp` when `ops=[]` + slicer Z-hop time (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — if **`base.perOp`** is empty after placeholder estimate but **`widget.slices`** / **`widget.camops`** exist, **`enrichCamJobSummaryFromPostSliceWidget`** now builds **`perOp`** from **`camops`** (passes + **\(q,r\)** segment partition so **`Σ estimatedPathSegments === summary.estimatedTotalPathSegments`**), or a **single implicit `rough`** row when there are slices but no **`camops`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`ops: []`** + **100** slices + two **`camops`** ⇒ two **`perOp`** rows and matching segment sum.
- `clip-apps/src/core/slicer/previewEstimate.ts` — **`estimateSummaryFromPreview`** adds optional **Z-hop** time \((n-1)\cdot\) **`zHopDistance` / `outputRetractSpeed`** on top of layer Z advance (still not in 2D lengths / **`estimateMeta.lengths`**).
- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — **`zHopDistance`** increases **`timeSec.final`** on a two-layer preview.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts src/core/slicer/previewEstimate.spec.ts src/core/slicer/mockSlicer.spec.ts`
  - targeted tests passed (`29 passed` for `camJobSummaryBridge` + `previewEstimate` + `mockSlicer`); full **`npx vitest run src/core/cam src/core/slicer`** ⇒ **`268 passed`** in this environment (`132` + `136`).

### CAM placeholder: drill / helical / register + `camPocketOver` + `camDrillDownSpeed` (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`**: **`pocket`** prefers **`camPocketOver`** before rough/level; **`drill`** uses per-op **`step`/`over`** else **0.2**; **`helical`** / **`register`** use op fields then **`camHelicalDown`** / **`camRegisterOffset`** (and sensible process fallbacks). **`resolveOpDown`**: **`drill`** → **`camDrillDown`** (fallback **`camTraceDown`** / small cap), **`helical`** → **`camHelicalDown`**, **`register`** → **`camRegisterThru`** (capped). **`effectiveCamMachiningFeed`** includes **`camDrillDownSpeed`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — finer **`camPocketOver`** ⇒ more path segments; smaller **`camDrillDown`** ⇒ more passes; slower **`camDrillDownSpeed`** ⇒ longer machining minutes.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts`
  - all tests passed (`15 passed` in this environment).

### CAM enrich + feed: `nominalPathLengthFromPerOp` + `camFastFeedZ` (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`enrichCamJobSummaryFromPostSliceWidget`** final **`recalcMachiningMinutes`** uses a per-op nominal length from **`nominalPathLengthFromPerOp`** (initially keyed off **`process.ops`**) instead of always using **`estimatedTotalPathSegments × 1.5`** after slice scaling. **`effectiveCamMachiningFeed`** also applies **`camFastFeedZ`** (when set) as an upper bound with **`camFastFeed`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — single rough op + slice scaling ⇒ minutes **`≈ (segs × step) / feed`**; low **`camFastFeedZ`** lengthens minutes vs high Z rapid.

### CAM enrich: `nominalPathLengthFromPerOp` + **`camops`** index pairing + `laser` / `indexed` / `gcode` heuristics (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`nominalPathLengthFromPerOp(process, perOp, camops)`**: **Σ `estimatedPathSegments × resolveOpStepOver(op)`** when **`perOp[i].opIndex`** resolves **`process.ops`**, else when **`perOp.length === camops.length`** and legacy **`camops[i].op`** exists, pair by index so **`process.ops: []`** enrich paths still get a finite nominal length (not only **`estimatedTotalPathSegments × 1.5`**). **`resolveOpStepOver` / `resolveOpDown`**: explicit **`laser`** (trace-style defaults), **`indexed`** (rough-style **`camRoughOver` / `camRoughDown`**), **`gcode`** (unit step / small **`down`** cap).
- `clip-apps/src/types/cam.ts` — **`camLaserSpeed`** on **`CamProcessConfig`** (grip device templates, e.g. Carvera, expose laser feed separately from **`camTraceSpeed`**). `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveCamMachiningFeed`** includes **`camLaserSpeed`** in the conservative **`min`** with **`camFastFeed`** / **`camFastFeedZ`** / other per-process CAM feeds.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`ops: []`** + slices + one **`camops`** rough with **`step: 2`** ⇒ **`estimatedMachiningTimeMinutes ≈ (segs × 2) / feed / 60`**; slower **`camLaserSpeed`** ⇒ longer minutes for **`type: 'laser'`** placeholder rows.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`** (`25` test files) in this environment; `npx vitest run src/core/slicer` — **`136 passed`** (`27` test files); combined **`src/core/cam src/core/slicer`** ⇒ **`268 passed`**.

### CAM feed: per-op **`op.rate`** + legacy **`camops[].op.rate`** on enrich (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveCamMachiningFeed(process, camops?)`** now also **`min`**-caps with the **smallest positive `op.rate`** on **`process.ops`** and, when **`camops`** is passed (slice enrich path), the smallest positive **`camops[i].op.rate`**. Matches grip **`cl-ops.js`** per-op **`rate`** → process speed field wiring; **`op.speed`** is **not** folded in (often spindle RPM).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`recalcMachiningMinutes(..., camops?)`** forwards **`camops`** so **`process.ops: []`** kiri-cam enrich still respects widget-level feed overrides.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — profile op with **`rate: 400`** vs **`camRoughSpeed: 3000`** lengthens minutes; **`ops: []`** + **`camops`** with **`rate: 250`** ⇒ minutes **`≈ (segs × step) / 250 / 60`**.

### CAM feed: process **`cam*Plunge`** + per-op **`op.plunge`** (+ **`camops`**) (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveCamMachiningFeed`** also **`min`**-caps with **`camRoughPlunge`**, **`camOutlinePlunge`**, **`camTracePlunge`**, **`camPocketPlunge`** (grip **`kiri-cam-process.json`**) and with the smallest positive **`op.plunge`** on **`process.ops`** / **`widget.camops[].op`** on the enrich path (aligned with default op objects that carry **`rate`** + **`plunge`** together).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — lower **`camRoughPlunge`** or per-op **`plunge`** lengthens minutes; **`camops`** with **`plunge` < `rate`** drives **`recalcMachiningMinutes`** feed for empty-**`ops`** enrich.

### CAM feed: **`camHelicalDownSpeed`** in **`effectiveCamMachiningFeed`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`camHelicalDownSpeed`** is included in the same conservative **`min`** as **`camDrillDownSpeed`** (grip **`kiri-cam-process.json`** lists both; helical UI maps Z plunge to **`camHelicalDownSpeed`** in **`cl-ops.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`type: 'helical'`** + lower **`camHelicalDownSpeed`** ⇒ longer **`estimatedMachiningTimeMinutes`** than a higher helical Z feed cap.

### CAM placeholder: helical **`resolveOpStepOver`** vs Z **`camHelicalDown`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`helical`** no longer falls back to **`camHelicalDown`** (Z cut depth per grip **`cl-ops.js`**); when the op has no **`step`/`over`**, XY step uses positive **`camHelicalOffsetOverride`** if set, else **`camRoughOver`** / **`camLevelOver`** (same order of magnitude as other milling ops).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — helical op without explicit step: finer **`camRoughOver`** ⇒ more **`estimatedPathSegments`** even when **`camHelicalDown`** is large (would have wrongly inflated step under the old fallback).

### CAM placeholder: empty **`ops`** uses **`camRoughOver` / `camRoughDown`** (+ pocket / level fallbacks) (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — when **`process.ops`** is empty, the implicit roughing heuristic now prefers **`camRoughOver`** (then **`camPocketOver`**, **`camLevelOver`**, **`camOutlineOver`**, **`camContourOver`**, **`camTraceOver`**) for XY step and **`camRoughDown`** (then **`camPocketDown`**, **`camLevelDown`**, **`camOutlineDown`**, **`camTraceDown`**, **`camHelicalDown`**, **`camDrillDown`**, **`camRegisterThru`**) for Z cut depth (each capped by stock **`safeDz`**), instead of only **`min(stock)/20`** and full stock height per pass.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camRoughOver` + `camRoughDown`** with **`ops: []`** ⇒ higher **`estimatedTotalPathSegments`** (and passes) vs bare **`camFastFeed`** empty profile; **`camOutlineOver`** alone (no rough/pocket/level) ⇒ finer implicit step vs stock-only default; **`camHelicalDown`** alone ⇒ more **`estimatedTotalPasses`** when stock Z span exceeds that depth.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — same empty-**`ops`** path now sets **`summary.toolCountUsed`** from **distinct positive **`camRoughTool` / `camLevelTool` / … / `camHelicalTool`** (grip **`kiri-cam-process.json`** carries per-op-type tool ids even before an **`ops`** array exists).

### CAM placeholder: Z span from **`camStockZ`** vs part bbox (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`estimateCamPlaceholderSummary`** uses **`safeDz = max(|Δz| from input bbox, camStockZ)`** when **`camStockZ`** is a positive number (stock taller than part ⇒ more Z passes / segments; XY still from **`footprintXY`** with **`camStockX` / `camStockY`** as before).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camStockZ` ≫ part height** with fixed **`camRoughDown`** ⇒ **`estimatedPasses`** increases vs no stock-Z hint.

### CAM placeholder: **`indexed`** uses **`camLevel*`** when **`camRough*`** absent (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver` / `resolveOpDown`** for **`type: 'indexed'`** now fall through **`camRoughOver` → `camLevelOver`** and **`camRoughDown` → `camLevelDown`** before stock-height defaults (indexed work often shares leveling-style process defaults).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camLevelDown` + `camLevelOver`** alone ⇒ higher passes and segments than bare **`indexed`** op.

### CAM placeholder: contour **`camContourLeave`** / **`op.leave`** in **`resolveOpStepOver`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camContourLeave`** on **`CamProcessConfig`** (grip **`cl-ops.js`** contour **`leave`** field).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`contour`** adds **`op.leave`** or **`camContourLeave`** to the base **`camContourOver`** (with **`camRoughOver` / `camLevelOver`** fallbacks), widening the effective XY step for conservative placeholder segment counts.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camContourLeave`** with fixed **`camContourOver`** ⇒ fewer **`estimatedPathSegments`** than leave unset.

### CAM placeholder: pocket **`camPocketExpand`** in **`resolveOpStepOver`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`pocket`** adds positive **`camPocketExpand`** to **`camPocketOver`** (with **`camRoughOver` / `camLevelOver`** fallbacks), matching grip **`cl-ops.js`** **`expand: 'camPocketExpand'`** (wider effective pocket step ⇒ fewer placeholder segments).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camPocketExpand`** with fixed **`camPocketOver`** ⇒ fewer **`estimatedPathSegments`**.

### CAM placeholder: rough **`camRoughStock`** / **`op.leave`** in **`resolveOpStepOver`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`rough`** adds **`op.leave`** or **`camRoughStock`** (grip **`cl-ops.js`** **`leave: 'camRoughStock'`**) to **`camRoughOver`**, widening the effective XY step for placeholder segment counts (symmetric with contour **`leave`** handling).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camRoughStock`** with fixed **`camRoughOver`** ⇒ fewer **`estimatedPathSegments`**.

### CAM placeholder: level **`camLevelInset`** / **`op.inset`** in **`resolveOpStepOver`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camLevelInset`** on **`CamProcessConfig`**; **`inset`** on **`CamOperationInstance`** (grip **`cl-ops.js`** **`inset: 'camLevelInset'`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`level`** adds **`op.inset`** or **`camLevelInset`** to **`camLevelOver`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camLevelInset`** with fixed **`camLevelOver`** ⇒ fewer **`estimatedPathSegments`**.

### CAM placeholder: trace **`camTraceOffOver`** / **`op.offover`** + **`camTraceThru`** / **`op.thru`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camTraceOffOver`**, **`camTraceThru`** on **`CamProcessConfig`**; **`offover`**, **`thru`** on **`CamOperationInstance`** (grip **`cl-ops.js`** maps **`offover: 'camTraceOffOver'`**, **`thru: 'camTraceThru'`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`** for **`trace`** adds **`op.offover`** or **`camTraceOffOver`** to **`camTraceOver`** (wider effective trace step ⇒ fewer placeholder path segments). **`resolveOpDown`** for **`trace`** (when **`op.down`** is unset) uses **`camTraceDown`** plus **`op.thru`** or **`camTraceThru`**, clamped to **`safeDz`** (deeper effective pass ⇒ fewer Z passes). Empty-**`ops`** implicit **`traceDown`** branch includes **`camTraceThru`** the same way.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`offover`** / **`camTraceOffOver`** vs base trace step; **`thru`** / **`camTraceThru`** with fixed **`camTraceDown`** ⇒ fewer **`estimatedPasses`** than thru unset.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`** (`25` test files); `npx vitest run src/core/cam src/core/slicer` — **`268 passed`** (`132` + `136`).

### CAM placeholder: trace **`camTraceType`** / **`op.mode`** + **`camTraceOffset`** / **`op.offset`** segment scale (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camTraceOffset`** on **`CamProcessConfig`** (`none` | `inside` | `outside`, grip **`cl-ops.js`** **`offset: 'camTraceOffset'`**); **`mode`**, **`offset`** on **`CamOperationInstance`** (per-op **`mode`** overrides **`camTraceType`** for follow vs clear).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`traceSegmentScale`**: **`clear`** ⇒ **×2** on placeholder path segments (grip **`op-trace.js`** dual offset shells **`-toolDiam/2`** and **`-toolOver`** per pass); **`follow`** with **`inside`/`outside`** ⇒ **×1.15** (lateral offset pass vs **`none`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`clear` vs `follow`** ratio **≈2**; per-op **`mode: 'clear'`** overrides process **`follow`**; **`camTraceOffset: 'outside'`** vs **`none`** increases segments.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`**; combined **`src/core/cam src/core/slicer`** — **`268 passed`**.

### CAM placeholder: trace **`camTraceMerge`** / **`camTraceDogbone`** (+ per-op **`merge`/`dogbone`**) (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camTraceMerge`**, **`camTraceDogbone`** on **`CamProcessConfig`**; **`merge`**, **`dogbone`** on **`CamOperationInstance`** (grip **`cl-ops.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`traceMergeScale`**: follow mode, **single Z pass**, merge on ⇒ **×0.9** segments (grip **`op-trace.js`** union of overlapping open contours). **`traceDogboneScale`**: **×1.08** when dogbone enabled.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — merge vs no merge with **`camTraceDown === stock span`**; merge ignored when **`passes > 1`**; dogbone vs plain.

### CAM placeholder: outline wide shells + dogbone / omit + **`camRegisterTool`** in tool count (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camOutlineOverCount`**, **`camOutlineOmitVoid`**; **`camRegisterTool`**; **`steps`** on **`CamOperationInstance`** (grip outline **`steps: 'camOutlineOverCount'`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`outlineSegmentScale`**: **`camOutlineWide`** ⇒ multiply by **`op.steps ?? camOutlineOverCount`** (clamped **1…500**); **`camOutlineDogbone`** **×1.08**; **`camOutlineOmitVoid`** **×0.94**; **`camOutlineOmitThru`** **×0.97**. **`distinctProcessToolCount`** includes **`camRegisterTool`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — wide **×4** vs narrow; per-op **`steps`** overrides process count; dogbone up / omit void down; empty-**`ops`** tool count includes register id.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camOutlineOverCount`**, **`camOutlineOmitVoid`** defaults aligned with grip-style process JSON.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`**; **`src/core/cam src/core/slicer`** — **`268 passed`**.

### CAM placeholder: trace Z band + outline **clear top** + contour quality scale (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camTraceZTop`**, **`camTraceZBottom`**, **`camOutlineTop`**, **`camContourReduce`**, **`camFlatness`** (grip **`cl-ops.js`** / **`conf.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveZSpanForPasses`**: trace only, when **`camTraceZTop > camTraceZBottom`**, **`min(safeDz, top−bottom)`** drives **`ceil(zSpan / down)`** pass count. **`adjustedPassCount`**: outline with **`op.top`** or **`camOutlineTop`** ⇒ **×1.2** rounded pass count (grip **`op-outline.js`** top slices). **`contourSegmentScale`**: **`camContourReduce`**, **`camFlatness`**, **`camTolerance`**, **`camContourCurves === false`**, **`camContourBottom`**, dual-axis **`camContourXOn` + `camContourYOn`**, **`camContourBridge`** nudge segment totals.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — trace Z clip vs full stock; outline top on vs off; contour reduce / bottom vs baseline.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camOutlineTop`**, **`camTraceZTop` / `camTraceZBottom`**, **`camContourReduce`**, **`camFlatness`** defaults.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`**; **`src/core/cam src/core/slicer`** — **`268 passed`**.

### CAM placeholder: level **`camLevelStepZ`** / **`camLevelStock`** + rough **`camRoughStockZ`** / **`camRoughOmitThru`** + pocket **`camPocketContour`** / **`camPocketRefine`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camLevelStepZ`**, **`camLevelStock`**, **`camRoughStockZ`**, **`camRoughOmitThru`**, **`camPocketOutline`**, **`camPocketRefine`**; per-op **`stepz`**, **`leavez`** (grip **`cl-ops.js`** **`stepz` / `leavez`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpDown`**: **`level`** prefers **`op.stepz ?? camLevelStepZ`** when **> 0**; **`rough`** adds **`op.leavez ?? camRoughStockZ`** to **`camRoughDown`**. Empty-**`ops`** implicit Z depth: **`camRoughStockZ`** on rough, **`camLevelStepZ`** before **`camLevelDown`**. **`levelSegmentScale`**, **`roughSegmentScale`**, **`pocketSegmentScale`** on placeholder path segments; **`pocketSegmentScale`** covers **`camPocketContour`**, **`camPocketEngrave`**, **`camPocketOutline`/`cmaPocketOutline`**, **`camPocketSmooth`**, **`camPocketRefine`/`cmaPocketRefine`**, **`camPocketFollow`** (see also dedicated batch for **`camZTop`** / drill thru / **`camRoughAll`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — contour **X+Y** vs **X** only; level **stepZ** vs **`camLevelDown`**; **`camLevelStock`**; rough **stock Z** / **`camRoughOmitThru`**; pocket contour+smooth+refine vs plain.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camLevelStepZ`**, **`camLevelStock`**, **`camRoughStockZ`**, **`camRoughOmitThru`**, **`camPocketOutline`**, **`camPocketRefine`** defaults.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`**; **`src/core/cam src/core/slicer`** — **`268 passed`**.

### CAM placeholder: global **`camZTop`/`camZBottom`** + drill **`camDrillThru`** / **`camPocketFollow`** / **`camRoughAll`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camZTop`**, **`camDrillThru`**, **`camDrillPrecision`**, **`camDrillFromStockTop`**, **`camPocketFollow`**, **`camRoughAll`**; per-op **`all`**, **`follow`** (grip **`cl-ops.js`** / **`op-drill.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveGlobalZSpan`**: when **`camZTop > camZBottom`**, **`min(rawSafeDz, top−bottom)`** caps stock-span **`safeDz`** (empty-**`ops`** and per-op **`ceil(zSpan/down)`**). **`drillSegmentScale`**: **`op.thru ?? camDrillThru`** (through depth), **`camDrillPrecision`**, **`camDrillFromStockTop`**. **`pocketSegmentScale`**: **`op.follow ?? camPocketFollow`**. **`roughSegmentScale`**: **`camRoughAll`** or **`op.all`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camZTop`/`camZBottom`** empty-**`ops`** vs bbox-only; pocket **`camPocketFollow`**; rough **`camRoughAll`**; drill **`camDrillThru`** + **`camDrillPrecision`**.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camZTop`**, **`camDrillThru`**, **`camDrillPrecision`**, **`camDrillFromStockTop`**, **`camPocketFollow`** defaults.
- verification
  - `npx vitest run src/core/cam` — **`132 passed`**; **`src/core/cam src/core/slicer`** — **`268 passed`**.

### CAM enrich: extra **`camops`** beyond **`base.perOp`** + segment scale parity (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — when **`base.perOp`** came from **`process.ops`** but **`widget.camops`** is longer, **append** synthetic **`perOp`** rows (passes from slice divisor; **`estimatedPathSegments: 0`** until slice boost scaling). **`nominalPathLengthFromPerOp`** now, whenever **`camops.length === perOp.length`**, uses **`process.ops[row.opIndex] ?? camops[i]?.op`** per index so appended rows without a profile **`ops[i]`** still resolve **`resolveOpStepOver`** from legacy **`camops[i].op`**. Slice segment scaling keeps **`0`** rows at **`0`** through the ratio step so the final **`diff`** on the last op can **`Σ perOp.estimatedPathSegments === summary.estimatedTotalPathSegments`** exactly (avoids **`max(1, round(0×r))`** forcing a stray **+1**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — three **`camops`** vs two profile **`ops`** ⇒ **`perOp.length === 3`**, third row **`type: 'trace'`**, segment sum matches boosted summary total.

### CAM placeholder: pocket/contour `down` + pocket/helical/register feed cap (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpDown`**: **`pocket`** uses **`camPocketDown`** (fallback **`camRoughDown`**), **`contour`** uses **`camLevelDown`** (fallback **`camRoughDown`**). **`effectiveCamMachiningFeed`** also considers **`camPocketSpeed`**, **`camHelicalSpeed`**, **`camRegisterSpeed`** when set (conservative **`min`** with other CAM feeds).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camPocketDown`** increases pocket passes vs stock-height default; slow **`camPocketSpeed`** lengthens machining minutes vs fast pocket speed.

### CAM placeholder: **`flip`** + **`helicalThru`** + register / indexed / **`gcode`** segment parity (done in this batch)

- `clip-apps/src/types/cam.ts` — **`'flip'`** on **`CamOperationType`**; **`op.axis`**; **`camHelicalFromStockTop`**, **`camFlipInvert`**, **`camIndexAxis`**, **`camIndexAbs`**, **`camCustomGcode`** on **`CamProcessConfig`** (grip **`cl-ops.js`** / **`conf.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpDown`**: **`helical`** adds **`op.thru`** or **`camHelicalThru`** to **`camHelicalDown`** (trace-style thru); **`flip`** small default depth. **`adjustedPassCount`**: **`flip`** and **`gcode`** pinned to **1** pass. Placeholder segment product: **`helicalSegmentScale`**, **`registerSegmentScale`** (axis **`"-"`** vs drilling axis), **`flipSegmentScale`**, **`indexedSegmentScale`**, **`gcodeSegmentScale`**. Empty-**`ops`** implicit Z depth adds **`camHelicalThru`** when **`camHelicalDown`** drives the heuristic.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camFlipInvert`**, **`camHelicalFromStockTop`**, **`camIndexAxis`**, **`camIndexAbs`**, **`camCustomGcode`** defaults.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — helical thru / helical knobs; register axis; indexed degrees; **`camCustomGcode`** lines; flip single pass.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`** (`25` test files); `npx vitest run src/core/cam src/core/slicer` — **`341 passed`** (`205` + `136`).

### CAM placeholder: grip **`laser on` / `laser off`**, **`index`**, laser scripts + **`camLatheSpeed`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationType`**: **`laser on`**, **`laser off`**, **`index`** (grip **`cl-ops.js`** popOp names). **`CamProcessConfig`**: **`camLaserAdaptive`** / **`camLaserAdaptMod`** / **`camLaserFlatten`** / **`camLaserFlatZ`** / **`camLaserZMin`** / **`camLaserZMax`** / power fields / **`camLaserEnable|On|Off|Disable`** (string or string[]); **`camLatheTool`**, **`camLatheSpeed`** (grip **`conf.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver` / `resolveOpDown`**: **`laser on` / `laser off`** same defaults as **`laser`**; **`index`** same as **`indexed`**. **`adjustedPassCount`**: **`laser off`** ⇒ **1** pass. **`laserSegmentScale`**: adaptive / flatten / Z band / script line counts; **`laser off`** down-scales segments. **`indexedSegmentScale`**: **`index`** included. **`effectiveCamMachiningFeed`**: **`camLatheSpeed`**. **`distinctProcessToolCount`**: **`camLatheTool`**.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camRegisterTool`**, laser defaults, **`camLatheTool` / `camLatheSpeed`** aligned with grip-style process JSON.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`index` ≡ `indexed`**; laser adaptive vs off; **`laser off`** vs **`laser on`**; **`camLatheSpeed`** feed cap; empty-**`ops`** tool count includes **`camLatheTool`** (fourth distinct id).
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`lathe`** popOp (grip **`cl-ops.js`**) (done in this batch)

- `clip-apps/src/types/cam.ts` — **`'lathe'`** on **`CamOperationType`**; per-op **`angle`**, **`linear`**, **`offStart`**, **`offEnd`**; **`CamProcessConfig`** **`camLatheSpindle`**, **`camLatheOver`**, **`camLatheAngle`**, **`camLatheLinear`**, **`camLatheOffStart`**, **`camLatheOffEnd`** (alongside existing **`camLatheTool` / `camLatheSpeed`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`resolveOpStepOver`**: **`lathe`** uses **`camLatheOver`** with **`camContourLeave`** / **`op.leave`** (grip maps **`leave`** → **`camContourLeave`**). **`resolveOpDown`**: shallow stock-span fraction vs level/rough fallbacks. **`latheSegmentScale`**: angular step density, **`camLatheLinear`**, offset ends, **`camTolerance`**, contour leave. Wired into placeholder segment product.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camLatheSpindle`**, **`camLatheOver`**, **`camLatheAngle`**, **`camLatheLinear`**, **`camLatheOffStart`**, **`camLatheOffEnd`** defaults aligned with grip **`conf.js`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — per-op **`angle`** segment ordering; **`camContourLeave`** widens effective XY step ⇒ fewer segments.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camZThru`** Z span + **tabs** / **ease-down** + empty-**`ops`** **`camLatheOver`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camEaseAngle`** on **`CamProcessConfig`** (grip **`conf.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`estimateCamPlaceholderSummary`**: raw stock Z span adds positive **`camZThru`** (through-cut allowance). **`tabSegmentScale`** / **`easeSegmentScale`** multiply per-op and empty-**`ops`** segment totals from **`camTabsWidth`/`Height`/`Depth`**, **`camTabsMidline`**, **`camEaseDown`**, **`camEaseAngle`**. Empty-**`ops`** implicit XY step chain includes **`camLatheOver`** after trace-style overs (grip lathe-only process JSON).
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camEaseAngle`** default.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camZThru`** empty-**`ops`** passes; lathe-only implicit step; tabs vs plain rough; ease vs plain.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camContourFilter`** + **`camDepthFirst`** width-first (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camContourFilter`** (`string[]` | `string`) on **`CamProcessConfig`** (grip **`cl-ops.js`** contour + lathe **`filter`** field).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`stringOrStringArrayLineCount`** hoisted for reuse. **`contourSegmentScale`** / **`latheSegmentScale`** multiply when **`camContourFilter`** has non-empty script lines. **`depthFirstSegmentScale`**: **`camDepthFirst === false`** ⇒ **×1.055** on **`rough`**, **`pocket`**, **`outline`**, **`contour`** (grip width-first / lateral linking); applied on per-op totals and empty-**`ops`** implicit rough row.
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camContourFilter`** default **`[]`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — contour filter vs none; rough width-first vs depth-first; empty-**`ops`** **`camDepthFirst`**.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camConventional`** / **`camTrueShadow`** / **`camContourAngle`** + **`camExpertFast`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`roughSegmentScale`**: **`opConventionalMilling`** **×1.035** (per-op **`ov_conv`** overrides **`camConventional`**); **`camTrueShadow`** **×1.05**. **`contourSegmentScale`**: when **`camContourCurves`** and finite **`camContourAngle`** (clamped **45…90°**), shallower wall angle **⇒** denser segments. **`expertSegmentScale`**: **`camExpertFast`** **×0.97** (folded into **`tabEase`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — conventional vs climb rough; **`camTrueShadow`**; contour **48°** vs **88°** with curves; empty-**`ops`** **`camExpertFast`**.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: per-op **`ov_topz`/`ov_botz`**, **`ov_conv`**, trace **`revbone`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`ov_topz`**, **`ov_botz`**, **`ov_conv`**, **`revbone`** (grip **`cl-ops.js`** expand overrides + trace dogbone reverse).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`opConventionalMilling`**: **`op.ov_conv === true`** forces conventional segment bump; **`false`** forces climb; **`undefined`** uses **`camConventional`**. Applied in **`roughSegmentScale`**, **`pocketSegmentScale`**, **`outlineSegmentScale`**, **`traceSegmentScale`**. **`effectiveOpZOverrideSpan`**: **`ov_topz` − `ov_botz`** narrows **`zSpan`** before **`camTraceZTop`/`Bottom`** clip (**`rough`**, **`outline`**, **`trace`**, **`pocket`**). **`traceDogboneScale`**: **`revbone`** **×1.04** (stacked with dogbone).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — narrow Z band passes; pocket **`ov_conv`**; trace **`revbone`**; outline **`ov_conv: false`** vs process conventional.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camStockClipTo`**, **`camStockOn`**, **`camArcEnabled`**, indexed stock fields (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamProcessConfig`**: **`camArcEnabled`**; **`camStockIndexed`**, **`camStockIndexGrid`** (grip **`init-menu.js`**).
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camArcEnabled`**: **`false`**; **`camStockIndexed`**: **`false`**; **`camStockIndexGrid`**: **`true`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`footprintXY`**: **`camStockClipTo`** narrows effective XY to **`min(…, stock box)`** (absolute vs offset stock like **`slice.js`**); **`camStockOn === false`** uses part bbox only for XY and skips **`max(rawDz, camStockZ)`** for Z. **`arcFitSegmentScale`**: when **`camArcEnabled`** and positive **`camArcTolerance`/`camArcResolution`**, bumps segment estimate on **`trace`**, **`outline`**, **`contour`**, **`rough`**, **`pocket`**, **`helical`**, **`level`**, **`lathe`** (folded into **`tabEase`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — clip vs no clip; arcs on contour; **`camStockOn`** Z and XY ignores stock inflation.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: contour **`axis`**, per-op mesh knobs, pocket contour **`camTolerance`**, **`camStockIndexed`** sweep bump (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`tolerance`**, **`flatness`**, **`reduction`** (grip **`cl-ops.js`** contour / pocket contour shared **`camTolerance`** path).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`contourSegmentScale`**: **`op.reduction`/`flatness`/`tolerance`** override process defaults; **`op.axis`** **`X`/`Y`** selects a single wall family vs dual-axis **×1.85** when both **`camContourXOn`/`YOn`**. **`pocketSegmentScale`**: when **`camPocketContour`**, applies **`op.tolerance ?? camTolerance`** segment term. **`latheSegmentScale`**: **`op.tolerance`** override. **`stockIndexedSegmentScale`**: **`camStockIndexed`** **×1.032** on **`rough`**, **`outline`**, **`contour`**, **`pocket`**, **`drill`**, **`helical`**, **`lathe`**, **`trace`** (plus empty-**`ops`** implicit rough **`segments`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — contour axis vs dual wall; contour per-op tolerance; pocket contour tolerance; indexed rough bump.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`init-menu.js`** output / origin / Z-order flags (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camForceZMax`** (restored on **`CamProcessConfig`** alongside **`camFirstZMax`**, **`camInnerFirst`**, **`camToolInit`**, **`camFullEngage`**, **`camOriginCenter`**, **`camOriginOff*`**).
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — grouped defaults: **`camInnerFirst`**, **`camToolInit`**, **`camFirstZMax`**, **`camForceZMax`**, **`camFullEngage`**, origin offsets (deduped trailing **`camForceZMax`** key).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`processOutputExtrasSegmentScale(process)`** on **`tabEase`**: **`camToolInit`**, **`camFullEngage`**, **`camOriginCenter`**, **`camOriginOffX/Y/Z`**. **`zOrderingSegmentScale(op, process)`** on per-op (and empty-**`ops`** rough): **`camForceZMax`**, **`camFirstZMax`**, **`camInnerFirst`** (**`rough`**/**`pocket`** only) for milling op types.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camForceZMax`**; **`camInnerFirst`** pocket; **`camToolInit`**; **`camFullEngage`**; **`camOriginOffX`**.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`outputInvert`**, **`ctOriginCenter`**, **`camZAnchor`**, **`camZClearance`/`Offset`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamProcessConfig`**: **`ctOriginCenter`** (explicit; JSON already had **`ctOriginCenter`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`processOutputExtrasSegmentScale`**: **`outputInvertX`/`Y`** **×1.014** each; **`camOriginCenter` || `ctOriginCenter`** **×1.012**; **`camZClearance`**, **`camZOffset`**. **`zAnchorStockSpanScale`**: non-**`camStockIndexed`** **`camZAnchor`** **`top`/`bottom`** **×1.012** on stock Z span before **`camZThru`** add and global Z clip.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — invert axes; **`ctOriginCenter`** only; **`camZAnchor`** passes; clearance.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: outline **`camOutlineIn`** / **`camOutlineOut`** (op **`inside`/`outside`**) (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: JSDoc on **`inside`**/**`outside`** for outline ↔ process **`camOutlineIn`**/**`camOutlineOut`** (grip **`cl-ops.js`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`outlineSegmentScale`**: **`inside`** without **`outside`** **×1.048** (grip **`op-outline.js`** inner offset filter); both true **×1.02**; resolves effective flags from op then process (default outside **true**).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — per-op inside-only vs outside-only; process **`camOutlineIn`** vs **`camOutlineOut`** without op overrides.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: register **`points`**, axis **`=`**, X/Y **`dwell`/`lift`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`points`** (grip **`regpoints`**: **2** vs **3** slot paths on X/Y).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`registerSegmentScale`**: axis **`=`** grouped with face **`−`** (**0.92**); X/Y **×1.14** when **`points === 3`**; **`camDrillLift`** / **`camDrillDwell`** (or per-op **`lift`/`dwell`**) scale peck-style motion like **`drillSegmentScale`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`=`** vs **`−`** parity; **`points`** 3 vs 2; process **`camDrillLift`/`camDrillDwell`** on register Y.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: laser **`camLaserPower`**, adaptive power span, **`gcode`** per-op, index **`degrees`/`absolute`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`degrees`**, **`absolute`**, **`gcode`** (grip **`index`** / **`gcode`** popOps).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`laserSegmentScale`**: non-adaptive **`camLaserPower`**; adaptive **`camLaserPowerMax` − `Min`** span. **`gcodeSegmentScale`**: **`gcodeTextLineCount`** shared helper; per-op **`gcode`** when set, else **`camCustomGcode`**. **`indexedSegmentScale`**: **`op.degrees ?? camIndexAxis`**; **`op.absolute`** overrides **`camIndexAbs`** when explicitly **`false`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — gcode per-op lines; indexed **`degrees`** / **`absolute`**; laser power and adaptive min/max span.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: flip **`axis`/`camFlipAxis`**, level per-op **`stock`**, **`camStockIndexGrid`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamProcessConfig`**: **`camFlipAxis`**. **`CamOperationInstance`**: **`stock`** (level popOp); **`axis`** JSDoc notes flip ↔ **`camFlipAxis`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`flipSegmentScale`**: **`op.axis ?? camFlipAxis`**; **Y** slight bump vs **X**; non-**X**/**Y** **×0.965** (grip skips **`rotate`**). **`levelSegmentScale`**: **`op.stock`** overrides **`camLevelStock`** when **`stock === false`**. **`stockIndexedSegmentScale`**: **`camStockIndexGrid`** **×1.012** on top of indexed base.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — level **`stock`** on/off vs process; flip **Y** vs **X** and **`-`** vs **X**; indexed rough grid on/off.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: contour **`camContourIn`**, pocket per-op **`contour`/`engrave`/`outline`**, **`camRoughTop`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`inside`** JSDoc (contour vs outline vs rough); **`contour`**, **`engrave`**, **`outline`** on **`CamOperationInstance`** (pocket popOp); **`camContourIn`** / **`camRoughTop`** JSDoc on **`CamProcessConfig`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`contourSegmentScale`**: **`op.inside`** with **`camContourIn`** (grip **`topo3`** inside clip). **`pocketSegmentScale`**: effective **`pContour`/`pEngrave`/`pOutline`** from per-op flags or process. **`roughSegmentScale`**: **`camRoughTop`** **×1.042**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — contour inside on/off + **`inside: false`** override; pocket **`contour: true`** vs process off; rough top on/off.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: grip **`conf.js`** rough/outline/drill master toggles + **`camFlipOther`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camRoughOn`**, **`camOutlineOn`**, **`camDrillingOn`**, **`camFlipOther`** JSDoc (grip **`roughingOn`** / **`finishingOn`** / **`drillingOn`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`roughSegmentScale`**: **`camRoughOn === false`** **×0.94**. **`outlineSegmentScale`**: **`camOutlineOn === false`** **×0.94**. **`drillSegmentScale`**: **`camDrillingOn === false`** **×0.94**. **`flipSegmentScale`**: non-empty **`camFlipOther`** capped length term.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — rough / outline / drill toggles; flip other string.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: pocket **`expand`** (segment scale), trace **`lines`**, rough **`camRoughIn`**, drill **`mark`/`dwell`/`lift`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`expand`**, **`lines`**, **`dwell`**, **`lift`**, **`mark`**; **`expand`** JSDoc: per-op expand drives **`pocketSegmentScale`**; process **`camPocketExpand`** still feeds default step-over in **`resolveOpStepOver`** (not folded into step when **`op.step`** is set).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`pocketSegmentScale`**: bounded multiplier from **`op.expand ?? process.camPocketExpand`**. **`traceSegmentScale`**: **`process.camTraceLines`** or **`op.lines`**. **`roughSegmentScale`**: **`process.camRoughIn === false`** **×1.038**. **`drillSegmentScale`**: **`mark`** vs **`camDrillMark`** (marking short-circuits thru/peck terms); **`dwell`/`lift`** when not marking.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — pocket expand vs baseline; trace lines; **`camRoughIn`**; drill mark vs peck / **`camDrillMark`**.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camTraceBottom`**, helical **`offset`/`clockwise`**, **`ctOriginBounds`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`ctOriginBounds`**, **`ctOriginOffX`**, **`ctOriginOffY`** on **`CamProcessConfig`** (grip **`platform.js`** / device **`ctOrigin*`**).
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`ctOriginBounds`**: **`false`**; **`ctOriginOffX`/`Y`**: **`0`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`traceSegmentScale`**: **`camTraceBottom`** **×1.055**. **`helicalSegmentScale`**: non-**`auto`** **`camHelicalOffset`** **×1.03**; **`camHelicalClockwise === false`** **×1.015**. **`processOutputExtrasSegmentScale`**: **`ctOriginBounds`** base **×1.008** + offset magnitude term.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — trace bottom; helical **inside** + CCW vs **auto** + CW; bounds + **`ctOriginOffX`**.
- verification
  - `npx vitest run src/core/cam` — **`205 passed`**; **`src/core/cam src/core/slicer`** — **`341 passed`**.

### CAM placeholder: **`camOriginTop`**, contour per-op **`bottom`** / **`bridging`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamProcessConfig`**: **`camOriginTop`** JSDoc (grip **`cl-origin.js`** / export). **`CamOperationInstance`**: **`bottom`**, **`bridging`** (grip contour popOp → **`camContourBottom`** / **`camContourBridge`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`processOutputExtrasSegmentScale`**: **`camOriginTop === true`** **×1.01**. **`contourSegmentScale`**: mesh bottom pass from **`op.bottom`** with process fallback; bridge width from **`op.bridging ?? camContourBridge`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camOriginTop`** on rough; contour **`bottom: true`** when process bottom off; per-op **`bridging`** when process bridge zero.
- verification
  - `npx vitest run src/core/cam` — **`208 passed`**; **`src/core/cam src/core/slicer`** — **`344 passed`**.

### CAM placeholder: per-op **`cl-ops.js`** fields (**`wide`**/**`dogbones`**/**`omitvoid`**/**`omitthru`**, pocket **`smooth`**/**`refine`**, drill **`precision`**/**`fromTop`**, flip **`invert`**) (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`wide`**, **`dogbones`**, **`omitvoid`**, **`omitthru`**, **`smooth`**, **`refine`**, **`precision`**, **`fromTop`**, **`invert`** (grip popOp keys saved to process on bind; placeholder reads per-op first).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`outlineSegmentScale`**: per-op **`wide`** / **`dogbones`** / **`omitvoid`** / **`omitthru`** with process fallbacks. **`roughSegmentScale`**: **`op.omitthru`** with **`camRoughOmitThru`**. **`pocketSegmentScale`**: **`op.smooth`** / **`op.refine`**. **`drillSegmentScale`**: **`op.precision`**, **`op.fromTop`** with process fallbacks. **`flipSegmentScale`**: **`op.invert`** with **`camFlipInvert`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — outline / rough / drill / pocket / flip per-op override cases.
- verification
  - `npx vitest run src/core/cam` — **`214 passed`**; **`src/core/cam src/core/slicer`** — **`350 passed`**.

### CAM placeholder: helical full per-op merge + register **`offset`**/**`thru`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`finish`**, **`entry`**, **`entryOffset`**, **`reverse`**, **`clockwise`**, **`startAng`**, **`forceStartAng`**, **`offOver`**; **`offset`** widened to **`string | number`** (trace / helical / register).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`helicalSegmentScale`**: per-op fields merged with **`camHelical*`** (helical **`offset`** preset uses string `op.offset` only so register numeric `offset` does not affect helical). **`registerSegmentScale`**: **`op.offset`**/**`op.thru`** with **`camRegisterOffset`**/**`camRegisterThru`**. JSDoc above **`helicalSegmentScale`** avoids `**/` (oxc parse).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — helical per-op combo vs flat process; register per-op offset + thru.
- verification
  - `npx vitest run src/core/cam` — **`216 passed`**; **`src/core/cam src/core/slicer`** — **`352 passed`**.

### CAM placeholder: register face **`feed`** + laser **`laser on`** per-op (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`feed`** (`camRegisterSpeed`); laser keys **`adapt`**, **`adaptrp`**, **`flat`**, **`flatz`**, **`minp`**, **`maxp`**, **`minz`**, **`maxz`**, **`power`** (grip **`cl-ops.js`** laser popOp).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`registerSegmentScale`**: axis **`-`**/**`=`** applies **`op.feed ?? camRegisterSpeed`**. **`laserSegmentScale`**: per-op laser fields merged with **`camLaser*`** (same branching as process-only path).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — register **`-`** + **`feed`**; laser per-op **`adapt`** + **`power`** vs zero baseline.
- verification
  - `npx vitest run src/core/cam` — **`218 passed`**; **`src/core/cam src/core/slicer`** — **`354 passed`**.

### CAM placeholder: rough **`voids`**/**`flats`** per-op, pocket **`expand`** + helical **`offOver`** in **`resolveOpStepOver`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`voids`** / **`flats`** JSDoc (grip rough popOp → **`camRoughVoid`** / **`camRoughFlat`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`roughSegmentScale`**: **`op.voids`** / **`op.flats`** with process fallbacks. **`resolveOpStepOver`**: pocket **`op.expand ?? camPocketExpand`**; helical **`op.offOver ?? camHelicalOffsetOverride`**. **`roughSegmentScale`** file comment reworded to avoid `**/` (oxc).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — rough per-op voids+flats; pocket expand without **`op.step`**; helical **`offOver`** XY step; helical combo test pins **`step`** so **`offOver`** only affects segment scale.
- verification
  - `npx vitest run src/core/cam` — **`221 passed`**; **`src/core/cam src/core/slicer`** — **`357 passed`**.

### CAM placeholder: level **`inset`** segment scale + trace per-op **`traceBottom`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`CamOperationInstance`**: **`traceBottom`** (optional per-op override for process **`camTraceBottom`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`levelSegmentScale`**: positive **`op.inset ?? camLevelInset`** multiplier (with stock mode unchanged). **`traceSegmentScale`**: **`op.traceBottom`** merged with **`camTraceBottom`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — level inset with pinned **`op.step`**; trace **`traceBottom: true`** when process off.
- verification
  - `npx vitest run src/core/cam` — **`223 passed`**; **`src/core/cam src/core/slicer`** — **`359 passed`**.

### CAM placeholder: stock **`camStockClipTo`** / **`camStockOffset`** segment scale (done in this batch)

- `clip-apps/src/types/cam.ts` — JSDoc on **`camStockClipTo`** / **`camStockOffset`** (grip stock UI; **`footprintXY`** already uses them for clip box sizing).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`stockOptionsSegmentScale`**: when stock is on, **`camStockClipTo`** and **`camStockOffset`** apply small multipliers on the shared **`tabEase`** path (extra boundary motion beyond footprint sizing); no effect when **`camStockOn === false`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — clip bump with oversized stock (footprint unchanged vs no clip); offset bump vs plain; offset ignored when stock off.
- verification
  - `npx vitest run src/core/cam` — **`226 passed`**; **`src/core/cam src/core/slicer`** — **`362 passed`**.

### CAM session apply: merge + **`stripLegacyCamProcessKeys`** on workspace `process` (done in this batch)

- `clip-apps/src/core/cam/sessionApplyExecutor.ts` — after **`withLegacyCamProcessAliases`**, merge with existing **`state.process`**, run **`stripLegacyCamProcessKeys`**, then replace reactive object keys (avoids **`drillDown`** + **`camDrillDown`** sticking on the live form model).
- `clip-apps/src/core/cam/sessionApplyExecutor.spec.ts` — workspace had duplicate legacy keys; apply canonical-only incoming ⇒ **`drillDown`** removed.
- verification
  - `npx vitest run src/core/cam` — **`237 passed`**; **`+ src/stores/useCamStore.spec.ts`** — **`246 passed`**; **`+ src/core/slicer`** — **`382 passed`**.

### CAM export: **`stripLegacyCamProcessKeys`** (grip-style JSON) (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`stripLegacyCamProcessKeys`**: shallow copy; drops each legacy alias key when the canonical key is also present (avoids **`drillDown`** + **`camDrillDown`** in exported JSON). Legacy-only objects unchanged.
- `clip-apps/src/stores/useCamStore.ts` — **`exportProfileObject`** uses **`stripLegacyCamProcessKeys`** after **`clonePlain`** (defense in depth vs manually assigned duplicate keys).
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`onSimulateCamJob`** and **export profile with local ops** strip before **`simulateCamJob`** / JSON download so recent-run snapshots and exports match kiri-cam-process style.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`stripLegacyCamProcessKeys`** unit tests.
- `clip-apps/src/stores/useCamStore.spec.ts` — export omits **`drillDown`** when **`camDrillDown`** exists; in-memory process unchanged.
- verification
  - `npx vitest run src/core/cam` — **`237 passed`**; **`src/stores/useCamStore.spec.ts` + `src/core/cam`** — **`246 passed`**; **`+ src/core/slicer`** — **`382 passed`**.

### CAM session preview: normalized process diff + exported alias map (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`LEGACY_CAM_PROCESS_FIELD_ALIASES`** exported (single source for legacy key names).
- `clip-apps/src/core/cam/sessionApplyPreview.ts` — **`buildSessionApplyPreview`** for **`process`**: both sides run **`withLegacyCamProcessAliases`**, drop **`ops`**, and remove legacy alias keys so **`drillDown`** vs **`camDrillDown`** does not false-positive the confirm diff.
- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts` — alias-equivalent process ⇒ **`changeCount === 0`**.
- verification
  - `npx vitest run src/core/cam` — **`233 passed`**; **`src/stores/useCamStore.spec.ts`** + **`src/core/cam`** — **`241 passed`**; **`+ src/core/slicer`** — **`377 passed`**.

### CAM session apply: **`withLegacyCamProcessAliases`** on process field (done in this batch)

- `clip-apps/src/core/cam/sessionApplyExecutor.ts` — applying **`process`** from a session / target profile runs **`withLegacyCamProcessAliases`** before **`Object.assign`** into workspace state (ops still applied separately).
- `clip-apps/src/core/cam/sessionApplyExecutor.spec.ts` — **`drillDown`** ⇒ **`camDrillDown`** on merged state.
- verification
  - `npx vitest run src/core/cam/sessionApplyExecutor.spec.ts src/core/cam` — **`232 passed`**; with **`src/stores/useCamStore.spec.ts`** — **`240 passed`**; **`+ src/core/slicer`** — **`376 passed`**.

### CAM Pinia store: **`withLegacyCamProcessAliases`** on profile apply / upsert (done in this batch)

- `clip-apps/src/stores/useCamStore.ts` — **`applyProfile`** and **`upsertProfile`** run **`withLegacyCamProcessAliases`** after **`clonePlain`** so imported / selected profiles get canonical fields in the editor and in **`profiles[]`** without waiting for a CAM run.
- `clip-apps/src/stores/useCamStore.spec.ts` — **`drillDown`** import ⇒ **`camDrillDown`** on active process.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`239 passed`**; with **`src/core/slicer`** — **`375 passed`**.

### CAM engine: **`runCamJob`** applies **`withLegacyCamProcessAliases`** before Kiri settings (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`withLegacyCamProcessAliases`** is **exported** for other import/normalize call sites.
- `clip-apps/src/core/cam/camEngine.ts` — **`runCamJob`** builds **`profileForKiri`** with normalized **`process`** so **`cam_slice`** / **`settings.process`** sees canonical fields when the UI profile still carries legacy keys.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`drillDown`** vs **`camDrillDown`** parity on drill placeholder rows.
- verification
  - `npx vitest run src/core/cam` — **`231 passed`**; **`src/core/cam src/core/slicer`** — **`367 passed`**.

### CAM placeholder: **`withLegacyCamProcessAliases`** (grip **`conf.js`** `renamed`) (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`LEGACY_CAM_PROCESS_FIELD_ALIASES`** + **`withLegacyCamProcessAliases`** (exported): copies legacy keys into canonical **`CamProcessConfig`** only when the canonical field is **`undefined`** (explicit **`false`/`0`** on canonical keys unchanged). Applied at **`estimateCamPlaceholderSummary`** and **`enrichCamJobSummaryFromPostSliceWidget`** entry. **`outlineSegmentScale`** reads **`camOutlineWide`** only; **`camWideCutout`** is folded by the normalizer. **`runCamJob`** also normalizes before legacy slice (**`camEngine.ts`**).
- `clip-apps/src/types/cam.ts` — **`camWideCutout`** JSDoc points at the normalizer.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camWideCutout`**-only wide outline matches canonical; **`finishingOn`**/**`roughingOn`** match **`camOutlineOn`**/**`camRoughOn`**.
- verification
  - `npx vitest run src/core/cam` — **`230 passed`**; **`src/core/cam src/core/slicer`** — **`366 passed`**.

### CAM placeholder: legacy **`camWideCutout`** alias for **`camOutlineWide`** (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camWideCutout`** on **`CamProcessConfig`** (grip **`conf.js`** `renamed` import map).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`outlineSegmentScale`**: wide shells when **`camOutlineWide`** or **`camWideCutout`** is true (per-op **`wide`** still wins).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — alias-only process matches canonical **`camOutlineWide`** segment totals.
- verification
  - `npx vitest run src/core/cam` — **`229 passed`**; **`src/core/cam src/core/slicer`** — **`365 passed`**.

### CAM placeholder: pocket **`camPocketZTop`** / **`camPocketZBottom`** Z pass span (done in this batch)

- `clip-apps/src/types/cam.ts` — **`camPocketZTop`**, **`camPocketZBottom`** on **`CamProcessConfig`** (grip **`conf.js`** / legacy process defaults).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`effectiveZSpanForPasses`**: pocket ops use the same **`min(safeDz, top − bottom)`** band rule as trace when both Z fields are finite and **`top > bottom`** (after **`ov_topz`/`ov_botz`** via **`effectiveOpZOverrideSpan`**).
- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — **`camPocketZTop`** / **`camPocketZBottom`** defaults **`0`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — banded pocket ⇒ fewer **`estimatedPasses`** than full stock span.
- verification
  - `npx vitest run src/core/cam` — **`228 passed`**; **`src/core/cam src/core/slicer`** — **`364 passed`**.

### CAM placeholder: rough per-op **`inside`** merged with **`camRoughIn`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`roughSegmentScale`**: effective inside roughing follows **`op.inside`** when set, else process **`camRoughIn`** (default-on when omitted, matching **`kiri-cam-process.json`**); non-inside style keeps the existing **×1.038** segment bump.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`camRoughIn: true`** on process but **`inside: false`** on the rough op ⇒ higher segments than **`inside: true`**.
- verification
  - `npx vitest run src/core/cam` — **`227 passed`**; **`src/core/cam src/core/slicer`** — **`363 passed`**.

### Slicer `previewEstimate`: Z advance from actual preview Δz (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.ts` — layer-to-layer **Z travel mm** is the **sum of positive Δz** on sorted preview layers (matches adaptive **`firstSliceHeight`** / uneven spacing); if all Δz collapse to ~0, falls back to **`(n-1) * sliceHeight`**.
- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — wider first-layer band isolates **more total Δz** ⇒ higher **`timeSec.final`**.
- verification
  - `npx vitest run src/core/cam/camJobSummaryBridge.spec.ts src/core/slicer/previewEstimate.spec.ts`
  - all tests passed (`24 passed` in this environment).

### CAM Pinia + **runCamJob**: **`stripLegacyCamProcessKeys`** after legacy alias merge (done in this batch)

- `clip-apps/src/stores/useCamStore.ts` — **`applyProfile`** / **`upsertProfile`** assign **`stripLegacyCamProcessKeys(withLegacyCamProcessAliases(clonePlain(...)))`** so active editor state and **`profiles[]`** drop duplicate legacy keys once canonical fields exist (aligned with session apply + export).
- `clip-apps/src/stores/useCamStore.ts` — **`cloneFromCurrent`** passes **`clonePlain`** payloads into **`upsertProfile`** so normalization stays centralized.
- `clip-apps/src/core/cam/camEngine.ts` — **`runCamJob`** uses **`canonicalizeCamProcessConfig(profile.process)`** before **`profileForKiri`** / placeholder summaries (all **`simulateCamJob`** callers).
- `clip-apps/src/stores/useCamStore.spec.ts` — legacy **`drillDown`** import ⇒ **`camDrillDown`** set and **`drillDown`** absent on active process and saved profile row.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`246 passed`**.

### CAM session bundle export: canonical-only **targetRun.profile.process** (done in this batch)

- `clip-apps/src/core/cam/sessionBundleExport.ts` — **`normalizeTargetRunProfileForSessionExport`**: deep-clone profile, normalize **`process`** via **`canonicalizeCamProcessConfig`** (see unified helper batch); **`createCamSessionBundleExportArtifact`** runs it on **`targetRun.profile`** before JSON. JSDoc: same helper for **import preview** (see **`CamWorkspace`**).
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`onImportSessionBundlePreview`**: after parse, assigns **`normalizeTargetRunProfileForSessionExport(targetRun.profile)`** into preview state so legacy-only / duplicate-alias bundles match export shape before diff / apply.
- `clip-apps/src/core/cam/sessionBundleExport.spec.ts` — normalizer + full bundle JSON omit **`drillDown`** when **`camDrillDown`** is set; legacy-only **`drillDown`** ⇒ canonical **`camDrillDown`** without legacy key.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`** (includes **`canonicalizeCamProcessConfig`** + session preview specs).

### CAM **recentRuns** localStorage: canonical-only **`profile.process`** (done in this batch)

- `clip-apps/src/stores/useCamStore.ts` — **`addRecentRun`** / **`loadRecentRuns`** normalize **`profile.process`** with **`canonicalizeCamProcessConfig`** (see unified helper batch); **`loadRecentRuns`** calls **`saveRecentRuns`** when the list is non-empty so storage is rewritten canonical-only.
- `clip-apps/src/stores/useCamStore.spec.ts` — **`localStorage`** cleared in **`beforeEach`**; tests for **`addRecentRun`** persistence and **`loadRecentRuns`** migration from legacy-only **`drillDown`**.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`canonicalizeCamProcessConfig`**: single pipeline (**clone + legacy + strip**) (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`canonicalizeCamProcessConfig`**: **`stripLegacyCamProcessKeys(withLegacyCamProcessAliases(clonePlain(p)))`**; **`clonePlain`** import colocated with bridge exports.
- `clip-apps/src/stores/useCamStore.ts` — **`applyProfile`** / **`upsertProfile`** / **`exportProfileObject`** / **`recentRuns`** paths use **`canonicalizeCamProcessConfig`** (removed local **`normalizeSnapshotProcess`**).
- `clip-apps/src/core/cam/camEngine.ts` — **`runCamJob`** uses **`canonicalizeCamProcessConfig(profile.process)`**.
- `clip-apps/src/core/cam/sessionBundleExport.ts` — **`normalizeTargetRunProfileForSessionExport`** delegates **`process`** to **`canonicalizeCamProcessConfig`**.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`onSimulateCamJob`** / **`onExportProfileWithLocalOps`** use **`canonicalizeCamProcessConfig`** (fixes legacy-only keys vs prior **`stripLegacyCamProcessKeys`**-only path).
- `clip-apps/src/core/cam/sessionApplyExecutor.ts` — incoming **`process`** field uses **`canonicalizeCamProcessConfig`** before merge + **`stripLegacyCamProcessKeys`** on merged state.
- `clip-apps/src/core/cam/sessionApplyPreview.ts` — **`normalizedProcessRecordForPreview`** strips **`ops`** then **`canonicalizeCamProcessConfig`** (replaces **`withLegacy`** + manual legacy key deletion loop).
- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts` — reverse alias pair: workspace **`drillDown`**-only vs bundle **`camDrillDown`** ⇒ **`changeCount === 0`**.
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — **`canonicalizeCamProcessConfig`** deep clone + legacy-only + duplicate-key cases.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM recent-run snapshot diff: canonical **`process`** + expanded **`DiffKey`** / undo (**`camZTop`** … **`camExpertFast`**) (done in this batch)

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts` — **`canonicalizeCamProcessConfig`** on both sides; diff includes **`camOriginOffX`**, **`camOriginOffY`**, **`camOriginOffZ`**, **`camExpertFast`** plus **`camZTop`** … **`camDepthFirst`** / stock / Z / drill / tolerance / conventional / stock-on / **ops** (see prior batch bullets for the full set).
- `clip-apps/src/core/cam/sessionDiffApply.ts` — **`DiffKey`** + **`applyDiffKeyToState`** for **`camOriginOff*`** and **`camExpertFast`**.
- `clip-apps/src/core/cam/riskRules.ts` — **`camOriginOff*`** → **medium**; **`camExpertFast`** → **low**.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`ApplyStateSnapshot.processPatch`** + **`captureApplyState`** / **`applyStateSnapshot`** for undo on the new fields.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` / **`sessionDiffApply.spec.ts`** / **`riskRules.spec.ts`** — regression coverage.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM recent-run snapshot diff: arc / Z-order / controller origin (**`camArcEnabled`**, **`camFirstZMax`**, **`ctOrigin*`**) (done in this batch)

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts` — diff items for **`camArcEnabled`**, **`camFirstZMax`**, **`ctOriginCenter`**, **`ctOriginBounds`**, **`ctOriginOffX`**, **`ctOriginOffY`** (after **`canonicalizeCamProcessConfig`**).
- `clip-apps/src/core/cam/sessionDiffApply.ts` — **`DiffKey`** + **`applyDiffKeyToState`** for the same keys.
- `clip-apps/src/core/cam/riskRules.ts` — **`camArcEnabled`** → **low**; **`camFirstZMax`** + **`ctOrigin*`** → **medium**.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`ApplyStateSnapshot.processPatch`** + **`captureApplyState`** / **`applyStateSnapshot`** for undo parity.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` / **`sessionDiffApply.spec.ts`** / **`riskRules.spec.ts`** — regression coverage.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM recent-run snapshot diff: output mirror + arc tuning (**`outputInvert*`**, **`camArcTolerance`**, **`camArcResolution`**) (done in this batch)

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts` — diff items for **`outputInvertX`**, **`outputInvertY`**, **`camArcTolerance`**, **`camArcResolution`** (after **`canonicalizeCamProcessConfig`**).
- `clip-apps/src/core/cam/sessionDiffApply.ts` — **`DiffKey`** + **`applyDiffKeyToState`** for the same keys.
- `clip-apps/src/core/cam/riskRules.ts` — **`outputInvert*`** and **`camArcTolerance`** / **`camArcResolution`** → **medium**.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`ApplyStateSnapshot.processPatch`** + **`captureApplyState`** / **`applyStateSnapshot`** for undo parity.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` / **`sessionDiffApply.spec.ts`** / **`riskRules.spec.ts`** — regression coverage.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM recent-run snapshot: **100% typed `CamProcessConfig` field surface** (generic diff + apply + `processFull` undo) (done in this batch)

- `clip-apps/src/core/cam/sessionSnapshotDiff.ts` — after **`canonicalizeCamProcessConfig`**, union of keys on both sides (excluding **`ops`**, **`deviceName`**); field equality via **`camProcessFieldsEqual`** (numeric ε, objects/arrays via **`stableJsonEqual`**); long object values truncated in the diff table.
- `clip-apps/src/core/cam/sessionDiffApply.ts` — **`DiffKey`** is any field name; **`applyDiffKeyToState`**: **`deviceName`** / **`ops`** unchanged; other keys copy from snapshot or **delete** when snapshot omits the key.
- `clip-apps/src/apps/cam/CamWorkspace.vue` — **`ApplyStateSnapshot`**: **`processFull`** (**`clonePlain`** of active process with **`ops` stripped**) + **`localOps`** so undo restores every process scalar/object field the UI had before apply.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` / **`sessionDiffApply.spec.ts`** — **`camFlatness`** regression for the generic path.
- **Scope:** **process** snapshot / single-field apply / undo is exhaustive for typed config keys; **does not** set the CAM **scoreboard row** to **100%** (placeholder **`simulateCamJob`**, grip G-code fixture, per-op legacy stats, etc.).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM session apply preview vs snapshot diff: **`camProcessFieldsEqual`** (done in this batch)

- `clip-apps/src/core/cam/camProcessFieldsEqual.ts` — shared **`camProcessFieldsEqual`** (numeric ε **`1e-9`**, **`stableJsonEqual`** for objects/arrays, key-order invariant for nested records).
- `clip-apps/src/core/cam/sessionDiffDetector.ts` — **`countChangedFields`** / **`listChangedFieldKeys`** use **`camProcessFieldsEqual`** so **`buildSessionApplyPreview`** process counts match recent-run snapshot semantics for floats.
- `clip-apps/src/core/cam/sessionSnapshotDiff.ts` — generic process sweep delegates to the same helper.
- `clip-apps/src/core/cam/camProcessFieldsEqual.spec.ts` / **`sessionDiffDetector.spec.ts`** — ε + nested-order coverage.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`canonicalizeCamProcessConfig`**: grip **`cmaPocket*`** typo → **`camPocket*`** (done in this batch)

- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — **`LEGACY_CAM_PROCESS_FIELD_ALIASES`**: **`cmaPocketOutline`** → **`camPocketOutline`**, **`cmaPocketRefine`** → **`camPocketRefine`** (aligns **`Makera.Carvera.json`** / defaults JSON with bridge **`cmaPocket*`** reads).
- `clip-apps/src/core/cam/camJobSummaryBridge.spec.ts` — legacy-only merge + explicit **`camPocketOutline`** wins over conflicting **`cmaPocketOutline`**.
- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts` — preview **`changeCount === 0`** when bundle has **`cmaPocket*`** and workspace has **`camPocket*`**.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` — no spurious diff for **`cmaPocket*`**-only snapshot vs **`camPocket*`** current.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM defaults + **`riskRules`**: stock envelope + **`camFlatness`** (done in this batch)

- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — remove duplicate **`camFlatness`** key; single value **`0`** (matches **`grip/.../cli/kiri-cam-process.json`**).
- `clip-apps/src/core/cam/riskRules.ts` — **`camStockX`** / **`camStockY`** / **`camStockZ`** → **medium** (stock envelope affects machining envelope).
- `clip-apps/src/core/cam/sessionDiffPreview.ts` — tie-break **`buildChangedKeyDiffLines`** sort with **`localeCompare`** when risk weights tie (deterministic preview order).
- `clip-apps/src/core/cam/riskRules.spec.ts` / **`sessionDiffPreview.spec.ts`** — updated expectations.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM default process JSON + **`useCamStore`**: canonical pocket defaults (done in this batch)

- `clip-apps/src/core/cam/defaults/kiri-cam-process.json` — drop on-disk **`cmaPocket*`** keys; set **`camPocketRefine: 20`** to match grip CLI effective defaults (was **`0`** + typo **`cmaPocketRefine: 20`** shadowed by strip rules).
- `clip-apps/src/stores/useCamStore.ts` — **`sampleProcess`** = **`canonicalizeCamProcessConfig(clonePlain(defaultProcessJson))`** so **`loadSample`** **`profiles[]`** shape matches export / session bundle conventions without waiting for **`applyProfile`**.
- `clip-apps/src/stores/useCamStore.spec.ts` — assert **`loadSample`** profile has no **`cmaPocket*`** keys and **`camPocketRefine === 20`**.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`riskRules`**: **`camLaser*`** (done in this batch)

- `clip-apps/src/core/cam/riskRules.ts` — **`camLaser*`** prefix → **medium** (feed / power / adaptive laser settings affect marking safety).
- `clip-apps/src/core/cam/riskRules.spec.ts` — coverage for **`camLaserSpeed`** / **`camLaserPower`** / **`camLaserAdaptive`**.
- `clip-apps/src/stores/useCamStore.spec.ts` — **`loadRunSnapshot`** + legacy **`drillDown`** ⇒ **`camDrillDown`** on active **`process`** and **`profiles[]`** (canonical path).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`useCamStore.importProfile`** + **`riskRules`**: lathe/helical (done in this batch)

- `clip-apps/src/stores/useCamStore.ts` — **`importProfile`**: after **`upsertProfile`**, **`applyProfile`** runs on the **`profiles[]`** snapshot so active **`process`** matches the canonical row (no stale legacy keys on a caller-held **`profile`** object).
- `clip-apps/src/stores/useCamStore.ts` — **`loadRunSnapshot`** again passes **`clonePlain(process)`**; canonicalization is centralized in **`upsertProfile`** / **`applyProfile`**.
- `clip-apps/src/core/cam/riskRules.ts` — **`camLathe*`** / **`camHelical*`** prefixes → **medium**.
- `clip-apps/src/core/cam/riskRules.spec.ts` / **`useCamStore.spec.ts`** — regression coverage (**`importProfile`** canonical alignment + lathe/helical risk).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`riskRules`**: **`camRegister*`** + **`camPocket*`** → medium (done in this batch)

- `clip-apps/src/core/cam/riskRules.ts` — register / touch-off and pocket process keys affect probing and cavity motion; prefix rules sit with other medium CAM families (**`camLaser*`** … **`camHelical*`**).
- `clip-apps/src/core/cam/riskRules.spec.ts` — **`camRegisterThru`**, **`camRegisterOffset`**, **`camPocketDown`**, **`camPocketRefine`**.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`292 passed`**.

### CAM **`riskRules`**: **`camRough*`** / **`camOutline*`** / **`camTrace*`** / **`camContour*`** / **`camDrill*`** → medium (done in this batch)

- `clip-apps/src/core/cam/riskRules.ts` — roughing, outline, trace, contour, and drilling parameter keys align with **`kiri-cam-process.json`** surface; **`camDrillDown`** is covered by **`camDrill*`** (removed redundant exact match).
- `clip-apps/src/core/cam/riskRules.spec.ts` — representative keys per family + unknown-key case uses a non-**`cam*`** field (**`fixtureTag`**).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`293 passed`**.

### CAM **`riskRules`**: **`camLevel*`** / **`camFlip*`** / **`camIndex*`** / **`camTabs*`** / **`camEase*`**, stock index + misc process keys, **`camCustomGcode`** high (done in this batch)

- `clip-apps/src/core/cam/riskRules.ts` — aligns remaining **`kiri-cam-process.json`**-style keys used by the bridge (**`camLevelInset`** etc.): face-level / flip / indexer / tabs / ease-down families → **medium**; **`camStockIndexed`** / **`camStockIndexGrid`**; **`camInnerFirst`**, **`camToolInit`**, **`camForceZMax`**, **`camFullEngage`**, **`camFlatness`**; **`camCustomGcode`** → **high** (injected output).
- `clip-apps/src/core/cam/riskRules.spec.ts` — **`camDrillingOn`** under **`camDrill*`**; new coverage for the families above + **`camCustomGcode`**.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`295 passed`**.

### CAM **`riskRules`**: **`camTrueShadow`** medium + default **`kiri-cam-process.json`** **`cam*`** risk contract (done in this batch)

- `clip-apps/src/core/cam/riskRules.ts` — **`camTrueShadow`** → **medium** (last default **`cam*`** that previously fell through to **low** besides intentional **`camArcEnabled`** / **`camExpertFast`**).
- `clip-apps/src/core/cam/riskRules.spec.ts` — import **`./defaults/kiri-cam-process.json`**; **`it`** loops **`cam*`** keys and asserts **non-low** except **`camArcEnabled`** / **`camExpertFast`** (fails if a new default field ships without a **`riskRules`** update).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`296 passed`**.

### CAM **`LEGACY_CAM_PROCESS_FIELD_ALIASES`** ↔ **`conf.js`** + **`sessionSnapshotDiff`** legacy rows (done in this batch)

- `clip-apps/src/core/cam/camLegacyRenamedParity.spec.ts` — reads **`legacy/kiri/core/conf.js`**, parses **`const renamed`**, asserts each entry matches **`LEGACY_CAM_PROCESS_FIELD_ALIASES`** and that only **`cmaPocketOutline`** / **`cmaPocketRefine`** are extra.
- `clip-apps/src/core/cam/sessionSnapshotDiff.spec.ts` — **`roughingDown`**/**`roughingSpeed`**, **`finishingSpeed`**/**`finishingOver`**, **`camWideCutout`**, **`drillTool`**/**`drillDwell`** vs canonical **`cam*`** (no false positives after **`canonicalizeCamProcessConfig`**).
- `clip-apps/src/core/cam/camJobSummaryBridge.ts` — doc comment points at the parity spec.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`302 passed`**.

### CAM **`sessionApplyPreview`** + **`sessionDiffApply`** regression (done in this batch)

- `clip-apps/src/core/cam/sessionApplyPreview.spec.ts` — **`roughingDown`**/**`camRoughDown`**, **`finishingSpeed`**/**`camOutlineSpeed`**, **`outputClockwise`**/**`camConventional`** show **zero** process **`changeCount`** after **`canonicalizeCamProcessConfig`** (same story as **`sessionSnapshotDiff`**).
- `clip-apps/src/core/cam/sessionApplyPreview.ts` — doc: normalized preview pipeline matches **`sessionSnapshotDiff`**.
- `clip-apps/src/core/cam/sessionDiffApply.spec.ts` — source omits key ⇒ **delete** on active **`process`**; array/object values are **`clonePlain`**’d (**`camContourFilter`**).
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`307 passed`**.

### CAM **`sessionApplyExecutor`** legacy merge + **`localOps`** contract (done in this batch)

- `clip-apps/src/core/cam/sessionApplyExecutor.spec.ts` — **`cmaPocket*`** → **`camPocket*`** strip; **`roughingDown`** → **`camRoughDown`**; **`localOps`** **`null`** when snapshot **`process`** has no **`ops`** key; unchanged when snapshot includes **`ops`** (including **`[]`**).
- `clip-apps/src/core/cam/sessionApplyExecutor.ts` — one-line comment for **`!snapshotOps`** **`localOps`** reset.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`311 passed`**.

### CAM **`sessionHistory`** / **`sessionPreviewSettings`** / **`sessionDiffLog`** regression (done in this batch)

- `clip-apps/src/core/cam/sessionHistory.spec.ts` — **`pushUndoAndClearRedo`** **`maxHistory`** trim; empty undo/redo pop no-ops; **`current === null`** skips pushing onto the opposite stack; symmetric **`maxHistory`** trim on undo/redo pop.
- `clip-apps/src/core/cam/sessionPreviewSettings.spec.ts` — **`resolveSessionPreviewSettingsPayload`** accepts missing **`schemaVersion`** (**`Number.isFinite`** false path).
- `clip-apps/src/core/cam/sessionDiffLog.spec.ts` — **`createDiffLogExportArtifact`** with **`trace`** omitted ⇒ **`TRACE_NONE_VALUE`** label/fingerprint.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`320 passed`**.

### CAM **`camLegacyRenamedParity`** (no **`new Function`**) + **`camProcessFieldsEqual`** specs (done in this batch)

- `clip-apps/src/core/cam/camLegacyRenamedParity.spec.ts` — parse **`conf.js`** **`renamed`** block with brace matching + **`key: "canon"`** line regex (no dynamic eval).
- `clip-apps/src/core/cam/camProcessFieldsEqual.spec.ts` — **`null`** / **`undefined`**, booleans, strings, arrays vs **`stableJsonEqual`**.
- verification
  - `npx vitest run src/stores/useCamStore.spec.ts src/core/cam` — **`331 passed`**.

### FDM **`sanitizeJobForWorker`** + **`useFdmStore`** **`legacyDebug`** clone (done in this batch)

- `clip-apps/src/api/slice.ts` — export **`sanitizeJobForWorker`** (plain **`SliceJobPayload`** for worker **`postMessage`**, drops unknown top-level keys, **`clonePlain`** on **`models`** / **`jobBounds`**).
- `clip-apps/src/api/slice.spec.ts` — unknown-key strip; **`jobBounds`** / **`transform`** deep-clone isolation.
- `clip-apps/src/stores/useFdmStore.spec.ts` — **`setSliceResult`** clones **`legacyDebug`** so worker/diagnostics snapshots cannot alias caller objects.
- verification
  - `npx vitest run src/api/slice.spec.ts src/stores/useFdmStore.spec.ts` — **`14 passed`**.

### FDM **`mockSlicer`** bounds + **`slice-backend`** + **`useFdmStore`** workspace flags (done in this batch)

- `clip-apps/src/core/slicer/mockSlicer.spec.ts` — empty **`Float32Array`** ⇒ default planar bounds + **`zSpanMm`** floor; **`withDerivedJobBounds`** identity when **`jobBounds`** already present.
- `clip-apps/src/api/slice-backend.spec.ts` — **`getSliceBackend('kiri'|'mock')`** returns stable **`KiriSliceBackend`** / **`MockSliceBackend`** singletons.
- `clip-apps/src/stores/useFdmStore.spec.ts` — **`setSliceResult(null)`** clears; **`setBackendKind`** / **`setSlicing`**.
- verification
  - `npx vitest run src/api/slice.spec.ts src/api/slice-backend.spec.ts src/stores/useFdmStore.spec.ts` — **`16 passed`**.

### CAM **`sessionDiffDetector`** + slicer **`kiriFallbackReason`** (done in this batch)

- `clip-apps/src/core/cam/sessionDiffDetector.spec.ts` — **`countChangedFields`** with multiple **`ignoreKeys`**; **`listChangedFieldKeys`** honors **`ignoreKeys`** (e.g. hide **`ops`** churn).
- `clip-apps/src/core/slicer/kiriFallbackReason.spec.ts` — non-**`Error`** **`err`** string still matches **`timeout`** substring; unknown **`Error`** ⇒ **`legacy_slice_failed`** + **`slicer_legacy_slice_failed`** warning.

### Slice **`submitSliceJob`** worker **`ok:false`** + **`kiriRuntimePolicy`** gates (done in this batch)

- `clip-apps/src/api/slice.spec.ts` — **`submitSliceJob`** **`Promise`** rejects with worker **`error`** when **`ok: false`**.
- `clip-apps/src/api/slice.spec.ts` — worker **`{ ok: false }`** without **`error`** ⇒ reject **`'slice worker error'`** (matches fallback in **`submitSliceJob`**).
- `clip-apps/src/api/slice.spec.ts` — worker **`onerror`** (e.g. thrown from **`onmessage`**) ⇒ reject with an **`Event`**.
- `clip-apps/src/core/slicer/kiriRuntimePolicy.spec.ts` — **`canRunLegacyFdmPreview`** false when **`hasSliceImpl`** or **`hasVertices`** missing; **`resolveLegacySliceFailureCode`** on plain string / **`{ message }`**; **`resolveLegacyPreviewSkipFallback`** **`null`** when no vertices (no preview to skip).
- verification
  - Same command as **Latest CAM + slice migration vitest** in the progress snapshot table — **`564 passed`**.

### FDM **`previewEstimate`** in CAM+slice migration vitest gate (done in this batch)

- `clip-apps/src/core/slicer/previewEstimate.spec.ts` — **`estimateSummaryFromPreview`** on **empty** preview layer list ⇒ **`layers: 0`**, zero **`filamentMm`**, finite **`timeMinutes`**; **`syncSliceSummaryTimeFromEstimateMeta`** is identity when **`estimateMeta`** is absent.
- verification
  - Same command as **Latest CAM + slice migration vitest** in the progress snapshot table — **`564 passed`**.

### Legacy **`runWithLegacySliceGuard`** + **`kiriFallbackDecision`** string telemetry (done in this batch)

- `clip-apps/src/core/slicer/kiriRuntimeState.spec.ts` — **`runWithLegacySliceGuard`** resets **`legacySliceRunning`** after the guarded callback **rejects** or **throws synchronously** (parity with successful completion).
- `clip-apps/src/core/slicer/kiriFallbackDecision.spec.ts` — **`resolveLegacyFailureTelemetry('legacy slice timeout')`** maps to **`legacy_slice_timeout`** / **`slicer_legacy_slice_timeout`** (plain string **`err`** path).
- verification
  - Same **Latest CAM + slice migration vitest** command as in the progress snapshot table — **`564 passed`**.

### FDM preview geometry + pipeline + **`sliceTelemetry`** + **`estimateMetaExport`** in gate (done in this batch)

- `clip-apps/src/core/slicer/previewConvert.spec.ts` — Kiri-style widget slice records → **`SliceLayerPreview`** paths (**`polyToPath`**, **`lineToPath`**, **`convertWidgetSlicesToLayers`**).
- `clip-apps/src/core/slicer/previewPipeline.spec.ts` — **`estimateLayerCount`**, **`resolvePreviewLayers`**, **`buildPlaceholderPerimeterLayers`** vs process / model bounds.
- `clip-apps/src/core/slicer/sliceTelemetry.spec.ts` — **`buildSliceFallbackTelemetryEvent`** stable shape, default **`code`** from **`reasonCode`**, **`null`** when fallback is **`null`**.
- `clip-apps/src/core/slicer/estimateMetaExport.spec.ts` — compact summary, export payload, and fingerprint for bounded job / trace JSON.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`sliceTelemetryDigest`** + timeline + config + restore + job digest in gate (done in this batch)

- `clip-apps/src/core/slicer/sliceTelemetryDigest.spec.ts` — **`buildSliceTelemetryDigest`** newest-first cap; empty / invalid timeline ⇒ empty digest.
- `clip-apps/src/core/slicer/sliceTelemetryTimeline.spec.ts` — **`pushSliceTelemetryTimelineEntry`** timestamps + max-entry cap (newest-first).
- `clip-apps/src/core/slicer/sliceTelemetryConfig.spec.ts` — digest/timeline max defaults, overrides (floor / invalid), import/export snapshot, **`resetSliceTelemetryConfig`**.
- `clip-apps/src/core/slicer/sliceTelemetryRestore.spec.ts` — **`normalizeSliceTelemetryTimelineEntries`** sort by **`ts`** desc + cap.
- `clip-apps/src/core/slicer/sliceTelemetryJobDigest.spec.ts` — **`buildSliceTelemetryDigestForJob`** honors configured digest max (with override reset in **`finally`**).
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`telemetryComment`** + **`sliceFallbackUi`** + **`fdmTraceResolve`** + **`kiriRuntimeLoader`** in gate (done in this batch)

- `clip-apps/src/core/slicer/telemetryComment.spec.ts` — G-code / diagnostics comment blocks for telemetry digest, **`sliceInputMeta`**, legacy FDM debug, newline sanitization.
- `clip-apps/src/core/slicer/sliceFallbackUi.spec.ts` — **`getSliceFallbackReasonLabel`** / **`getSliceFallbackWarningLabel`** (localized fallback copy).
- `clip-apps/src/core/slicer/fdmTraceResolve.spec.ts` — FDM trace **`sourceLabel`**, **`resolveFdmTrace`**, export header / estimate-meta context, **`TRACE_NONE_VALUE`** paths.
- `clip-apps/src/core/slicer/kiriRuntimeLoader.spec.ts` — **`loadLegacyFdmRuntime`** with injected **`importModule`**: bind on success, **`onClear`** + **`lastLegacyFdmImportError`** on failure (**`auto`** mode).
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`geometry`** + **`kiriLegacyBridge`** + **`kiriSettingsAdapter`** + **`sliceDebug*`** in gate (done in this batch)

- `clip-apps/src/core/slicer/geometry.spec.ts` — **`computeVertexBounds3D`**, **`pointsFromVertices`** on **`Float32Array`** mesh buffers.
- `clip-apps/src/core/slicer/kiriLegacyBridge.spec.ts` — **`runLegacyFdmSliceBridge`** widget shim, slices → layers, **`workerScope.kiri_worker`** restored after run.
- `clip-apps/src/core/slicer/kiriSettingsAdapter.spec.ts` — **`buildKiriSettingsPayload`** / **`toKiriLegacyProcess`** from **`FdmProcess`**.
- `clip-apps/src/core/slicer/sliceDebugApi.spec.ts` — window **`installSlicerDebugApi`**, telemetry max getters/setters, diagnostics export hooks.
- `clip-apps/src/core/slicer/sliceDebugSession.spec.ts` — **`buildSlicerDebugConfigChangeHandler`**, **`initSlicerDebugSession`** persistence + restore from storage.
- `clip-apps/src/core/slicer/sliceDebugConfigStorage.spec.ts` — **`saveSlicerDebugConfig`** / **`loadSlicerDebugConfig`** under **`SLICER_DEBUG_CONFIG_SESSION_KEY`**.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`legacyFdmCompareText`** + **`kiriEngine`** in gate (done in this batch)

- `clip-apps/src/core/slicer/legacyFdmCompareText.spec.ts` — **`formatLegacyFdmDebugText`**, **`buildFdmLegacyComparisonBundleText`** (target/current/diff/context), fingerprint helpers for CAM-aligned migration compare bundles.
- `clip-apps/src/core/slicer/kiriEngine.spec.ts` — **`sliceWithKiri`** / worker-path orchestration with mocked legacy runtime, preview pipeline, and estimate hooks (timeout / fallback / mock backend branches).
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`kiriFallbackReason`** in gate — **`src/core/slicer`** spec set complete (done in this batch)

- `clip-apps/src/core/slicer/kiriFallbackReason.spec.ts` — **`resolveKiriFallbackReason`** (`legacy_disabled`, runtime / reentry / timeout / impl-missing branches); non-**`Error`** **`err`** substring match; unknown **`Error`** ⇒ **`legacy_slice_failed`** + **`slicer_legacy_slice_failed`** (this file was the last missing piece: **all 27** `src/core/slicer/*.spec.ts` now run in the same CAM+slice migration **`vitest`** command).
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`useFdmStore.jobsClone`** in gate (done in this batch)

- `clip-apps/src/stores/useFdmStore.jobsClone.spec.ts` — **`loadJobs`** defensive clone of **`listFdmJobs`** results; **`saveJob`** passes a clone to **`saveFdmJob`**; **`refreshJob`** inserts a clone so mutating the API-returned object cannot corrupt the store.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### Core **`traceKeys`** + **`clonePlain`** + **`stableJson`** in gate (done in this batch)

- `clip-apps/src/core/traceKeys.spec.ts` — **`formatTraceLine`** **`key=value`** emission; **`TRACE_NONE_VALUE`** sentinel; **`buildTraceHeaderLines`** / **`buildTraceCommentLines`** stable ordering (FDM/CAM trace export paths).
- `clip-apps/src/core/clonePlain.spec.ts` — **`clonePlain`** deep-clone isolation for nested objects and arrays (session/slice job cloning patterns).
- `clip-apps/src/core/stableJson.spec.ts` — **`stableJsonEqual`** / **`toStableJsonText`** / **`toStableJsonValue`** deterministic JSON for diff and fixtures.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### API **`jobs`** `localStorage` persistence in gate (done in this batch)

- `clip-apps/src/api/jobs.spec.ts` — **`listFdmJobs`** / **`saveFdmJob`** / **`getFdmJob`** / **`deleteFdmJob`** round-trip on **`ws-fdm-jobs`**; invalid JSON ⇒ empty list; Carvera + GridBot keys (**`ws-carvera-jobs`**, **`ws-gridbot-jobs`**) save/list/get/delete.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`copyFeedbackMessages`** + **`useExportActions`** in gate (done in this batch)

- `clip-apps/src/core/copyFeedbackMessages.spec.ts` — stable **`COPY_FAILURE_MESSAGE`** / **`UNKNOWN_ERROR_MESSAGE`**; CAM vs FDM **`comparisonBundle`** success labels remain distinct.
- `clip-apps/src/composables/useExportActions.spec.ts` — **`copyText`** / **`copyJson`** (mocked **`navigator.clipboard`** + **`ElMessage`**); **`exportJson`** / **`exportBlob`** delegate to **`downloadText`** / **`downloadBlob`**.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### Core **`utils/download`** in gate (done in this batch)

- `clip-apps/src/core/utils/download.spec.ts` — **`downloadBlob`** object URL + anchor **`click`** + **`URL.revokeObjectURL`**; **`downloadText`** default JSON **`mime`** and custom **`mime`** passthrough.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **`traceFixtures`** in gate (done in this batch)

- `clip-apps/src/core/traceFixtures.spec.ts` — **`TRACE_FIXTURE_HEADER_LINES`** / **`TRACE_FIXTURE_COMMENT_LINES`** stay in sync with **`buildTraceHeaderLines`** / **`buildTraceCommentLines`** for the canonical **`TRACE_FIXTURE_SOURCE_*`** pair.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **Settings** + **Carvera** + **GridBot** store clone isolation in gate (done in this batch)

- `clip-apps/src/stores/useSettingsStore.spec.ts` — **`load`** stores **`clonePlain`** snapshot of **`getSettings`** payload so nested mutations cannot alias store state.
- `clip-apps/src/stores/useCarveraStore.spec.ts` — **`loadJobs`** / **`setJobs`** / **`addJob`** clone paths vs **`listCarveraJobs`** / **`saveCarveraJob`** (migration parity with FDM **`useFdmStore.jobsClone`**).
- `clip-apps/src/stores/useGridBotStore.spec.ts` — **`loadJobs`** / **`saveJob`** clone isolation for GridBot job records.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### **Raster** + **Texturizer** workspace store clone in gate (done in this batch)

- `clip-apps/src/stores/useRasterStore.spec.ts` — **`addRecentJob`** detached **`input`** copy; **`runRaster`** **`currentRequest`** isolated from post-await caller mutations.
- `clip-apps/src/stores/useTexturizerStore.spec.ts` — **`addRecentJob`** detached **`input`** copy; **`runTexturizer`** snapshots **`vertices`** so **`Float32Array`** mutations after await cannot alias **`currentRequest`**.
- verification
  - **Latest CAM + slice migration vitest** command (progress snapshot table) — **`564 passed`**.

### Grip presets + bridge jobs + migration shortcuts (done in this batch)

- `rasterGripPresets.ts` — **grip planar 基线**（resolution 0.05）与 **快速 dev** 预设；Raster 工作区一键应用。
- `bridgeGcodeJob.ts` — 统一 Carvera/GridBot Job 头（`; from workspace (bridge)`）；Raster **保存 Carvera/GridBot Job**。
- `camGripFixturePreview.ts` + CAM **「grip 金样预览」** 按钮。
- `useTexturizerStore` — worker **onProgress** → `runStage` / `runPercent`（可供 UI 绑定）。
- `npm run test:cam` — 快速 CAM 相关 vitest 子集。

### CAM grip path parity + last-run cache + Raster G-code export (done in this batch)

- `camGripGcodePathParity.spec.ts` — grip 占位 fixture 的 SHA + 预览折线终点校验。
- `camLastRunPersist.ts` — 上次 CAM 刀路预览缓存（≤200k 字符 G-code + 几何）。
- `sessionBundleExport` — ≤64KB G-code **内联**进会话包（可 SHA 校验 + 导入即预览）。
- `buildRasterPathsExportGcode` + Raster **导出 G-code** 按钮。
- `CamWorkspace` — 启动时恢复上次预览缓存。

### Carvera/GridBot/Raster/CAM progress (done in this batch)

- `useGcodeToolPositionWithMachineFallback` — 未连接或无 M114 时用 G-code 终点刀尖；连接且有非零 WCS 时用机床坐标（Carvera + GridBot）。
- `rasterWorkerProtocol` + worker/API/store — Raster 生成 **progress**（start / rasterize / toolpath / done）+ UI **`el-progress`**。
- `camEngine` **`onSliceProgress`** + Cam 工作区 slice 进度条。
- `camEngine.legacy.integration` — 盒体 **vertices** 刀路可解析性用例。
- verification
  - `npm run test:migration` gate。

### G-code preview perf + tool-end sync (done in this batch)

- `gcodePathBuildCache.ts` — 共享 **`getCachedGcodePathBuild`**（LRU 8 条），视口与刀尖同步只解析一次。
- `gcodePathPreview.ts` — **`endPosition`** 末点 WCS。
- `useGcodePathEndToolPosition` — CAM / FDM / Raster 刀尖跟随刀路终点。
- `useKiriCamLegacyStatus` — Legacy 状态 composable（轮询至就绪）。
- `CamWorkspace.vue` — 刀柄/刀尖色随 **`kiri-cam`** 结果变化；**`presetOverrides.tipColor`**。
- verification
  - `gcodePathBuildCache.spec.ts` + `gcodePathPreview` / migration gate。

### CAM session bundle + G-code legend (done in this batch)

- `sessionApplyPreview.ts` — **`buildSessionApplyAllPreview`**（一次确认应用 device/process/ops）。
- `CamWorkspace.vue` — **「一键应用全部」**；导入会话包后自动设 diff 目标并刷新差异表；Legacy 状态轮询至就绪。
- `GcodePathLegend.vue` + **`GcodePreviewPanel`** — 五工作区 G0 / G1–G3 色标图例。
- `workspaceGcodeColorToCss` — 图例与 preset 颜色共享。
- verification
  - `sessionApplyPreview.spec.ts` + `GcodePreviewPanel` / `useWorkspaceGcodePreview` specs。

### Migration velocity: boot preload + test gate + preview perf (done in this batch)

- `preloadLegacyRuntimes.ts` — 应用启动并行 **`kiriCamRuntime.init()`** + **`preloadKiriFdmRuntime()`**（尊重 **`VITE_KIRI_LEGACY_*`**）。
- `main.ts` — 挂载前预热 legacy bundle，缩短首次 CAM/FDM 真刀路等待。
- `CamWorkspace.vue` — 无配置时自动 **`loadSample()`**，开箱即可点「生成刀路」。
- `useGcodeThreeViewport.ts` — 相同 G-code 跳过重建 + **32ms** 防抖，刀具位置刷新不再重复解析大文件。
- `npm run test:migration` — **`vitest.migration.ts`** 单命令 migration gate（**threads** 并行）。
- `vitest.config.ts` — 默认单测也启用 **`pool: threads`**。
- verification
  - `npm run test:migration` → **754 passed**, 2 skipped（legacy CAM integration）。

### G-code preview: G0 vs G1/G2/G3 segment colors (done in this batch)

- `gcodePathPreview.ts` — **`segments`**（**`rapid` | `cut`**）+ **`rapidVertexCount`** / **`cutVertexCount`**；合并 **`positions`** 保持兼容。
- `gcodePathHint.ts` — hint 显示 **G0** / **G1/G2/G3** 顶点计数。
- `useGcodeThreeViewport.ts` — 按段绘制双色折线（**`rapidPathColor`** + **`pathColor`**）。
- `useWorkspaceGcodePreview.ts` — 五工作区 preset 均配置 **`rapidPathColor`**。
- tests — **`gcodePathPreview.spec.ts`**（分段）、**`useWorkspaceGcodePreview.spec.ts`**。
- verification
  - `npx vitest run src/core/gcode src/composables/useWorkspaceGcodePreview.spec.ts src/components/gcode/GcodePreviewPanel.spec.ts src/core/carvera/carveraGcodePathPreview.spec.ts` → **22 passed**.

### CAM geometry persist + Legacy status UI (done in this batch)

- `clip-apps/src/core/cam/camGeometryPersist.ts` — **`serializeCamJobGeometry`** / **`hydrateCamJobGeometry`**（**`vertices`** → **`number[]`**，上限 **100k** 三角面）；**`camGeometryMeshLabel`**。
- `clip-apps/src/core/cam/kiriCamLegacyStatus.ts` — **`formatKiriCamLegacyStatus`**（**`VITE_KIRI_LEGACY_CAM`** / slice+export 就绪 / strict 回退文案）。
- `clip-apps/src/stores/useCamStore.ts` — **`addRecentRun`** / **`loadRecentRuns`** 顶点往返；**`saveRecentRuns`** 写入前再次 **`serializeCamJobGeometry`**。
- `clip-apps/src/core/cam/sessionBundleExport.ts` — bundle 导出 **`targetRun.geometry`** 序列化。
- `CamWorkspace.vue` — **`<el-alert>`** Legacy 状态；最近运行表 **「网格」** 列；工件信息含 mesh 标签；会话包导入 **hydrate** 几何并恢复 **`camPartGeometry`** / **`camResult`**。
- tests — **`camGeometryPersist.spec.ts`**, **`kiriCamLegacyStatus.spec.ts`**, **`useCamStore.spec.ts`**（STL 顶点 localStorage 往返）。
- verification
  - `npx vitest run src/core/cam/camGeometryPersist.spec.ts src/core/cam/kiriCamLegacyStatus.spec.ts src/stores/useCamStore.spec.ts` → **19 passed**.

### Raster grip 基线 + Texturizer 加权进度（done in this batch）

- `rasterGripBaselineExpectations.ts` — grip `planar-baseline.json` / `radial-baseline.json` checksum 与栅格尺寸常量；UI hint 文案。
- `rasterGripPresets.ts` — **`GRIP_RASTER_RADIAL_BASELINE`**（resolution 0.1, rotationStep 1°）。
- `RasterWorkspace.vue` — **planar** 模式显示 grip planar 预设（修复原先仅在 radial 下可见的错位）；**radial** 增加 **grip radial 基线** 按钮与 parity hint。
- `texturizerOverallProgress.ts` — 共享 **`toTexturizerOverallProgress`** / **`texturizerStageLabel`**；`TexturizerWorkspace` 与 **`useTexturizerStore`** 统一加权进度。
- `useTexturizerStore` — **`runProgressMessage`**；完成时 **`runPercent=100`**。
- `vitest.migration.ts` — 门禁纳入 **`src/core/texturizer/**/*.spec.ts`**。
- verification：`npm run test:migration` → **902 passed**, 2 skipped。

### grip `raster-path-main` worker 桥接 + CAM grip 形 fixture（done in this batch）

- `vite.config.ts` — alias `@grip-raster-core` → `grip/raster-path-main/src/core`；`server.fs.allow`。
- `workers/raster-grip.worker.ts` — 包装 grip `RasterPath`（planar/radial）；`rasterGripPathAdapter.ts` 转 `RasterPath[]`。
- `api/rasterGrip.ts` + `rasterGripBridgePolicy.ts` — `VITE_RASTER_GRIP_BRIDGE=1` 时 `runRaster` 走 grip worker。
- `camGripFixtureSynthetic.ts` — 确定性 grip 形 `cam_export` 流；更新 `grip-cam-export-sample.gcode.txt` + `camGripFixtureMeta.ts` SHA。
- verification：`npm run test:migration` → **908 passed**, 2 skipped。

### Raster grip parity 自检 + 会话桥接开关（done in this batch）

- `rasterGripPathChecksum.ts` / `rasterGripBaselineParity.ts` — grip 同款 checksum；基线 mesh 75586/960 顶点检测。
- `rasterGripBridgePolicy` — `sessionStorage` **`ws-raster-grip-bridge`** 覆盖 env（无需重编译）。
- `RasterWorkspace` — **grip 桥接** 开关；**grip 基线 checksum** / **clip↔grip 对比** 按钮；结果行 **grip-bridge** 标记。
- `camGripFixtureDevHint.ts` — CAM 页 **复制 fixture SHA**（迁移捕获提示）。
- `package.json` — **`npm run test:raster`** 快速栅格子集。

### 迁移提速：dev 默认 grip 桥接 + 自动 parity + CAM 导出阶段（done in this batch）

- `.env.development` — **`VITE_RASTER_GRIP_BRIDGE=1`**（planar/radial 默认走 grip worker）。
- `rasterGripBaselineAuto.ts` — 基线 STL 顶点匹配时生成后自动写入 compare 报告。
- `camEngine.ts` — **`cam_export`** 阶段进度（88% / 100%）。
- `camGcodeClipboard.ts` — CAM **复制 G-code**（大文件截断保护）。
- `camEngine.legacy.capture.spec.ts` — `CAPTURE_CAM_FIXTURE=1` 时写入真实 fixture（`npm run capture:cam-fixture`）。
- `useRasterStore` — 完成后保留 **runPercent=100**；Texturizer **运行成功即记入最近任务**。

### 迁移进度统计 + GridBot 导入 + 栅格上次参数（done in this batch）

- `migrationProgressScoreboard.ts` — 可计算 scoreboard（**62.95%** strict / **71.6%** product path）；`npm run migration:progress`。
- `rasterLastRunPersist.ts` — 上次栅格 **config/summary** 恢复（无 paths 体积）。
- `GridBotWorkspace` — **导入 G-code**（与 Carvera 对齐）。
- verification：`npm run test:migration` → **923 passed**, 3 skipped。

## Next migration plan

1. **Raster (priority P1)**
   - Enable `VITE_RASTER_GRIP_BRIDGE=1` in dev; parity checksum vs grip baseline STL pair.
   - Replace placeholder pixel-scan worker with mode-aware API (`planar/radial/tracing`).
   - Add STL terrain/tool import and basic progress UI.

2. **Texturizer (priority P1)**
   - Migrate advanced options from `stlTexturizer-main` (projection modes, seam controls, face masking).
   - Introduce subdivision/decimation stages and STL export progress stages.

3. **Carvera/GridBot view (priority P2)**
   - Migrate preview/workspace rendering from source projects.
   - Keep current bridge/store contracts and add parser compatibility tests.

4. **CAM runtime (priority P2)**
   - Harden legacy **`runCamJob`** parity (grip fixtures, per-op stats, export size limits).
   - Optional viewport styling (G0 vs G1 colors, spindle preset).
