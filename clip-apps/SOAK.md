# Live soak harnesses (shape_cam / clip-apps)

Soak tests are **not** in `npm run test:migration` (`*.live.spec.ts`). They validate production hardware or real STL meshes when env vars and services are up.

**Offline bundle (CI-friendly):** `npm run soak:offline` — texturizer soak + all `*MigrationComplete` gates (grip scoreboard domains + FDM shell).

**One-shot gate summary:** `npm run migration:gates`

## Ordered migration (recommended sequence)

```powershell
# Offline phases 1–4 (always)
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

## Offline soak bundle (CI-friendly)

```powershell
npm run soak:offline
```

Runs texturizer offline soak + Carvera/GridBot/texturizer production evaluator unit tests (no hardware).
