import fs from 'node:fs'
const p = 'f:/CAM/chip/shape_cam/MIGRATION_STATUS.md'
let s = fs.readFileSync(p, 'utf8')
if (!s.includes('rasterPathsPreviewGcode.spec.ts')) {
  s = s.replace(
    'src/core/fdm/fdmSlicePreviewGcode.spec.ts src/composables/useExportActions.spec.ts',
    'src/core/fdm/fdmSlicePreviewGcode.spec.ts src/core/raster/rasterPathsPreviewGcode.spec.ts src/composables/useExportActions.spec.ts',
  )
}
s = s.replace(/kiriFallbackReason\.spec\.ts`\s*→\s*\*\*700 passed\*\*/g, 'kiriFallbackReason.spec.ts` → **702 passed**')
s = s.replace(/当前门禁快照见首节 \*\*700 passed\*\*（\*\*92\*\* test files）/g, '当前门禁快照见首节 **702 passed**（**93** test files）')
s = s.replace(/\*\*`700 passed`\*\*（\*\*92\*\* test files）/g, '**`702 passed`**（**93** test files）')
// raster row completion 60 -> 62
s = s.replace(
  '| Raster (`raster-path-main`) | 20% | 60% | 12.00% |',
  '| Raster (`raster-path-main`) | 20% | 62% | 12.40% |',
)
s = s.replace(
  '| **Total** | **100%** |  | **57.58%** |',
  '| **Total** | **100%** |  | **57.98%** |',
)
s = s.replace('(table total **57.58%**)', '(table total **57.98%**)')
s = s.replace('**~57.6%**', '**~58.0%**')
s = s.replace('**~65.3%**', '**~65.5%**')
s = s.replace('(20+12+13.29+6.24+4.00)/85` ≈ **65.3%**', '(20+12.4+13.29+6.24+4.00)/85` ≈ **65.5%**')
s = s.replace('| Table total (strict full-scope) | **57.58%** |', '| Table total (strict full-scope) | **57.98%** |')
s = s.replace('| Primary product path (`clip-apps` + `device-bridge` rows only) | **~65.3%** |', '| Primary product path (`clip-apps` + `device-bridge` rows only) | **~65.5%** |')
s = s.replace(
  'worker/busy contract | Full WebGPU parity',
  'worker/busy contract; **`RasterWorkspace`** **`useGcodeThreeViewport`** + **`buildRasterPathsPreviewSyntheticGcode`** | Full WebGPU parity',
)
s = s.replace(
  '- **Raster**: early migrated; current worker is simplified placeholder, not the full `raster-path-main` engine.',
  '- **Raster**: partial migrated; CPU/WebGPU paths and tracing budgets in place; **`RasterWorkspace`** adds **3D G0/G1 polyline** via **`buildRasterPathsPreviewSyntheticGcode`** + shared **`useGcodeThreeViewport`** (2D canvas retained); full `raster-path-main` engine parity still pending.',
)
fs.writeFileSync(p, s)
console.log('ok')
