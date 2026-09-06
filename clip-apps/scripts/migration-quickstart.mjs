#!/usr/bin/env node
console.log(`Migration verify checklist (shape_cam / clip-apps):

  Core
    npm run sync:verify          # grip fixtures + wasm sync smoke
    npm run test:migration       # 1100+ unit specs (excludes *.live.spec.ts)
    npm run migration:gates      # seven grip domains + FDM + device-bridge contracts
    npm run migration:report     # weighted scoreboard (expect 100% / 100%)

  Offline soak
    npm run soak:offline         # texturizer + all *MigrationComplete gates
    npm run migration:ordered:offline   # phases 1–4 offline checks
    npm run migration:ordered-soak      # full ordered pipeline (see SOAK.md env flags)

  Live / production (optional)
    npm run soak:carvera
    npm run soak:gridbot
    npm run soak:texturizer:live
    npm run soak:cam:live        # VITE_KIRI_LEGACY_CAM=1 recommended

  E2E / capture
    npm run test:e2e:migration
    E2E_RASTER_BASELINE=1 npm run test:e2e:raster-baseline
    CAPTURE_CAM_FIXTURE=1 npm run capture:cam-fixture

  CI one-liner
    npm run migration:ci
`)
