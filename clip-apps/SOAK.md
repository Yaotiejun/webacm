# Live soak harnesses (shape_cam / clip-apps)

Soak tests are **not** in `npm run test:migration` (`*.live.spec.ts`). They validate production hardware or real STL meshes when env vars and services are up.

**Offline bundle (CI-friendly):** `npm run soak:offline` — texturizer soak + all `*MigrationComplete` gates (grip scoreboard domains + FDM shell).

**One-shot gate summary:** `npm run migration:gates`

## Ordered migration (recommended sequence)

```powershell
# Offline phases 1–6 (always)
npm run migration:ordered:offline

# Full pipeline (offline + optional live when env set)
$env:CAM_LIVE_MIGRATION='1'          # Phase 1 → npm run soak:cam:live
$env:DEVICE_PRODUCTION_SOAK='1'      # Phase 2 → soak:carvera / soak:gridbot
$env:CARVERA_SOAK_WS='ws://localhost:9999/carvera'
$env:GRIDBOT_SOAK_WS='ws://localhost:9999/gridbot'
$env:E2E_RASTER_BASELINE='1'         # Phase 4 → test:e2e:raster-baseline
npm run sync:grip-fixtures
npm run migration:ordered-soak
```

| Phase | Env | Command |
|-------|-----|---------|
| 1 CAM live export | `CAM_LIVE_MIGRATION=1`, `VITE_KIRI_LEGACY_CAM=1` | `npm run soak:cam:live` |
| 2 Device soak | `DEVICE_PRODUCTION_SOAK=1`, `*_SOAK_WS` | `npm run soak:devices:live` |
| 3 FDM legacy | `FDM_LIVE_MIGRATION=1` | `npm run soak:fdm:live` |
| 2b Bridge mock WS | `DEVICE_BRIDGE_MOCK_SOAK=1` | `npm run soak:device-bridge:mock` |
| 4 Raster E2E | `E2E_RASTER_BASELINE=1` | `npm run test:e2e:raster-baseline` |
| 5 Laser soak | (offline) | `npm run soak:laser` |
| 6 SLA soak | (offline) | `npm run soak:sla` |
| HW readiness | (offline) | `npm run soak:hw-readiness` |

## Texturizer — live mesh

**Offline gate (always):** `npm run soak:texturizer`

**Live STL:** `npm run soak:texturizer:live`

Default mesh after fixture sync: `public/grip-raster-fixtures/tool.stl` (~960 triangles).

```powershell
cd f:\CAM\chip\shape_cam\clip-apps
npm run sync:grip-fixtures

# Optional production mesh
$env:TEXTURIZER_SOAK_STL = 'D:\parts\widget.stl'
$env:TEXTURIZER_SOAK_MAX_TRIS = '200000'
$env:TEXTURIZER_SOAK_AMPLITUDE = '1'
$env:TEXTURIZER_SOAK_SUBDIV = '0'
$env:TEXTURIZER_SOAK_TIMEOUT_MS = '300000'

npm run soak:texturizer:live
```

Checks: displacement Z range, output triangle count, binary STL size and header count.

## Carvera — production controller

**Command:** `npm run soak:carvera`

Requires **device-bridge** WebSocket and a reachable Carvera (TCP backend or mock).

```powershell
# Terminal 1 — bridge to machine
cd f:\CAM\chip\shape_cam\device-bridge
$env:CARVERA_BACKEND = 'tcp'
$env:CARVERA_TCP = '192.168.1.100:3001'   # your controller
npm run dev

# Terminal 2 — soak
cd f:\CAM\chip\shape_cam\clip-apps
$env:CARVERA_SOAK_WS = 'ws://localhost:9999/carvera'
$env:CARVERA_SOAK_POLLS = '20'
$env:CARVERA_SOAK_INTERVAL_MS = '500'
$env:CARVERA_SOAK_MIN_POLLS = '8'
npm run soak:carvera
```

Validates on real `?` polls: **L/W/A/H**, **MPos/WPos**, **Buf** (and parseable status lines).

Mock-only smoke (no machine):

```powershell
cd f:\CAM\chip\shape_cam\device-bridge
npm run dev
cd ..\clip-apps
$env:CARVERA_SOAK_WS = 'ws://localhost:9999/carvera'
npm run soak:carvera
```

Unit test without hardware: `npx vitest run src/core/devices/carveraProductionSoak.spec.ts`

## GridBot — production printer

**Command:** `npm run soak:gridbot`

```powershell
cd f:\CAM\chip\shape_cam\device-bridge
$env:GRIDBOT_BACKEND = 'tcp'
$env:GRIDBOT_TCP = '192.168.1.50:23'
npm run dev

cd f:\CAM\chip\shape_cam\clip-apps
$env:GRIDBOT_SOAK_WS = 'ws://localhost:9999/gridbot'
$env:GRIDBOT_SOAK_POLLS = '12'
npm run soak:gridbot
```

Validates **M105** temps, **M114** position, and **ADVANCED_OK** `B`/`P` buffer slots.

## 真机签字清单（P2 — 需车间硬件）

无硬件时：工程侧以离线门禁 + mock bridge + 双挤出 SHA 为准；下列项现场签字。

