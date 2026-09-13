# Kiri-Moto → shapexcam 架构对比与迁移路线

> 与 [BUSINESS-ARCHITECTURE.md](./BUSINESS-ARCHITECTURE.md) 互补：本文聚焦 **源产品 vs 重写产品** 的能力差距与下一批迁移优先级。

## 1. 产品定位对照

| | **Kiri-Moto（源）** | **shapexcam（目标）** |
|--|---------------------|------------------------|
| 形态 | 多仓库生态 | 单一 Vue 控制台 `clip-apps` + `device-bridge` |
| 目标 | 全能制造套件 | **桌面激光切割 + CNC + FDM + SLA** 主产品线 |

## 2. 域能力差距（摘要）

| 域 | Kiri | shapexcam | 状态 |
|----|------|-----------|------|
| **CNC / CAM** | `mode/cam` | Legacy CAM 工作区已迁 | 主线 / 深化 soak |
| **FDM** | `mode/fdm` | Legacy FDM 工作区已迁 | 主线 / 深化 soak |
| **Laser（独立）** | `mode/laser` | UI + **Worker runtime**（`laser.worker` / `submitLaserJob`）+ TS engine + import shim + 金样 | 剩余：Kiri 3D widget LASER.slice 协议 / 真机 HW-08 |
| **SLA** | `mode/sla` | UI + **Worker runtime**（`sla.worker` / `submitSlaJob`）+ `kiri-sla.wasm` 已同步 + Photon/CTB/GOO 金样 | 剩余：emcc 完整 WASM prepare 接线 / HW-09 ChiTu/Elegoo 校验 |
| **FDM paint** | widget.anno.paint | `fdmSupportPaint` + workspace wiring；**fast gate** in product gates（无 90s legacy slice） | 深化：legacy paint integration soak |
| CAM 内 laser op | cam `laser on/off` | 已有 UI | 保留（铣+激光附件） |
| Drag / WJET / WEDM | laser 变体 | **仍不在范围** | 除非另立需求 |

## 3. 产品决策（修订 2026-09-09）

| 选项 | 决策 | 说明 |
|------|------|------|
| 桌面激光切割 | **P0 shell + P1 TS MVP** | 独立 `/laser` ↔ Kiri `mode/laser`（TS 桥，非完整 vendor worker） |
| CNC | **已有** | `/cam` |
| FDM | **已有** | `/fdm` |
| SLA | **P0 shell + P1/P2 TS MVP** | 独立 `/sla` ↔ Kiri `mode/sla`；Photon/CTB/GOO + 金样 |
| Drag / water / wire | **不迁** | 非当前产品承诺 |

代码常量：`clip-apps/src/core/product/shapexModes.ts`。

## 4. Laser / SLA 落地阶段

1. **P0 已完成**：路由 + mode 开关 + workspace shell（arrange/slice/preview/export）
2. **P1 TS MVP 已完成**：Laser SVG→G-code（`laser-ts-mvp`）；SLA mesh→层曝光 Photon/CTB（`sla-ts-mvp`）
3. **P2 文件金样 soak 已完成**：SVG/DXF/Snapmaker + cube Photon/CTB/GOO SHA；`LASER_*_GOLDEN_SHA256` / `SLA_CUBE_*_SHA256`；`MigrationComplete` + `soak:laser` / `soak:sla`
4. **P2+ AES CTB / Elegoo GOO / worker scaffold（2026-09-09）**：`slaExportCtbAes` + `buildCtbEncryptedFile`（magic `0x12fd0107`）；GOO V3.0 `HEADER_SIZE=195477` + RLE；`laserWorkerBridge` / `slaWorkerBridge`（ts-mvp / legacy-pending，不因缺 WASM 失败）；`soak:hw-readiness`（HW-06..09 env 报告）
5. **仍开放（现场 / 工具链）**：HW-04..09 **人工签字**（`npm run soak:hw-signoff` 只出清单，不代签）；CTB AES / GOO 需 ChiTuBox/Elegoo 对照（`npm run soak:sla:official` + 可选 `SLA_OFFICIAL_*_PATH`）；Kiri LASER **3D widget.slice** 明确不在 SVG/DXF 产品路径（`laserWidgetSliceStatus`）；完整 `sla_prepare` WASM 需本机 **emcc**（`npm run build:kiri-sla-wasm`，无 emcc 时回退 sync 现有 wasm）
6. **Laser/SLA Worker runtime（2026-09）**：`laser.worker` / `sla.worker` + API；`LASER_BACKEND=laser-worker` / `SLA_BACKEND=sla-worker`；`sync:kiri-sla-wasm` / `build:kiri-sla-wasm`；`soak:fdm:paint`；`soak:laser:live` / `soak:sla:live`（env 门控）；`hwFieldSignOff` 覆盖 HW-04..09
7. **Laser SVG 导出 + import shim**：`exportLaserPolylinesToSvg`；`LASER-SVG-EXPORT` 金样；`laserLegacyBootstrap` shim 可加载 init-work

## 5. 明确不在当前产品范围

- Drag / WJET / WEDM（除非另立）
- Mesh:Tool / Void:Form；云端 Job；wattzup / basic-ftp

## 6. 真机 / 文件 soak

见 [clip-apps/SOAK.md](../clip-apps/SOAK.md)。Laser/SLA TS MVP 与文件级金样已钉；HW-06..09 用 `npm run soak:hw-readiness` 查 env；完整 vendor worker 仍为开放项。

## 7. SLA CTB / GOO / FDM paint (2026-09-09)

- **CTB v3**：magic `0x12fd0086` + RLE + per-layer XOR（默认 `exportFormat: 'ctb'`）。
- **CTB encrypted**：magic `0x12fd0107`；AES-CBC settings + XOR layers（`ctb-encrypted` 或 `encryptHeader: true`）。
- **GOO**：Elegoo V3.0 machine-readable（`GOO_FILE_MAGIC` after `V3.0`）；金样 `SLA_CUBE_GOO_SHA256` 已按新布局重钉。
- **Worker runtime**：`laserWorkerBridge` / `slaWorkerBridge` — `mode: worker-runtime` 当 worker+api 文件存在；Laser 另需 import shim；SLA 另需 `public/wasm/kiri-sla.wasm`（`sync:kiri-sla-wasm`）。
- **FDM paint**：`evaluateFdmSupportPaintMigrationComplete` 快闸已入 `migrationProductGates.allOk`。
- Legacy scaffold：`x_ctb.js` / `x_ctb_crypto.js` / `x_goo.js` vendor 于 `legacy/work/`。
