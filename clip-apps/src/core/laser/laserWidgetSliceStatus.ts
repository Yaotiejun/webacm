/**
 * Status: product path is TS port of Kiri LASER (SVG/DXF). 3D widget.slice still optional.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type LaserWidgetSliceStatus = {
  productPath: 'svg-dxf-kiri-ts'
  widgetSliceInScope: false
  legacyDriverPresent: boolean
  hasSliceFn: boolean
  hasPrepareFn: boolean
  hasExportFn: boolean
  missingForWidgetRuntime: string[]
  note: string
}

export function getLaserWidgetSliceStatus(): LaserWidgetSliceStatus {
  const init = resolve(process.cwd(), 'src/core/laser/legacy/kiri/mode/laser/init-work.js')
  const legacyDriverPresent = existsSync(init)
  return {
    productPath: 'svg-dxf-kiri-ts',
    widgetSliceInScope: false,
    legacyDriverPresent,
    hasSliceFn: legacyDriverPresent,
    hasPrepareFn: true,
    hasExportFn: true,
    missingForWidgetRuntime: [
      'widget.getPoints / getBoundingBox adapter',
      'geo/slicer polygon pipeline over 3D mesh',
    ],
    note: 'Desktop laser product is SVG/DXF via kiri-ts (TypeScript port of Kiri prepare/export). LASER.slice 3D widget protocol remains out of scope.',
  }
}