| ID | 域 | 命令 / 动作 | 通过标准 | 签字 |
|----|-----|-------------|---------|------|
| HW-01 | Bridge mock | `npm run soak:device-bridge:mock` | carveraOk + gridbotOk | 可 CI |
| HW-02 | 双挤出 | `FDM_DUAL_EXTRUDER_SOAK=1 npm run soak:fdm:dual-extruder` | 与 `FDM_DUAL_EXTRUDER_GOLDEN_SHA256` 一致 | 可 CI |
| HW-03 | CAM live | `CAM_LIVE_MIGRATION=1 npm run soak:cam:live` | fingerprintMatch | 可选 legacy |
| HW-04 | Carvera 真机 | `CARVERA_SOAK_WS=ws://…` + `soak:carvera` | L/W/A/H、Buf 稳定；可选 M495 | 现场 |
| HW-05 | GridBot 真机 | `GRIDBOT_SOAK_WS=ws://…` + `soak:gridbot` | M105/M114/Advanced OK | 现场 |
| HW-06 | FDM 真机打印 | `FDM_LIVE_MIGRATION=1` → `npm run soak:fdm:live`；现场 `/fdm` 下发 | 首层粘床、双色换刀无撞 | 现场 |
| HW-07 | CAM 真机铣削 | `CAM_LIVE_MIGRATION=1` → `npm run soak:cam:live`；现场 Animate + 下发 | 路径与毛坯一致、无撞刀 | 现场 |

## Laser / SLA 文件 soak（已钉金样）

Offline unit smoke: `npx vitest run src/core/laser src/core/sla --config vitest.migration.ts`.

Golden soak commands:

```powershell
npm run soak:laser
npm run soak:sla
```

文件级金样 SHA：

| ID | 域 | Fixture / 入口 | 通过标准 | 状态 |
|----|-----|----------------|---------|------|
| LASER-SVG | Laser | sample SVG → `runLaserFromSvg` structural G-code SHA256 | 对照 `LASER_SVG_GOLDEN_SHA256` 常量 | **已钉** |
| LASER-SVG-EXPORT | Laser | same fixture → `exportLaserPolylinesToSvg` structural SVG SHA256 | 对照 `LASER_SVG_EXPORT_GOLDEN_SHA256` 常量 | **已钉** |
| LASER-DXF | Laser | minimal DXF square → `runLaserFromDxf` structural G-code SHA256 | 对照 `LASER_DXF_GOLDEN_SHA256` 常量 | **已钉** |
| FDM-PAINT | FDM | cube + manual paint → `runLegacyFdmSliceBridge` support slices | `npm run soak:fdm:paint`（90s；不在 soak:offline） | **已注册** |
| SLA-CUBE | SLA | 10mm cube → Photon/CTB/GOO blob SHA256 | 对照 `SLA_CUBE_PHOTON_SHA256` / `SLA_CUBE_CTB_SHA256` / `SLA_CUBE_GOO_SHA256` 常量 | **已钉** |

真机 / 现场签字 HW checklist：

| ID | 域 | 命令 / 动作 | 通过标准 | 签字 |
|----|-----|-------------|---------|------|
| HW-06 | FDM 真机打印 | `FDM_LIVE_MIGRATION=1 npm run soak:fdm:live` 后 `/fdm` 下发 | 首层粘床、双色换刀无撞 | 现场 |
| HW-07 | CAM 真机铣削 | `CAM_LIVE_MIGRATION=1 npm run soak:cam:live` 后 `/cam` 下发 | fingerprintMatch + 路径与毛坯一致 | 现场 |
| HW-08 | Laser | `LASER_HW_SOAK=1`（预留）+ `/laser` 导入 SVG → slice → 下发切割 | 切割路径与预览一致 / 无过烧 | 现场 / 待签字 |
| HW-09 | SLA | `SLA_HW_SOAK=1`（预留）+ `/sla` 导入 STL → Photon/CTB/GOO 打印 | 层曝光 / 树脂件尺寸与外观可接受 | 现场 / 待签字 |

**HW readiness harness（CI 永不因 env 未设而失败）：**

```powershell
npm run soak:hw-readiness
```

Reports whether `CARVERA_SOAK_WS` / `GRIDBOT_SOAK_WS` / `FDM_LIVE_MIGRATION` / `CAM_LIVE_MIGRATION` / `LASER_HW_SOAK` / `SLA_HW_SOAK` are set (`evaluateHwSoakReadiness()` → always `ok: true`). Covers **HW-04..09**.

Field sign-off form (never auto-signs):

```powershell
npm run soak:hw-signoff
```

Laser/SLA product path: `submitLaserJob` / `submitSlaJob` (Worker in browser). Offline: `npm run soak:laser` / `soak:sla`.  
Live stubs (skip unless env set): `npm run soak:laser:live` / `soak:sla:live`.  
CTB AES / GOO offline + optional official paths: `npm run soak:sla:official` (`SLA_OFFICIAL_CTB_PATH` / `SLA_OFFICIAL_GOO_PATH`).  
SLA wasm: `npm run sync:kiri-sla-wasm` or `npm run build:kiri-sla-wasm` (needs emcc).  
FDM paint deep soak: `npm run soak:fdm:paint`.  
LASER 3D widget.slice: **out of product scope** (see `getLaserWidgetSliceStatus()`).

## Offline soak bundle (CI-friendly)

```powershell
npm run soak:offline
```

Runs texturizer offline soak + Carvera/GridBot/texturizer production evaluator unit tests (no hardware).
